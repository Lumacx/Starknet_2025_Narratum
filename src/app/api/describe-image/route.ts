import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReqBody = { dataUrl?: string; imageUrl?: string; prompt?: string };

function parseDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!m) throw new Error('Invalid data URL format.');
  const mimeType = m[1], b64 = m[2];
  if (!mimeType.startsWith('image/')) throw new Error('Provided dataUrl is not an image.');
  return { mimeType, b64 };
}

async function fetchImageAsBase64(imageUrl: string) {
  const r = await fetch(imageUrl, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Failed to fetch image (${r.status})`);
  const mimeType = r.headers.get('content-type') || 'image/png';
  if (!mimeType.startsWith('image/')) throw new Error('Fetched URL did not return an image.');
  const b64 = Buffer.from(await r.arrayBuffer()).toString('base64');
  return { mimeType, b64 };
}

async function pickFirstAvailableModel(ai: GoogleGenAI, candidates: string[]) {
  const pager = await ai.models.list();
  const names = new Set<string>();
  for await (const m of (pager as AsyncIterable<any>)) {
    const full = (m?.name ?? m?.model ?? '').toString();
    const short = full.startsWith('models/') ? full.slice(7) : full;
    if (short) names.add(short);
  }
  for (const id of candidates) if (names.has(id)) return id;
  return null;
}

export async function POST(req: Request) {
  try {
    const { dataUrl, imageUrl, prompt } = (await req.json()) as ReqBody;
    if (!dataUrl && !imageUrl) {
      return NextResponse.json({ error: 'Missing dataUrl or imageUrl' }, { status: 400 });
    }

    const { mimeType, b64 } = dataUrl
      ? (() => {
          if (dataUrl.length > 7_000_000) throw new Error('Image too large; use imageUrl instead.');
          return parseDataUrl(dataUrl);
        })()
      : await fetchImageAsBase64(imageUrl!);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, apiVersion: 'v1' });

    // 🔎 Autodetectar modelo multimodal disponible
    const model =
      (await pickFirstAvailableModel(ai, [
        'gemini-2.5-flash-image-preview',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ])) || 'gemini-1.5-flash'; // fallback conservador

    const res = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: b64 } } as any,
            { text: prompt || 'Describe this image in one concise paragraph suitable for a prompt field.' },
          ],
        },
      ],
    });

    const text = res?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      ?.filter(Boolean)
      ?.join('\n')
      ?.trim();

    if (!text) throw new Error('No text returned by Gemini.');
    return NextResponse.json({ modelUsed: model, description: text });
  } catch (e: any) {
    console.error('describe-image error:', e);
    const message = e?.message || 'Describe failed';
    const status =
      message.includes('Missing') || message.includes('Invalid data URL') ? 400 :
      message.includes('not an image') ? 415 :
      message.includes('Failed to fetch image') ? 502 :
      500;
    return NextResponse.json({ error: message }, { status });
  }
}
