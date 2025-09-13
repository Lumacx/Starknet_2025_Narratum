// src/app/api/suggest-scene/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Body = {
  title?: string;
  genres?: string[];
  synopsis?: string;
  language?: string;
  sceneIndex?: number;
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

/** Accepts ```json fences and minor wrapping noise */
function safeParseJson(s: string) {
  const cleaned = s.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}$/);
    if (!m) throw new Error('Invalid JSON from model');
    return JSON.parse(m[0]);
  }
}

/** Works across older/newer @google/genai response shapes */
function extractText(resp: any): string {
  // Newer shape
  if (resp?.response?.text && typeof resp.response.text === 'function') {
    return resp.response.text().trim();
  }
  // Helper on some versions
  if (typeof resp?.text === 'function') {
    return resp.text().trim();
  }
  // Candidates (older)
  const cand = resp?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof cand === 'string') return cand.trim();
  return '';
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY / GOOGLE_API_KEY' },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    const prompt = buildPrompt(body);

    // --- Attempt 1: camelCase (common in SDK typings)
    const camelCfg = {
      temperature: 0.6,
      // @ts-ignore - present in many SDK versions
      responseMimeType: 'application/json',
    } as any;

    let resp: any;
    try {
      resp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        // some SDKs call this "generationConfig", others "config"
        // We use "config" because your current build expects it.
        config: camelCfg,
      });
    } catch (e: any) {
      const msg = String(e?.message || e);
      const isMimeKeyError =
        msg.includes('responseMimeType') || msg.includes('INVALID_ARGUMENT');

      if (!isMimeKeyError) throw e;

      // --- Attempt 2: snake_case (server sometimes expects this)
      const snakeCfg = {
        temperature: 0.6,
        // Use snake_case but avoid TS errors by casting
        response_mime_type: 'application/json',
      } as any;

      resp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: snakeCfg,
      });
    }

    const raw = extractText(resp);
    if (!raw) {
      return NextResponse.json(
        { error: 'Model returned no content' },
        { status: 502 },
      );
    }

    const json = safeParseJson(raw);
    if (
      typeof json?.storyText !== 'string' ||
      typeof json?.imagePrompt !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Unexpected JSON shape', raw },
        { status: 502 },
      );
    }

    return NextResponse.json({
      storyText: json.storyText,
      imagePrompt: json.imagePrompt,
    });
  } catch (e: any) {
    console.error('suggest-scene error:', e?.stack || e);
    return NextResponse.json(
      { error: e?.message || 'Suggest failed' },
      { status: 500 },
    );
  }
}
