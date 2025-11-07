import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  function parseDataUrl(dataUrl: string) {
    const m = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!m) throw new Error('Invalid data URL format.');
    const mimeType = m[1], b64 = m[2];
    if (!mimeType.startsWith('image/')) throw new Error('Provided dataUrl is not an image.');
    return { mimeType, b64 };
  }

  async function fetchImageAsBase64(imageUrl: string) {
    const r = await fetch(imageUrl);
    if (!r.ok) throw new Error(`Failed to fetch image (${r.status})`);
    const mimeType = r.headers.get('content-type') || 'image/png';
    if (!mimeType.startsWith('image/')) throw new Error('Fetched URL did not return an image.');
    const b64 = Buffer.from(await r.arrayBuffer()).toString('base64');
    return { mimeType, b64 };
  }

export const describeImage = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const body = req.body;
        const apiKey = functions.config().gemini.key;
        if (!apiKey) {
            throw new functions.https.HttpsError('internal', 'Missing GEMINI_API_KEY');
        }

        if (!body.dataUrl && !body.imageUrl) {
            res.status(400).json({ error: 'Missing dataUrl or imageUrl' });
            return;
        }

        const lang = body.language || body.targetLanguage || 'en';
        const userPrompt = (body.prompt || '').trim();
    
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

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

        const result = await model.generateContent([finalPrompt, {inlineData: {data: b64, mimeType}}]);

        const text = result.response.text();

        if (!text) {
            throw new Error('No text returned by Gemini.');
        }

        res.json({ description: text });
    } catch (e: any) {
        console.error('describeImage error:', e?.stack || e);
        res.status(500).json({ error: e.message });
    }
});
