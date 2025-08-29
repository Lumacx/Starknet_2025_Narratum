import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function base64ToArrayBuffer(b64: string) {
  const bin = Buffer.from(b64, 'base64');
  return new Uint8Array(bin).buffer;
}

function pcm16ToWav(pcm16: Int16Array, sampleRate: number, channels = 1) {
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + pcm16.length * bytesPerSample);
  const view = new DataView(buffer);

  const write = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm16.length * bytesPerSample, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm16.length * bytesPerSample, true);
  for (let i = 0; i < pcm16.length; i++) view.setInt16(44 + i * 2, pcm16[i], true);
  return new Blob([view], { type: 'audio/wav' });
}

export async function POST(req: Request) {
  try {
    const { text, voice = 'Kore', tone = 'a normal', language = 'en' } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });

    const ttsPrompt =
      language === 'es'
        ? `Di con ${tone} voz: ${text}`
        : `Say in ${tone} voice: ${text}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`;

    // Use the REST payload shape from your HTML eReader reference
    const body = {
      contents: [{ role: 'user', parts: [{ text: ttsPrompt }] }],
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      // optional tuning; can be omitted
      generationConfig: { temperature: 0.4 },
    };

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const msg = await r.text();
      return NextResponse.json({ error: `TTS HTTP ${r.status}: ${msg.slice(0, 300)}` }, { status: 502 });
    }

    const json = await r.json();

    const part =
      json?.candidates?.[0]?.content?.parts?.find(
        (p: any) => p?.inlineData?.data && typeof p?.inlineData?.mimeType === 'string'
      ) ?? null;

    if (!part) return NextResponse.json({ error: 'No audio part returned' }, { status: 500 });

    const mime: string = String(part.inlineData.mimeType);
    const b64: string = String(part.inlineData.data);

    // If PCM, wrap in WAV so browsers can play it easily
    if (mime.startsWith('audio/pcm')) {
      const rateMatch = mime.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      const pcm = new Int16Array(base64ToArrayBuffer(b64));
      const wavBlob = pcm16ToWav(pcm, sampleRate, 1);
      const buf = new Uint8Array(await wavBlob.arrayBuffer());
      const wavB64 = Buffer.from(buf).toString('base64');
      return NextResponse.json({
        audioUrl: `data:audio/wav;base64,${wavB64}`,
        mimeType: 'audio/wav',
        modelUsed: 'gemini-2.5-flash-preview-tts',
      });
    }

    // If already playable (e.g., audio/wav or audio/mp3)
    return NextResponse.json({
      audioUrl: `data:${mime};base64,${b64}`,
      mimeType: mime,
      modelUsed: 'gemini-2.5-flash-preview-tts',
    });
  } catch (e: any) {
    console.error('generate-audio error:', e);
    return NextResponse.json({ error: e?.message || 'Generate audio failed' }, { status: 500 });
  }
}
