import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// NOTE: requires @google/generative-ai >= 0.24 and a key with Imagen 3 access.
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    // Use one of Imagen 3 models (availability varies by region/account)
    const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate' });

    // The correct API is *generateImages* (plural)
    // We ask for a single 1024 image.
    // @ts-expect-error: types may lag behind; method exists at runtime for 0.24+.
    const res = await model.generateImages({
      prompt,
      numberOfImages: 1,
      size: '1024x1024',
    });

    // Normalize base64 extraction across SDK return shapes
    const b64 =
      // new shape
      res?.images?.[0]?.b64Data ||
      // candidates/inlineData path (older shapes)
      res?.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!b64) throw new Error('No image returned from model');
    const dataUrl = `data:image/png;base64,${b64}`;
    return NextResponse.json({ dataUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Generate failed' }, { status: 500 });
  }
}
