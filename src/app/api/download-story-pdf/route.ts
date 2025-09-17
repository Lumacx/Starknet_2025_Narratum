// src/app/api/download-story-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ---------- Derive Functions base URL (emulator or prod) ----------
function deriveFunctionsBase(): string | undefined {
  const explicit = process.env.FIREBASE_FUNCTIONS_BASE_URL?.replace(/\/$/, '');
  if (explicit) return explicit;

  const region = process.env.FIREBASE_FUNCTIONS_REGION || 'us-central1';
  const project =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const usingEmu =
    process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' ||
    process.env.FIREBASE_EMULATORS === 'true' ||
    !!process.env.FIREBASE_EMULATOR_HOST;

  if (!project) return undefined;

  if (usingEmu) {
    // Emulator default: http://127.0.0.1:5001/{project}/{region}
    return `http://127.0.0.1:5001/${project}/${region}`;
  }

  // Prod default: https://{region}-{project}.cloudfunctions.net
  return `https://${region}-${project}.cloudfunctions.net`;
}

const FUNCTIONS_BASE = deriveFunctionsBase();
const PDF_FN = process.env.FIREBASE_PDF_FN || 'downloadStoryPdf';

// ---------- Helpers ----------
function safeStr(x: unknown): string {
  if (x == null) return '';
  const s = typeof x === 'string' ? x : String(x);
  return s.trim();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
}

function storyToHtml(d: any): string {
  const title = safeStr(d?.title) || 'Story';
  const cover =
    safeStr(d?.coverImageUrl) ||
    safeStr(d?.imageUrl) ||
    '';
  const scenes: any[] = Array.isArray(d?.scenes) ? d.scenes : [];

  const pagesHtml = scenes
    .slice()
    .sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0))
    .map((s: any, i: number) => {
      const img =
        safeStr(s?.imageUrl) ||
        safeStr(s?.coverImageUrl) ||
        safeStr(s?.img) ||
        '';
      const txt = safeStr(s?.text || s?.content || s?.storyText).replace(/\n/g, '<br/>');
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
  if (!FUNCTIONS_BASE) {
    throw new Error(
      'FIREBASE_FUNCTIONS_BASE_URL is not set and a fallback could not be derived (missing FIREBASE_PROJECT_ID).'
    );
  }
  const url = `${FUNCTIONS_BASE}/${PDF_FN}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // If your function checks auth, add Authorization: Bearer <idToken> here.
    body: JSON.stringify({ html, pdfOptions }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Function error: ${res.status} ${txt}`);
  }
  return await res.arrayBuffer();
}

// ---------- Handlers ----------
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

    const data = snap.data() || {};
    const html = storyToHtml(data);
    const buf = await callPdfFn(html);

    const baseName = slugify(safeStr(data.title)) || `story-${storyId}`;

    return new NextResponse(Buffer.from(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'Cache-Control': 'no-store',
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
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('POST download-story-pdf failed:', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
