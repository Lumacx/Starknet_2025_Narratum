// src/app/api/download-story-audio-archive/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import JSZip from 'jszip';

// --- Ensure this route never gets prerendered or cached at build time ---
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export async function GET(req: NextRequest) {
  const storyId = req.nextUrl.searchParams.get('storyId');
  if (!storyId) {
    return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
  }

  try {
    const storyDoc = await adminDb.collection('stories').doc(storyId).get();
    if (!storyDoc.exists) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const storyData = storyDoc.data();
    if (!storyData) {
      return NextResponse.json({ error: 'Story data is empty' }, { status: 404 });
    }

    const zip = new JSZip();

    // --- Add Story HTML ---
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${storyData.title || 'Story'}</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>${storyData.title || 'Untitled Story'}</h1>
        ${
          storyData.imageUrl
            ? `<img src="${storyData.imageUrl}" alt="Cover Image" style="max-width:100%;"/>`
            : ''
        }
        <div>
          ${
            storyData.content
              ? String(storyData.content).replace(/\n/g, '<br/>')
              : 'No content available.'
          }
        </div>
      </body>
      </html>
    `;
    zip.file('story.html', new TextEncoder().encode(htmlContent));

    // --- Add Audio Files ---
    if (Array.isArray(storyData.audioUrls)) {
      for (let i = 0; i < storyData.audioUrls.length; i++) {
        const audioUrl = storyData.audioUrls[i];
        try {
          const r = await fetch(audioUrl);
          if (!r.ok) {
            console.warn(`Skipping audio: ${audioUrl} (status ${r.status})`);
            continue;
          }
          const buf = await r.arrayBuffer();
          const ext = audioUrl.split('.').pop()?.split('?')[0] || 'mp3';
          zip.file(`audio_${i + 1}.${ext}`, buf);
        } catch (err) {
          console.error(`Error fetching audio ${audioUrl}:`, err);
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const base = slugify(String(storyData.title || 'story'));

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${base}-with-audio.zip"`,
      },
    });
  } catch (error) {
    console.error('Error generating audio archive:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio archive' },
      { status: 500 }
    );
  }
}
