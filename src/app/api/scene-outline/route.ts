// src/app/api/scene-outline/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  idea: string;           // user idea / synopsis
  pageCount: number;      // number of scenes/pages to generate
  language?: string;      // 'en' | 'es' | ...
  genres?: string[];      // optional for extra flavor
};

export async function POST(req: Request) {
  try {
    const { idea, pageCount, language = 'en', genres = [] } = (await req.json()) as Body;
    if (!idea || !pageCount) {
      return NextResponse.json({ error: 'Missing idea or pageCount' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, apiVersion: 'v1' });

    const langLabel: Record<string, string> = {
      en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German',
      it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic',
    };
    const label = langLabel[language] || 'English';

    const prompt = [
      `Respond only in ${label}.`,
      `Create a ${pageCount}-page story outline from this idea: "${idea}".`,
      genres.length ? `Genres (guide tone, do NOT list in output): ${genres.join(', ')}.` : '',
      `Return strictly a JSON array of ${pageCount} items.`,
      `Each item is an object:`,
      `- "storyText": short paragraph of story text for that page (kid-friendly; concise).`,
      `- "imagePrompt": a clear visual description for an illustration model (no text in image).`,
    ].filter(Boolean).join('\n');

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
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
      } as any,
    });

    const text = res?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Empty outline response');
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length !== Number(pageCount)) {
      throw new Error('Invalid outline payload');
    }
    return NextResponse.json({ pages: parsed });
  } catch (e: any) {
    console.error('scene-outline error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to suggest outline' }, { status: 500 });
  }
}
