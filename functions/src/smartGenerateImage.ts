// functions/src/smartGenerateImage.ts
import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import { GoogleAuth } from "google-auth-library";

const HOST = "https://us-central1-aiplatform.googleapis.com";
const PROJECT_ID = process.env.GCLOUD_PROJECT || "narratum";
const SERVICE_ACCOUNT = "vertex-runner@narratum.iam.gserviceaccount.com";

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
interface VertexPredictResponse {
  predictions?: [{ bytesBase64Encoded?: string }];
}

async function getToken(): Promise<string> {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Failed to obtain access token");
  return token;
}

// =======================================================================
// 1. DEDICATED GEMINI (NANO BANANA) FUNCTION
// =======================================================================
export const generateWithGemini = onRequest(
  { region: "us-central1", timeoutSeconds: 120, memory: "1GiB", serviceAccount: SERVICE_ACCOUNT },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { prompt, images: inputImages } = req.body as { prompt: string; images?: string[] };
      if (!prompt) {
        res.status(400).json({ error: "Missing prompt" });
        return;
      }
      const token = await getToken();
      
      // Using the specific, versioned model ID that we proved works for your project.
      const model = "gemini-2.5-flash-image-preview-001";
      
      const url = `${HOST}/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${model}:predict`;
      
      const parts: GeminiPart[] = [];
      if (Array.isArray(inputImages)) {
        for (const imgDataUrl of inputImages) {
          if (imgDataUrl && imgDataUrl.startsWith('data:image/')) {
            const [header, data] = imgDataUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            parts.push({ inlineData: { mimeType, data } });
          }
        }
      }
      parts.push({ text: prompt });
      const body = { instances: [{ contents: [{ parts }] }] };
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const errorText = await r.text();
        console.error(`Gemini API error ${r.status}:`, errorText);
        res.status(r.status).json({ error: "Gemini API failed", details: errorText });
        return;
      }
      const data = await r.json() as VertexPredictResponse;
      const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!imageBase64) {
        throw new Error("No image data in Gemini response");
      }
      // Return a clean model name to the UI for display consistency.
      res.status(200).json({ model: "gemini-2.5-flash-image-preview", images: [imageBase64] });
    } catch (e: any) {
      console.error("Critical error in generateWithGemini:", e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  }
);

// =======================================================================
// 2. DEDICATED IMAGEN (FALLBACK) FUNCTION
// =======================================================================
const IMAGEN_MODELS = [
  "imagen-4.0-fast-generate-001", "imagen-4.0-generate-001",
  "imagen-3.0-fast-generate-001", "imagen-3.0-generate-002",
];
export const generateWithImagen = onRequest(
  { region: "us-central1", timeoutSeconds: 120, memory: "1GiB", serviceAccount: SERVICE_ACCOUNT },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { prompt, count = 1, aspectRatio } = req.body as { prompt: string; count?: number; aspectRatio?: string };
      if (!prompt) {
        res.status(400).json({ error: "Missing prompt" });
        return;
      }
      const token = await getToken();
      for (const model of IMAGEN_MODELS) {
        const url = `${HOST}/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${model}:predict`;
        const body = {
          instances: [{ prompt, ...(aspectRatio ? { aspectRatio } : {}) }],
          parameters: { sampleCount: Math.min(Math.max(Number(count) || 1, 1), 4) },
        };
        const r = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (r.ok) {
          const data = await r.json() as VertexPredictResponse;
          const images = data.predictions?.map((p: any) => p?.bytesBase64Encoded).filter(Boolean);
          if (images?.length) {
            res.status(200).json({ model: `${model}@us-central1`, images });
            return;
          }
        }
      }
      res.status(503).json({ error: "All Imagen models were unavailable." });
    } catch (e: any) {
      console.error("Critical error in generateWithImagen:", e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  }
);