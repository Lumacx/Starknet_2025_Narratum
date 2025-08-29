import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReqBody = {
  dataUrl?: string;
  imageUrl?: string;
  prompt?: string;
  language?: string;        // NEW: honor language
  targetLanguage?: string;  // alias accepted too
};

function parseDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!m) throw new Error('Invalid data URL format.');
  const mimeType = m[1], b64 = m[2];
  if (!mimeType.startsWith('image/')) throw new Error('Provided dataUrl is not an image.');
  return { mimeType, b64 };
}

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German',
  it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic',
};

function withLanguageHint(basePrompt: string, langCode?: string) {
  const label = LANG_LABELS[langCode || 'en'] || 'English';
  const header =
    langCode === 'es'
      ? 'Responde únicamente en español.\n'
      : `Respond only in ${label}.\n`;
  return `${header}${basePrompt || ''}`.trim();
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
    const body = (await req.json()) as ReqBody;

    if (!body.dataUrl && !body.imageUrl) {
      return NextResponse.json({ error: 'Missing dataUrl or imageUrl' }, { status: 400 });
    }

    const lang = body.language || body.targetLanguage || 'en';
    const userPrompt = (body.prompt || '').trim();

    // If caller didn’t send a custom prompt, default to a single-paragraph description request
    const defaultPrompt =
      lang === 'es'
        ? 'Describe esta imagen en un solo párrafo claro y conciso (sin viñetas). Concéntrate en el sujeto, el entorno, la iluminación y el estado de ánimo.'
        : 'Describe this image in one clear, concise paragraph (no bullets). Focus on subject, setting, lighting, and mood.';

    const finalPrompt = withLanguageHint(userPrompt || defaultPrompt, lang);

    const { mimeType, b64 } = body.dataUrl
      ? (() => {
          if (body.dataUrl!.length > 7_000_000) throw new Error('Image too large; use imageUrl instead.');
          return parseDataUrl(body.dataUrl!);
        })()
      : await fetchImageAsBase64(body.imageUrl!);

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      apiVersion: 'v1',
    });

    const model =
      (await pickFirstAvailableModel(ai, [
        'gemini-2.5-flash-image-preview',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ])) || 'gemini-1.5-flash';

    const res = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: b64 } } as any,
            { text: finalPrompt },
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
