import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReqBody = {
  dataUrl?: string;   // small client-side image
  imageUrl?: string;  // Firebase (or any) URL
};

function parseDataUrl(dataUrl: string) {
  const idx = dataUrl.indexOf(';base64,');
  if (idx === -1) throw new Error('Invalid data URL format.');
  const mimeType = dataUrl.slice(5, idx);
  const b64 = dataUrl.slice(idx + ';base64,'.length);
  if (!mimeType.startsWith('image/')) throw new Error('Provided dataUrl is not an image.');
  return { mimeType, b64 };
}

async function fetchImageAsBase64(imageUrl: string) {
  const res = await fetch(imageUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const mimeType = res.headers.get('content-type') || 'image/png';
  if (!mimeType.startsWith('image/')) throw new Error('Fetched URL did not return an image.');
  const buf = Buffer.from(await res.arrayBuffer());
  const b64 = buf.toString('base64');
  return { mimeType, b64 };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    if (!body.dataUrl && !body.imageUrl) {
      return NextResponse.json({ error: 'Missing dataUrl or imageUrl' }, { status: 400 });
    }

    let mimeType: string;
    let b64: string;

    if (body.dataUrl) {
      if (body.dataUrl.length > 7_000_000) {
        return NextResponse.json(
          { error: 'Image too large to send as dataUrl. Use imageUrl instead.' },
          { status: 413 }
        );
      }
      ({ mimeType, b64 } = parseDataUrl(body.dataUrl));
    } else {
      ({ mimeType, b64 } = await fetchImageAsBase64(body.imageUrl!));
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      { inlineData: { data: b64, mimeType } },
      { text: 'Describe this image in one concise paragraph for a prompt field.' },
    ]);

    const description = result.response.text().trim();
    return NextResponse.json({ description });
  } catch (e: any) {
    console.error('describe-image error:', e);
    const message = typeof e?.message === 'string' ? e.message : 'Describe failed';
    const status =
      message.includes('Missing') ? 400 :
      message.includes('Invalid data URL') ? 400 :
      message.includes('not an image') ? 415 :
      message.includes('Failed to fetch image') ? 502 :
      500;
    return NextResponse.json({ error: message }, { status });
  }
}
