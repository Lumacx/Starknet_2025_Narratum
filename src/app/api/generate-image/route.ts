import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Ensure Node runtime (SDK needs Node, not Edge)
export const runtime = 'nodejs';
// If you use caching, disable for dynamic generation
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { prompt, count = 1, aspectRatio } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Use Imagen 4 (fast) or swap to imagen-4.0-generate-001 for higher quality
    const resp = await ai.models.generateImages({
      model: 'imagen-4.0-fast-generate-001',
      prompt,
      config: {
        numberOfImages: Math.min(Math.max(Number(count) || 1, 1), 4),
        ...(aspectRatio ? { aspectRatio } : {}), // e.g. "1:1", "16:9", "9:16"
        // includeRaiReason: true, // optional debug info
      },
    });

    const b64 = resp?.generatedImages?.[0]?.image?.imageBytes;
    if (!b64) throw new Error('No image bytes in response');

    return NextResponse.json({ dataUrl: `data:image/png;base64,${b64}` });
  } catch (e: any) {
    console.error('Imagen generate error:', e);
    const msg = e?.message || 'Generate failed';
    const status = Number(e?.status) || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
