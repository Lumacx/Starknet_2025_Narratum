import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ModelsState = { ts: number; names: Set<string> };
let _cache: ModelsState | null = null;

async function listShortModelNames(ai: GoogleGenAI): Promise<Set<string>> {
  const now = Date.now();
  if (_cache && now - _cache.ts < 10 * 60 * 1000) return _cache.names;
  const pager = await ai.models.list();
  const set = new Set<string>();
  for await (const m of (pager as AsyncIterable<any>)) {
    const full = (m?.name ?? m?.model ?? '').toString();
    const short = full.startsWith('models/') ? full.slice(7) : full;
    if (short) set.add(short);
  }
  _cache = { ts: now, names: set };
  return set;
}

function pickImagenModel(available: Set<string>): string | null {
  const candidates = [
    'imagen-4.0-fast-generate-001',
    'imagen-4.0-generate-001',
    'imagen-3.0-fast-generate-001',
    'imagen-3.0-generate-002',
  ];
  for (const id of candidates) if (available.has(id)) return id;
  return null;
}

export async function POST(req: Request) {
  try {
    const { prompt, count = 1, aspectRatio } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const base = process.env.FIREBASE_FUNCTIONS_BASE_URL?.replace(/\/$/, '');
    if (base) {
      try {
        const u = new URL(`${base}/smartGenerateImage`);
        u.searchParams.set('prompt', prompt);
        u.searchParams.set('count', String(count));
        if (aspectRatio) u.searchParams.set('aspectRatio', String(aspectRatio));
        const r = await fetch(u.toString(), { method: 'GET' });

        // Si Cloud Functions devuelve HTML por 404/403, evita parseo JSON
        const ct = r.headers.get('content-type') || '';
        const text = await r.text();

        if (!r.ok) {
          console.warn('smartGenerateImage HTTP error:', r.status, text.slice(0, 200));
        } else if (ct.includes('application/json')) {
          const json = JSON.parse(text);
          if (Array.isArray(json.images) && json.images.length) {
            const images = json.images.map((b64: string) => `data:image/png;base64,${b64}`);
            return NextResponse.json({ modelUsed: json.model, images });
          }
        } else {
          console.warn('smartGenerateImage returned non-JSON:', text.slice(0, 200));
        }
      } catch (e: any) {
        console.error('Call smartGenerateImage failed:', e?.message || e);
      }
    }

    // Fallback local con SDK
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    const ar = (typeof aspectRatio === 'string' && aspectRatio.trim()) ? aspectRatio.trim() : '4:3';

    const names = await listShortModelNames(ai);
    const model = pickImagenModel(names);
    if (!model) {
      return NextResponse.json({
        error: 'No image-generation model available for this project/region. Enable Imagen 4 (or Fast) in AI Studio/Billing and retry.',
      }, { status: 503 });
    }

    const r = await ai.models.generateImages({
      model,
      prompt,
      config: { numberOfImages: Math.min(Math.max(Number(count) || 1, 1), 4), aspectRatio: ar },
    });

    const images =
      r.generatedImages?.map(g => g?.image?.imageBytes)
        .filter(Boolean)
        .map(b64 => `data:image/png;base64,${b64}`) ?? [];

    if (!images.length) throw new Error('No image bytes in Imagen response');
    return NextResponse.json({ modelUsed: model, images });
  } catch (e: any) {
    console.error('Generate image error:', e);
    return NextResponse.json({ error: e?.message || 'Generate failed' }, { status: Number(e?.status) || 500 });
  }
}
