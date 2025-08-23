// src/app/api/story-outline/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { idea, pages } = (await req.json()) as { idea: string; pages: number };
    if (!idea || !pages) return NextResponse.json({ error: 'Missing idea/pages' }, { status: 400 });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Based on this idea: "${idea}", generate ${pages} short children's pages.
Return a JSON array with exactly ${pages} objects:
[{ "storyText": "...", "imagePrompt": "..." }, ...].
Keep storyText ≤ 420 chars, whimsical and cinematic; imagePrompt is a vivid, specific visual description.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              storyText: { type: SchemaType.STRING },
              imagePrompt: { type: SchemaType.STRING },
            },
            required: ['storyText', 'imagePrompt'],
          },
        },
      },
    });

    const text = result.response.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length !== pages) throw new Error('Unexpected outline format');

    return NextResponse.json({ pages: parsed });
  } catch (e: any) {
    console.error('outline error', e);
    return NextResponse.json({ error: e?.message ?? 'outline failed' }, { status: 500 });
  }
}
