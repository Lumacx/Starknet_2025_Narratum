import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

function buildPrompt(b: any) {
    const lang = b.language || 'en';
    const genres = (b.genres || []).join(', ') || 'Any';
    const idx = b.sceneIndex ?? 1;
  
    return `
  You are a professional story developer and visual director.
  
  Language to WRITE IN: ${lang}
  
  Story context:
  - Title: ${b.title || 'Untitled'}
  - Genres: ${genres}
  - Synopsis: ${b.synopsis || '(none)'}
  
  Task for SCENE #${idx}:
  1) Write a vivid paragraph (70–120 words) of story text, self-contained, suitable for narration.
  2) Provide ONE concise illustration prompt for an image generator (no text overlays).
  
  Return JSON ONLY with exactly:
  {
    "storyText": "<paragraph>",
    "imagePrompt": "<one-sentence prompt>"
  }
  `.trim();
  }

  function safeParseJson(s: string) {
    const cleaned = s.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}$/);
      if (!m) throw new Error('Invalid JSON from model');
      return JSON.parse(m[0]);
    }
  }

  function extractText(resp: any): string {
    // Newer shape
    if (resp?.response?.text && typeof resp.response.text === 'function') {
      return resp.response.text().trim();
    }
    // Helper on some versions
    if (typeof resp?.text === 'function') {
      return resp.text().trim();
    }
    // Candidates (older)
    const cand = resp?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof cand === 'string') return cand.trim();
    return '';
  }


export const suggestScene = functions.https.onRequest(async (req, res) => {
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

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });

        const prompt = buildPrompt(body);

        const result = await model.generateContent(prompt);
        const text = extractText(result);

        if (!text) {
            throw new functions.https.HttpsError('internal', 'Model returned no content');
        }

        const json = safeParseJson(text);

        res.json(json);
    } catch (e: any) {
        console.error('suggestScene error:', e?.stack || e);
        res.status(500).json({ error: e.message });
    }
});
