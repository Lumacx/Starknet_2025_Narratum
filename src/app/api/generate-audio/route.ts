// src/app/api/generate-audio/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  text: string;                 // narration text
  voiceName?: string;           // "Kore" | "Puck" | "Zephyr" | "Leda" | "Sadachbia" | ...
  language?: string;            // 'en' | 'es' | ...
  tone?: string;                // optional: "a cheerful", "a sad", etc — we’ll weave this in
};

function pcm16ToWav(pcm: Buffer, sampleRate: number, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const wav = Buffer.alloc(44 + pcm.length);

  let offset = 0;
  wav.write('RIFF', offset); offset += 4;
  wav.writeUInt32LE(36 + pcm.length, offset); offset += 4;
  wav.write('WAVE', offset); offset += 4;

  // fmt chunk
  wav.write('fmt ', offset); offset += 4;
  wav.writeUInt32LE(16, offset); offset += 4;          // PCM
  wav.writeUInt16LE(1, offset); offset += 2;           // PCM format
  wav.writeUInt16LE(numChannels, offset); offset += 2; // channels
  wav.writeUInt32LE(sampleRate, offset); offset += 4;  // sample rate
  wav.writeUInt32LE(byteRate, offset); offset += 4;    // byte rate
  wav.writeUInt16LE(blockAlign, offset); offset += 2;  // block align
  wav.writeUInt16LE(16, offset); offset += 2;          // bits per sample

  // data chunk
  wav.write('data', offset); offset += 4;
  wav.writeUInt32LE(pcm.length, offset); offset += 4;

  pcm.copy(wav, offset);
  return wav;
}

export async function POST(req: Request) {
  try {
    const { text, voiceName = 'Kore', language = 'en', tone } = (await req.json()) as Body;
    if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, apiVersion: 'v1' });

    const voiceList = new Set(['Kore','Puck','Zephyr','Leda','Sadachbia']); // keep in sync with UI
    const chosenVoice = voiceList.has(voiceName) ? voiceName : 'Kore';

    const ttsPrompt = [
      language ? `Respond in ${language}.` : '',
      tone ? `Read in ${tone} tone.` : '',
      text,
    ].filter(Boolean).join('\n');

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: ttsPrompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: chosenVoice } } },
      } as any,
    });

    // The API returns inlineData with PCM; mimeType like "audio/pcm;rate=24000"
    const part = res?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
    const b64 = part?.inlineData?.data as string | undefined;
    const mime = part?.inlineData?.mimeType as string | undefined;

    if (!b64 || !mime) throw new Error('No audio bytes returned');
    const rateMatch = mime.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

    const pcmBuffer = Buffer.from(b64, 'base64');
    const wav = pcm16ToWav(pcmBuffer, sampleRate);
    const wavB64 = wav.toString('base64');
    const dataUrl = `data:audio/wav;base64,${wavB64}`;

    return NextResponse.json({
      voice: chosenVoice,
      sampleRate,
      format: 'wav',
      dataUrl,
    });
  } catch (e: any) {
    console.error('generate-audio error:', e);
    return NextResponse.json({ error: e?.message || 'Audio generation failed' }, { status: 500 });
  }
}
