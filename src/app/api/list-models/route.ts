import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    apiVersion: 'v1', // estable
  });

  // list() => Promise<Pager<Model>>  ➜ iterar con for-await
  const pager = await ai.models.list();

  const models: string[] = [];
  for await (const m of (pager as AsyncIterable<any>)) {
    const id = m?.name ?? m?.model ?? m?.id ?? '';
    if (id) models.push(id);
  }

  return NextResponse.json({ count: models.length, models });
}
