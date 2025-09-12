import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = process.env.FIREBASE_FUNCTIONS_BASE_URL?.replace(/\/$/, '');

function safeStr(x: any): string {
  if (typeof x !== 'string') return '';
  const s = x.trim();
  return s;
}

function storyToHtml(d: any): string {
  const title = safeStr(d?.title) || 'Story';
  const cover = safeStr(d?.coverImageUrl) || '';
  const scenes: any[] = Array.isArray(d?.scenes) ? d.scenes : [];

  const pagesHtml = scenes
    .sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0))
    .map((s: any, i: number) => {
      const img = safeStr(s?.imageUrl);
      const txt = safeStr(s?.text).replace(/\n/g, '<br/>');
      return `
        <section style="page-break-after: always; margin-bottom: 24px;">
          ${img ? `<img src="${img}" alt="Page ${i + 1}" style="max-width: 100%; height: auto;"/>` : ''}
          <div style="margin-top: 12px; font-family: system-ui, sans-serif; line-height: 1.5;">${txt}</div>
        </section>
      `;
    })
    .join('\n');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charSet="utf-8" />
    <title>${title}</title>
    <style>
      @page { margin: 16mm; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      h1 { margin: 0 0 16px 0; }
      .cover { page-break-after: always; text-align: center; }
      .cover img { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>
    <div class="cover">
      <h1>${title}</h1>
      ${cover ? `<img src="${cover}" alt="Cover" />` : ''}
    </div>
    ${pagesHtml}
  </body>
  </html>`;
}

async function callPdfFn(html: string, pdfOptions?: Record<string, unknown>) {
  if (!BASE) throw new Error('FIREBASE_FUNCTIONS_BASE_URL is not set');
  const url = `${BASE}/downloadStoryPdf`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, pdfOptions }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Function error: ${res.status} ${txt}`);
  }
  const buf = await res.arrayBuffer();
  return buf;
}

export async function GET(req: NextRequest) {
  try {
    const storyId = req.nextUrl.searchParams.get('storyId');
    if (!storyId) {
      return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    }

    const snap = await adminDb.collection('stories').doc(storyId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const html = storyToHtml(snap.data() || {});
    const buf = await callPdfFn(html);

    return new NextResponse(Buffer.from(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="story-${storyId}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('GET download-story-pdf failed:', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const html = safeStr(body?.html);
    const pdfOptions = body?.pdfOptions;

    if (!html) {
      return NextResponse.json({ error: 'Missing html' }, { status: 400 });
    }

    const buf = await callPdfFn(html, pdfOptions);

    return new NextResponse(Buffer.from(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="story.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('POST download-story-pdf failed:', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
