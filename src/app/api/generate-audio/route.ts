// src/app/api/generate-audio/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  text: string;
  voice?: string;     // 'Kore' | 'Puck' | 'Zephyr' | 'Leda' | 'Sadachbia'
  tone?: string;      // e.g. 'a cheerful'
  language?: string;  // e.g. 'en', 'es'
  model?: string;     // default below
};

const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';
const VOICES = new Set(['Kore', 'Puck', 'Zephyr', 'Leda', 'Sadachbia']);

function buildPrompt(text: string, language: string, tone?: string | null) {
  if (language === 'es') {
    return `Idioma: español. Lee de manera natural como narrador${tone ? `, ${tone}` : ''}.\n\nTexto:\n${text}`;
  }
  return `Language: ${language}. Read naturally as a narrator${tone ? `, ${tone}` : ''}.\n\nText:\n${text}`;
}

async function callV1Generate({
  apiKey,
  modelId,
  prompt,
  responseMime,
  voiceName,
}: {
  apiKey: string;
  modelId: string;
  prompt: string;
  responseMime: 'audio/mp3' | 'audio/wav';
  voiceName: string;
}) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
    modelId
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    // NOTE: v1 expects snake_case response_mime_type
    generationConfig: { response_mime_type: responseMime },
    // NOTE: v1 uses top-level voiceConfig (no speechConfig)
    voiceConfig: { prebuiltVoiceConfig: { voiceName } },
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const msg = await r.text();
    return { ok: false as const, status: r.status, error: msg };
  }

  const json = await r.json();

  const part =
    json?.candidates?.[0]?.content?.parts?.find(
      (p: any) => p?.inlineData?.data && typeof p?.inlineData?.mimeType === 'string'
    ) ?? null;

  if (!part) {
    return { ok: false as const, status: 502, error: 'No inlineData audio part' };
  }

  const mime: string = String(part.inlineData.mimeType);
  const b64: string = String(part.inlineData.data);
  return { ok: true as const, audioUrl: `data:${mime};base64,${b64}`, mimeType: mime };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const text = (body.text ?? '').trim();
    if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

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

    const language = (body.language || 'en').trim();
    const tone = body.tone || null;
    const voiceName = VOICES.has(body.voice || '') ? String(body.voice) : 'Kore';
    const modelId = (body.model || DEFAULT_MODEL).trim();

    const prompt = buildPrompt(text, language, tone);

    // Try MP3 first (best UX for browsers)
    let out = await callV1Generate({
      apiKey,
      modelId,
      prompt,
      responseMime: 'audio/mp3',
      voiceName,
    });

    if (!out.ok) {
      // Fallback to WAV if MP3 is not supported by the backend/model
      out = await callV1Generate({
        apiKey,
        modelId,
        prompt,
        responseMime: 'audio/wav',
        voiceName,
      });
    }

    if (!out.ok) {
      // Bubble up a concise message
      return NextResponse.json(
        { error: `TTS failed (${out.status}): ${String(out.error).slice(0, 400)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      audioUrl: out.audioUrl, // data URL: drop straight into <audio src=...>
      mimeType: out.mimeType,
      modelUsed: modelId,
    });
  } catch (e: any) {
    console.error('generate-audio error:', e);
    return NextResponse.json(
      { error: e?.message || 'TTS failed' },
      { status: 500 }
    );
  }
}
