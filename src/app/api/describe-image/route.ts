import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { dataUrl } = await req.json();
    if (!dataUrl) return NextResponse.json({ error: 'Missing dataUrl' }, { status: 400 });

    const [mime, b64] = dataUrl.split(';base64,');
    const mimeType = mime.replace('data:', '');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      { inlineData: { data: b64, mimeType } },
      { text: 'Describe this image in one concise paragraph for a prompt field.' },
    ]);

    const description = result.response.text().trim();
    return NextResponse.json({ description });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Describe failed' }, { status: 500 });
  }
}
