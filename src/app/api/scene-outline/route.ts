import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
  try {
    const { idea, pages = 8, language = 'en' } = await req.json();

    const prompt = `
Create a ${pages}-page children's story outline from this idea: "${idea}".
Return JSON ONLY as an array of ${pages} objects with:
- "storyText": a short paragraph for the page
- "imagePrompt": a vivid prompt for an illustration engine
`.trim();

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, apiVersion: 'v1' });

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // ✅ use "config", not "generationConfig"
      config: {
        temperature: 0.6,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              storyText: { type: 'STRING' },
              imagePrompt: { type: 'STRING' },
            },
            required: ['storyText', 'imagePrompt'],
          },
        },
      },
    });

    const text = res?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return NextResponse.json({ error: 'No outline returned' }, { status: 500 });

    // Be forgiving if the model returns fenced JSON
    const json = JSON.parse(text.replace(/```json|```/g, ''));
    return NextResponse.json({ outline: json });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Outline failed' }, { status: 500 });
  }
}
