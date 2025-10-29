// src/app/api/download-story-pdf/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin'; // lazy Admin getter

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

/* ────────────────────────────────────────────────────────────
   Functions base URL
   ──────────────────────────────────────────────────────────── */
function trimTrailingSlash(s: string) {
  return s.replace(/\/+$/, '');
}

function deriveFunctionsBase(): string {
  const explicit = process.env.FIREBASE_FUNCTIONS_BASE_URL;
  if (explicit && explicit.trim()) return trimTrailingSlash(explicit.trim());

  const region = (process.env.FIREBASE_FUNCTIONS_REGION || 'us-central1').trim();
  const project =
    (process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      '').trim();

  if (!project) {
    throw new Error(
      'Missing FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID). ' +
        'Set FIREBASE_FUNCTIONS_BASE_URL to override.'
    );
  }
  return `https://${region}-${project}.cloudfunctions.net`;
}

const FUNCTIONS_BASE = deriveFunctionsBase();
const PDF_FN = process.env.FIREBASE_PDF_FN || 'downloadStoryPdf';

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
function safeStr(x: unknown): string {
  if (x == null) return '';
  return (typeof x === 'string' ? x : String(x)).trim();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Try to normalize a YouTube or short link; otherwise return the same URL. */
function normalizeVideoUrl(url?: string | null): string {
  const u = safeStr(url);
  if (!u) return '';
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes('youtube.com') && parsed.searchParams.get('v')) {
      return `https://www.youtube.com/watch?v=${parsed.searchParams.get('v')}`;
    }
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace('/', '');
      return id ? `https://www.youtube.com/watch?v=${id}` : u;
    }
    return u;
  } catch {
    return u;
  }
}

type RawScene = {
  index?: number | null;
  // New model:
  background?: string | null;
  mainImage?: string | null;
  text?: string | null;
  videoUrl?: string | null;
  // Legacy compatibility:
  imageUrl?: string | null;
  youtubeVideoUrl?: string | null;
  content?: string | null;
  storyText?: string | null;
  title?: string | null;
};

type StoryLike = {
  title?: string | null;
  coverImageUrl?: string | null;
  imageUrl?: string | null; // fallback
  scenes?: RawScene[];
  pages?: RawScene[]; // if you end up storing under "pages"
  reader?: { backgroundUrl?: string | null } | null; // for title page backdrop
};

/* Build the HTML with: Title cover, then pages (background + main image + text + video URL) */
function storyToHtml(d: StoryLike, opts: { lang?: string; theme?: 'light'|'dark'; paper?: 'a4'|'letter' }) {
  const title = escapeHtml(safeStr(d?.title) || 'Story');
  const cover = safeStr(d?.coverImageUrl) || safeStr(d?.imageUrl) || '';
  const lang = opts.lang || 'en';
  const theme = opts.theme || 'dark';
  const paper = opts.paper || 'letter';

  // Prefer `pages` if present; else `scenes`
  const raw: RawScene[] = Array.isArray(d?.pages) ? d!.pages! : Array.isArray(d?.scenes) ? d!.scenes! : [];
  const scenes = raw
    .slice()
    .sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0))
    .map((s, i) => {
      const background =
        safeStr(s?.background) || // new
        safeStr((s as any)?.backgroundImageUrl) || // possible variant
        '';

      const mainImage =
        safeStr(s?.mainImage) || // new
        safeStr(s?.imageUrl) ||   // legacy
        '';

      const text =
        safeStr(s?.text) ||
        safeStr(s?.content) ||
        safeStr(s?.storyText) ||
        '';

      const videoUrl =
        normalizeVideoUrl(s?.videoUrl || s?.youtubeVideoUrl || '');

      const title = safeStr(s?.title) || `Page ${i + 1}`;

      return { background, mainImage, text, videoUrl, title };
    });

  // styles: print-friendly, background cover, content card, visible video button
  const css = `
  @page { 
    ${paper === 'a4' ? 'size: A4;' : 'size: Letter;'} 
    margin: 16mm; 
  }
  :root {
    --bg: ${theme === 'dark' ? '#0a0b0e' : '#ffffff'};
    --fg: ${theme === 'dark' ? '#e8eef5' : '#111827'};
    --muted: ${theme === 'dark' ? '#9aa5b1' : '#6b7280'};
    --card: ${theme === 'dark' ? '#12151a' : '#f9fafb'};
    --accent: #14b8a6; /* teal-500 */
    --accent-2: #7c3aed; /* violet-600 */
  }
  html, body { height: 100%; }
  body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    color: var(--fg);
    background: var(--bg);
  }
  h1, h2 { margin: 0 0 12px 0; }
  .titlepage {
    text-align: center; 
    page-break-after: always; 
    padding: 24px;
    position: relative;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.35));
    overflow: hidden;
  }
  .titlepage .backdrop {
    position: absolute; inset: 0;
    ${safeStr(d?.reader?.backgroundUrl)
      ? `background-image: url('${safeStr(d?.reader?.backgroundUrl)}');`
      : cover
      ? `background-image: url('${cover}');`
      : 'background: #111;'}
    background-size: cover;
    background-position: center;
    filter: blur(12px) brightness(0.7);
    transform: scale(1.1);
  }
  .titlepage .content {
    position: relative; z-index: 1;
    padding: 24px 16px;
  }
  .titlepage h1 {
    font-size: 28px; letter-spacing: .5px; margin-bottom: 12px;
  }
  .titlepage .cover {
    margin: 16px auto 0 auto; 
    max-width: 70%;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0,0,0,.35);
  }
  .titlepage .cover img {
    width: 100%; height: auto; display: block;
  }
  .page {
    page-break-after: always;
    margin: 0 0 18px 0;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    background: var(--card);
    box-shadow: 0 4px 18px rgba(0,0,0,.18);
    min-height: 100mm; /* keep some height */
  }
  .page .bg {
    position: absolute; inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0.25; /* faint backdrop for readability */
  }
  .page .inner {
    position: relative; z-index: 1;
    padding: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    overflow: hidden;
  }
  .card img {
    width: 100%; height: auto; display: block;
  }
  .text {
    padding: 14px 16px; line-height: 1.6; font-size: 13.5px; color: var(--fg);
    white-space: pre-wrap;
  }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; font-weight: 600; font-size: 14px;
    color: var(--fg); background: linear-gradient(90deg, var(--accent), var(--accent-2));
  }
  .videolink {
    display: inline-flex; align-items: center; gap: 8px;
    text-decoration: none; font-weight: 600; font-size: 12.5px;
    color: #fff; background: var(--accent-2);
    padding: 6px 10px; border-radius: 999px;
  }
  .videolink .icon { font-size: 12px; line-height: 1; }
  .footer {
    display: flex; justify-content: center; gap: 16px;
    font-size: 11.5px; color: var(--muted);
    padding: 12px 0 14px 0;
  }
  `;

  const titleHtml = `
  <div class="titlepage">
    <div class="backdrop"></div>
    <div class="content">
      <h1>${title}</h1>
      ${
        cover
          ? `<div class="cover"><img src="${cover}" alt="Cover" crossorigin="anonymous" /></div>`
          : ''
      }
    </div>
  </div>`;

  const pagesHtml = scenes
    .map((s, i) => {
      const bgCss = s.background ? `background-image: url('${s.background}');` : '';
      const mainImg = s.mainImage
        ? `<div class="card"><img src="${s.mainImage}" alt="${escapeHtml(s.title)}" crossorigin="anonymous" /></div>`
        : `<div class="card" style="display:flex;align-items:center;justify-content:center;color:var(--muted);padding:24px;">(No image)</div>`;

      const videoBtn = s.videoUrl
        ? `<a class="videolink" href="${escapeHtml(s.videoUrl)}" target="_blank" rel="noopener noreferrer"><span class="icon">▶</span><span>Open Video</span></a>`
        : `<span style="font-size:12px;color:#e5e7eb;opacity:.6;">No video</span>`;

      return `
      <section class="page">
        <div class="bg" style="${bgCss}"></div>
        <div class="header">
          <div>${escapeHtml(s.title)}</div>
          <div>${videoBtn}</div>
        </div>
        <div class="inner">
          ${mainImg}
          <div class="card text">${escapeHtml(s.text)}</div>
        </div>
        <div class="footer">
          <div>Page ${i + 1}</div>
          <div>narratum.app</div>
        </div>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charSet="utf-8" />
  <title>${title}</title>
  <meta name="color-scheme" content="${theme}" />
  <style>${css}</style>
</head>
<body>
  ${titleHtml}
  ${pagesHtml}
</body>
</html>`;
}

async function callPdfFn(html: string, pdfOptions?: Record<string, unknown>) {
  const url = `${FUNCTIONS_BASE}/${PDF_FN}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // If your CF checks auth, add Authorization: Bearer <idToken>
    body: JSON.stringify({ html, pdfOptions }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Function error: ${res.status} ${txt}`);
  }
  return await res.arrayBuffer();
}

/* ────────────────────────────────────────────────────────────
   Handlers
   ──────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const storyId = req.nextUrl.searchParams.get('storyId');
    const lang = (req.nextUrl.searchParams.get('lang') || 'en').toLowerCase();
    const theme = (req.nextUrl.searchParams.get('theme') || 'dark').toLowerCase() as 'light'|'dark';
    const paper = (req.nextUrl.searchParams.get('paper') || 'letter').toLowerCase() as 'a4'|'letter';

    if (!storyId) {
      return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection('stories').doc(storyId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const data = (snap.data() || {}) as StoryLike;

    // Build HTML with background + main image + text + video url
    const html = storyToHtml(data, { lang, theme, paper });

    // You can choose paper or any other options your CF supports
    const buf = await callPdfFn(html, { format: paper === 'a4' ? 'A4' : 'Letter', printBackground: true });

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
  // Optional POST path: accept full HTML or a structured payload { pages: [{background, mainImage, text, videoUrl}] }
  try {
    const body = await req.json().catch(() => ({} as any));

    // If HTML provided, passthrough:
    const htmlDirect = safeStr(body?.html);
    if (htmlDirect) {
      const buf = await callPdfFn(htmlDirect, body?.pdfOptions);
      return new NextResponse(Buffer.from(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="story.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // If structured pages are posted (from PageComposer), build minimal HTML on the fly:
    const title = safeStr(body?.title) || 'Page Weaver Book';
    const lang = safeStr(body?.lang) || 'en';
    const theme = (safeStr(body?.theme) || 'dark') as 'light'|'dark';
    const paper = (safeStr(body?.paper) || 'letter') as 'a4'|'letter';
    const pages = Array.isArray(body?.pages) ? body.pages as RawScene[] : [];

    const data: StoryLike = {
      title,
      coverImageUrl: safeStr(body?.coverImageUrl) || '',
      pages: pages.map((p, i) => ({
        index: Number.isFinite(p?.index) ? (p!.index as number) : i,
        background: safeStr((p as any)?.background),
        mainImage: safeStr((p as any)?.mainImage),
        text: safeStr((p as any)?.text),
        videoUrl: safeStr((p as any)?.videoUrl),
      })),
    };

    const html = storyToHtml(data, { lang, theme, paper });
    const buf = await callPdfFn(html, { format: paper === 'a4' ? 'A4' : 'Letter', printBackground: true });

    const baseName = slugify(title) || 'page-weaver-book';
    return new NextResponse(Buffer.from(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('POST download-story-pdf failed:', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
