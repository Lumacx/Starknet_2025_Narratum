// src/app/api/generate-scene-outline/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Body = { idea: string; pages?: number; language?: string };

const MODEL_JSON = 'gemini-2.0-flash'; // estable y fiable para JSON

function clampPages(n?: number) {
  const x = Number.isFinite(n as number) ? (n as number) : 8;
  return Math.max(1, Math.min(20, Math.floor(x)));
}

function buildPrompt({ idea, pages = 8, language = 'en' }: Body) {
  const p = clampPages(pages);
  return `
Create a ${p}-page children's story outline from this idea: "${(idea || 'Story').trim()}".
Return JSON ONLY as an array of exactly ${p} objects. Each object must include:
- "storyText": one short paragraph for the page (language: ${language || 'en'})
- "imagePrompt": a vivid illustration prompt for that page (no text rendering)
`.trim();
}

/** Intenta parsear JSON (con o sin ```json fences) y, de emergencia, extrae el primer [] válido. */
function parseArrayJson(s: string) {
  const cleaned = s.replace(/```json|```/g, '').trim();
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

function pickFirstTextPartFromRest(json: any): string | null {
  // REST v1 shape
  const candidates = json?.candidates ?? json?.response?.candidates ?? [];
  for (const c of candidates) {
    const parts = c?.content?.parts || [];
    for (const p of parts) {
      if (typeof p?.text === 'string' && p.text.trim()) return p.text.trim();
    }
  }
  if (typeof json?.text === 'string' && json.text.trim()) return json.text.trim();
  return null;
}

function pickFirstTextFromSdk(resp: any): string | null {
  // SDK: prefer .text(), si existe
  try {
    if (typeof resp?.text === 'function') {
      const t = String(resp.text()).trim();
      if (t) return t;
    }
  } catch { /* noop */ }
  // fallback candidatos
  const t =
    resp?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() ||
    resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() ||
    '';
  return t || null;
}

/** Normaliza a exactamente N páginas (slice/pad). */
function normalizePages(rawArr: any[], target: number) {
  const mapped = rawArr.map((x: any, i: number) => ({
    storyText: String(x?.storyText ?? '').trim(),
    imagePrompt: String(x?.imagePrompt ?? '').trim(),
    index: i,
  }));
  if (mapped.length > target) return mapped.slice(0, target);
  if (mapped.length < target) {
    const pad: any[] = [];
    for (let i = mapped.length; i < target; i++) {
      pad.push({ storyText: '', imagePrompt: '', index: i });
    }
    return [...mapped, ...pad];
  }
  return mapped;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY / GOOGLE_API_KEY' },
        { status: 500 }
      );
    }

    if (!body?.idea?.trim()) {
      return NextResponse.json({ error: 'Missing "idea" string' }, { status: 400 });
    }

    const pagesTarget = clampPages(body.pages);
    const prompt = buildPrompt(body);

    /* ---------- 1) Intento REST v1 (recomendado para JSON) ---------- */
    const restUrl =
      `https://generativelanguage.googleapis.com/v1/models/` +
      `${encodeURIComponent(MODEL_JSON)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const restPayload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // REST v1: generationConfig + snake_case
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.6,
      },
    };

    let raw: string | null = null;
    try {
      const r = await fetch(restUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restPayload),
      });
      if (r.ok) {
        const data = await r.json();
        raw = pickFirstTextPartFromRest(data);
      } else {
        // continúa al SDK fallback
        raw = null;
      }
    } catch {
      raw = null;
    }

    /* ---------- 2) Fallback SDK si REST no trajo contenido ---------- */
    if (!raw) {
      const ai = new GoogleGenAI({ apiKey });
      const resp = await ai.models.generateContent({
        model: MODEL_JSON,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        // SDK: config camelCase
        config: {
          temperature: 0.6,
          responseMimeType: 'application/json',
        },
      });
      raw = pickFirstTextFromSdk(resp);
    }

    if (!raw) {
      return NextResponse.json({ error: 'Model returned no content' }, { status: 502 });
    }

    const ideasArr = parseArrayJson(raw);
    const normalized = normalizePages(ideasArr, pagesTarget);
    return NextResponse.json(normalized);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error in generate-scene-outline' },
      { status: 400 }
    );
  }
}
