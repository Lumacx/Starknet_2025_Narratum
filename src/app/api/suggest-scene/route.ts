// src/app/api/suggest-scene/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  title?: string;
  genres?: string[];
  synopsis?: string;
  language?: string;   // 'en', 'es', ...
  sceneIndex?: number; // 1-based
};

function buildPrompt(b: Body) {
  const lang = b.language || 'en';
  const genres = (b.genres || []).join(', ') || 'Any';
  const idx = b.sceneIndex ?? 1;

  return `
You are a professional story developer and visual director.

Language to WRITE IN: ${lang}

Story context:
- Title: ${b.title || 'Untitled'}
- Genres: ${genres}
- Synopsis: ${b.synopsis || '(none)'}

Task for SCENE #${idx}:
1) Write a vivid paragraph (70–120 words) of story text, self-contained, suitable for narration.
2) Provide ONE concise illustration prompt for an image generator (no text overlays).

Return JSON ONLY with exactly:
{
  "storyText": "<paragraph>",
  "imagePrompt": "<one-sentence prompt>"
}
`.trim();
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

    const resp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // NOTE: with @google/genai use "config", not "generationConfig"
      config: {
        temperature: 0.6,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            storyText: { type: 'STRING' },
            imagePrompt: { type: 'STRING' },
          },
          required: ['storyText', 'imagePrompt'],
        },
      },
    });

    const text =
      resp?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    if (!text) {
      return NextResponse.json(
        { error: 'Model returned no content' },
        { status: 502 }
      );
    }

    // Be tolerant of fenced JSON, just in case
    const cleaned = text.replace(/```json|```/g, '');
    const json = JSON.parse(cleaned);

    if (
      typeof json?.storyText !== 'string' ||
      typeof json?.imagePrompt !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Unexpected JSON shape', raw: text },
        { status: 502 }
      );
    }

    // Match ScenesPage expectations exactly:
    return NextResponse.json({
      storyText: json.storyText,
      imagePrompt: json.imagePrompt,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Suggest failed' },
      { status: 500 }
    );
  }
}
