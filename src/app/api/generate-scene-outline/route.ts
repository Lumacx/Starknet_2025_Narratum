// src/app/api/generate-scene-outline/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  idea: string;
  pages?: number;
  language?: string; // 'en', 'es', ...
};

function buildPrompt({ idea, pages = 8, language = 'en' }: Body) {
  return `
Create a ${pages}-page children's story outline from this idea: "${idea}".
Return JSON ONLY as an array of ${pages} objects with:
- "storyText": a short paragraph for the page (${language})
- "imagePrompt": a vivid prompt for an illustration engine
`.trim();
}

function safeParseJsonArray(s: string) {
  const cleaned = s.replace(/```json|```/g, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error('Expected array JSON');
    return parsed;
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('Invalid JSON from model');
    const parsed = JSON.parse(m[0]);
    if (!Array.isArray(parsed)) throw new Error('Expected array JSON');
    return parsed;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY / GOOGLE_API_KEY' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    const prompt = buildPrompt(body);

    // ✅ Use `config` to match your installed typings
    const resp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.6,
        responseMimeType: 'application/json',
      },
    });

    // ✅ Read from legacy response shape
    const raw =
      (resp as any)?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() ??
      (typeof (resp as any)?.text === 'function' ? (resp as any).text().trim() : '');

    if (!raw) {
      return NextResponse.json(
        { error: 'Model returned no content' },
        { status: 502 }
      );
    }

    const ideas = safeParseJsonArray(raw);
    return NextResponse.json(ideas);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error in generate-scene-outline' },
      { status: 400 }
    );
  }
}
