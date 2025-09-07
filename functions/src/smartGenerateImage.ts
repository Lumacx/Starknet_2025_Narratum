// functions/src/smartGenerateImage.ts
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import type { Request, Response } from "express";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import { GoogleAuth } from "google-auth-library";

// --- Common Configuration ---
const HOST = "https://us-central1-aiplatform.googleapis.com";
const PROJECT_ID = process.env.GCLOUD_PROJECT || "narratum";
const SERVICE_ACCOUNT = "vertex-runner@narratum.iam.gserviceaccount.com";

// --- Type Definitions ---
interface VertexPredictResponse {
  predictions?: [{
    bytesBase64Encoded?: string
  }];
}

// --- Authentication Helper for Imagen ---
async function getToken(): Promise<string> {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Failed to obtain access token");
  return token;
}

// =======================================================================
// 1. FINAL, CORRECTED GEMINI (NANO BANANA) FUNCTION
// =======================================================================
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

export const generateWithGemini = onRequest(
  { region: "us-central1", timeoutSeconds: 120, memory: "1GiB", invoker: "public", secrets: [GEMINI_API_KEY] },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { prompt, images: inputImages } = req.body as { prompt: string; images?: string[] };
      if (!prompt) {
        res.status(400).json({ error: "Missing prompt" });
        return;
      }
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-image-preview",
      });

      const imageParts: Part[] = (inputImages ?? [])
        .filter(img => img && img.startsWith('data:image/'))
        .map(imgDataUrl => {
            const [header, data] = imgDataUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            return { inlineData: { data, mimeType } };
        });
      
      const contents: Content[] = [
          { role: 'user', parts: [...imageParts, { text: prompt }] }
      ];
      
      const result = await model.generateContent({ contents });
      const response = result.response;
      
      const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

      if (!imagePart || !imagePart.inlineData) {
        console.error("Gemini responded with text instead of an image:", response.text());
        throw new Error("The model did not return an image. It may have been blocked for safety reasons.");
      }

      res.status(200).json({
        model: "gemini-2.5-flash-image-preview",
        images: [imagePart.inlineData.data],
      });

    } catch (e: any) {
      console.error("Critical error in generateWithGemini:", e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  }
);


// =======================================================================
// 2. DEDICATED IMAGEN (FALLBACK) FUNCTION
// =======================================================================
const IMAGEN_MODELS = [ "imagen-4.0-fast-generate-001", "imagen-4.0-generate-001", "imagen-3.0-fast-generate-001", "imagen-3.0-generate-002", ];

export const generateWithImagen = onRequest(
  { region: "us-central1", timeoutSeconds: 120, memory: "1GiB", serviceAccount: SERVICE_ACCOUNT, invoker: "public" },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { prompt, count = 1, aspectRatio } = req.body as { prompt: string; count?: number; aspectRatio?: string };
      if (!prompt) { res.status(400).json({ error: "Missing prompt" }); return; }
      const token = await getToken();
      for (const model of IMAGEN_MODELS) {
        const url = `${HOST}/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${model}:predict`;
        const body = { instances: [{ prompt, ...(aspectRatio ? { aspectRatio } : {}) }], parameters: { sampleCount: Math.min(Math.max(Number(count) || 1, 1), 4) }, };
        const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), });
        if (r.ok) {
          const data = await r.json() as VertexPredictResponse;
          const images = data.predictions?.map((p: any) => p?.bytesBase64Encoded).filter(Boolean);
          if (images?.length) { res.status(200).json({ model: `${model}@us-central1`, images }); return; }
        }
      }
      res.status(503).json({ error: "All Imagen models were unavailable." });
    } catch (e: any) {
      console.error("Critical error in generateWithImagen:", e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  }
);