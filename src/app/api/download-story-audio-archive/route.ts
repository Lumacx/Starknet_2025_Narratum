// src/app/api/download-story-audio-archive/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getAdminDb } from '@/lib/firebaseAdmin'; // ✅ lazy admin getter

// --- Ensure this route never gets prerendered or cached at build time ---
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Optional (Next API route limit hint)
export const maxDuration = 60;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
}

function extFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop() || '';
    const raw = (last.split('.').pop() || '').toLowerCase();
    return raw && raw.length <= 5 ? raw : 'mp3';
  } catch {
    return 'mp3';
  }
}

export async function GET(req: NextRequest) {
  const storyId = req.nextUrl.searchParams.get('storyId');
  if (!storyId) {
    return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
  }

  try {
    // ✅ Admin initialized lazily at request time (no build-time PEM parsing)
    const db = getAdminDb();

    const snap = await db.collection('stories').doc(storyId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const storyData = snap.data() as Record<string, any> | undefined;
    if (!storyData) {
      return NextResponse.json({ error: 'Story data is empty' }, { status: 404 });
    }

    const zip = new JSZip();

    // --- Add Story HTML ---
    const title = String(storyData.title ?? 'Story');
    const imageUrl = typeof storyData.imageUrl === 'string' ? storyData.imageUrl : '';
    const content =
      storyData.content != null ? String(storyData.content).replace(/\n/g, '<br/>') : 'No content available.';

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; line-height:1.5; padding:16px; max-width:900px; margin:auto;">
  <h1>${title}</h1>
  ${imageUrl ? `<img src="${imageUrl}" alt="Cover Image" style="max-width:100%; height:auto; display:block; margin:12px 0;" />` : ''}
  <div>${content}</div>
</body>
</html>`;

    zip.file('story.html', new TextEncoder().encode(htmlContent));

    // --- Add Audio Files (best-effort) ---
    const urls: string[] = Array.isArray(storyData.audioUrls)
      ? storyData.audioUrls.filter((u: any) => typeof u === 'string' && /^https?:\/\//i.test(u))
      : [];

    for (let i = 0; i < urls.length; i++) {
      const audioUrl = urls[i];
      try {
        const r = await fetch(audioUrl, { cache: 'no-store' });
        if (!r.ok) {
          console.warn(`Skipping audio: ${audioUrl} (status ${r.status})`);
          continue;
        }
        const buf = await r.arrayBuffer();
        const ext = extFromUrl(audioUrl);
        zip.file(`audio_${i + 1}.${ext}`, buf);
      } catch (err) {
        console.error(`Error fetching audio ${audioUrl}:`, err);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const base = slugify(title || 'story');

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${base}-with-audio.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating audio archive:', error);
    return NextResponse.json({ error: 'Failed to generate audio archive' }, { status: 500 });
  }
}
