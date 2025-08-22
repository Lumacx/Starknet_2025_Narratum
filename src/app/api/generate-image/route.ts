// src/app/api/generate-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY!;
    const genAI = new GoogleGenerativeAI(apiKey);
    // Replace with your preferred image model/provider.
    const model = genAI.getGenerativeModel({ model: 'imagen-3.0' as any });
    // If your provider returns bytes, convert to data URL; here we just simulate:
    const result = await (model as any).generateImage({ prompt });
    const dataUrl = result.dataUrl ?? result.response?.dataUrl; // adapt as needed

    return NextResponse.json({ dataUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Generation error' }, { status: 500 });
  }
}
