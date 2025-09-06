// src/app/api/generate-image/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI, Part } from '@google/genai'; // MODIFIED: Import Part

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ModelsState = { ts: number; names: Set<string> };
let _cache: ModelsState | null = null;

async function listShortModelNames(ai: GoogleGenAI): Promise<Set<string>> {
  // ... (this function remains unchanged)
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
  // ... (this function remains unchanged)
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
    // MODIFIED: Accept new 'images' property for editing/combining
    const { prompt, count = 1, aspectRatio, images: inputImages } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // --- First attempt remains the Firebase Function (no changes here) ---
    const base = process.env.FIREBASE_FUNCTIONS_BASE_URL?.replace(/\/$/, '');
    if (base) {
      try {
        const u = new URL(`${base}/smartGenerateImage`);
        u.searchParams.set('prompt', prompt);
        u.searchParams.set('count', String(count));
        if (aspectRatio) u.searchParams.set('aspectRatio', String(aspectRatio));
        const r = await fetch(u.toString(), { method: 'GET' });
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    const ai = new GoogleGenAI({ apiKey }); // MODIFIED: apiVersion not needed for this model

    // ✅ NEW PRIMARY METHOD: Use Gemini Image Preview Model
    try {
      console.log('Attempting generation with gemini-2.5-flash-image-preview...');
      const modelName = 'gemini-2.5-flash-image-preview';
      let contents: (string | Part)[] = [prompt];

      // If input images are provided for editing/combining
      if (Array.isArray(inputImages) && inputImages.length > 0) {
        contents = [{ text: prompt }]; // Start with the text prompt
        for (const imgDataUrl of inputImages) {
          if (typeof imgDataUrl !== 'string' || !imgDataUrl.startsWith('data:image/')) {
            console.warn('Skipping invalid image data URL:', imgDataUrl);
            continue;
          }
          const [header, base64Data] = imgDataUrl.split(',');
          const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
          
          contents.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
      });

      const generatedImages = [];
      for (const part of response?.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData) {
          const b64 = part.inlineData.data;
          generatedImages.push(`data:${part.inlineData.mimeType};base64,${b64}`);
        }
      }

      if (generatedImages.length > 0) {
        console.log('Successfully generated with gemini-2.5-flash-image-preview.');
        return NextResponse.json({ modelUsed: modelName, images: generatedImages });
      }
      // If we get here, the model responded but gave no image. We'll let it fall through.
      throw new Error('Gemini Image Preview returned no image data.');

    } catch (e: any) {
      console.warn('Primary generation with Gemini Image Preview failed:', e?.message || e);
      console.log('Falling back to Imagen model...');

      // 🛑 FALLBACK METHOD: Your original Imagen SDK call
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

      if (!images.length) throw new Error('Fallback Imagen response contained no image bytes');
      return NextResponse.json({ modelUsed: model, images });
    }

  } catch (e: any) {
    console.error('Generate image error:', e);
    return NextResponse.json({ error: e?.message || 'Generate failed' }, { status: Number(e?.status) || 500 });
  }
}