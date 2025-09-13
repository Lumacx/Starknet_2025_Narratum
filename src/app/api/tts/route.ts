// src/app/api/tts/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
  try {
    const { text, voiceName = 'Kore', tone = 'a normal' } =
      (await req.json()) as { text: string; voiceName?: string; tone?: string };

    if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const ttsPrompt = `Say in ${tone} voice: ${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: ttsPrompt }] }],
      // NOTE: TTS config uses `config` (not `generationConfig`) in @google/genai
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;

    if (!data || !mimeType) {
      return NextResponse.json({ error: 'No audio returned' }, { status: 500 });
    }

    return NextResponse.json({ base64: data, mimeType });
  } catch (e: any) {
    console.error('tts error', e);
    return NextResponse.json({ error: e?.message ?? 'tts failed' }, { status: 500 });
  }
}
