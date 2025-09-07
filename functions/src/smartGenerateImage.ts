// functions/src/smartGenerateImage.ts
import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import { GoogleAuth } from "google-auth-library";

const HOST = "https://us-central1-aiplatform.googleapis.com";
const PROJECT_ID = process.env.GCLOUD_PROJECT || "narratum";

const GEMINI_MODEL = "gemini-2.5-flash-image-preview";
const GEMINI_LOCATION = "us-central1";

const IMAGEN_LOCATIONS = ["us-central1"];
const IMAGEN_MODELS = [
  "imagen-4.0-fast-generate-001", "imagen-4.0-generate-001",
  "imagen-3.0-fast-generate-001", "imagen-3.0-generate-002",
];

async function getToken(): Promise<string> {
    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"], });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("Failed to obtain access token");
    return token;
}

type Part = | { text: string } | { inlineData: { mimeType: string; data: string } };

async function callGemini(opts: { prompt: string; images?: string[]; token: string; }): Promise< | { ok: true; modelUsed: string; images: string[] } | { ok: false; status: number; error: string } > {
    const { prompt, images: inputImages, token } = opts;
    const url = `${HOST}/v1/projects/${PROJECT_ID}/locations/${GEMINI_LOCATION}/publishers/google/models/${GEMINI_MODEL}:predict`; // NOTE: Using :predict endpoint for consistency
    
    const parts: Part[] = [];
    if (Array.isArray(inputImages) && inputImages.length > 0) {
        for (const imgDataUrl of inputImages) {
            if (typeof imgDataUrl !== 'string' || !imgDataUrl.startsWith('data:image/')) { continue; }
            const [header, data] = imgDataUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            parts.push({ inlineData: { mimeType, data } });
        }
    }
    parts.push({ text: prompt });

    // ▼▼▼ THE ONE-LINE FIX IS HERE ▼▼▼
    // We must wrap the contents payload in the "instances" array for the Vertex AI endpoint.
    const body = { instances: [{ contents: [{ parts }] }] };
    
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", }, body: JSON.stringify(body), });
    const text = await r.text();
    if (!r.ok) { return { ok: false, status: r.status, error: text }; }
    try {
        const data = JSON.parse(text);
        // The response structure for the :predict endpoint is different
        const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (!imageBase64) {
            return { ok: false, status: 502, error: "No image data in Gemini predict response" };
        }
        return { ok: true, modelUsed: `${GEMINI_MODEL}@${GEMINI_LOCATION}`, images: [imageBase64] };
    } catch (e: any) { return { ok: false, status: 500, error: `Invalid JSON from Gemini: ${e.message}` }; }
}

async function callImagen(opts: { prompt: string; count?: number; aspectRatio?: string; model: string; location: string; token: string; }): Promise< | { ok: true; modelUsed: string; images: string[] } | { ok: false; status: number; error: string } > {
    const { prompt, count = 1, aspectRatio, model, location, token } = opts;
    const url = `${HOST}/v1/projects/${PROJECT_ID}/locations/${location}/publishers/google/models/${model}:predict`;
    const body = { instances: [{ prompt, ...(aspectRatio ? { aspectRatio } : {}) }], parameters: { sampleCount: Math.min(Math.max(Number(count) || 1, 1), 4) }, };
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), });
    const text = await r.text();
    if (!r.ok) { return { ok: false, status: r.status, error: text }; }
    try {
        const data = JSON.parse(text);
        const preds = data.predictions || [];
        let images: string[] = preds.map((p: any) => p?.bytesBase64Encoded).filter(Boolean);
        if (!images.length && preds[0]?.generatedImages) { images = (preds[0].generatedImages || []).map((g: any) => g?.image?.imageBytes).filter(Boolean); }
        if (!images.length) { return { ok: false, status: 502, error: "No image bytes in response" }; }
        return { ok: true, modelUsed: `${model}@${location}`, images };
    } catch { return { ok: false, status: 500, error: "Invalid JSON from Vertex" }; }
}

export const smartGenerateImage = onRequest( { region: "us-central1", timeoutSeconds: 120, memory: "1GiB", serviceAccount: "vertex-runner@narratum.iam.gserviceaccount.com", }, async (req: Request, res: Response): Promise<void> => {
    try {
        const body = req.body as any;
        const prompt = (req.query.prompt || body?.prompt || "").toString();
        const count = Number(req.query.count || body?.count || 1);
        const arRaw = (req.query.aspectRatio || body?.aspectRatio || "").toString().trim();
        const aspectRatio = arRaw || undefined;
        const inputImages = body?.images as string[] | undefined;
        if (!prompt) { res.status(400).json({ error: "Missing prompt" }); return; }
        const token = await getToken();
        console.log("Attempting primary generation with Gemini...");
        const geminiResult = await callGemini({ prompt, images: inputImages, token });
        if (geminiResult.ok) {
            console.log("Success with Gemini:", geminiResult.modelUsed);
            res.status(200).json({ model: geminiResult.modelUsed, images: geminiResult.images, });
            return;
        } else {
            console.warn(`Gemini attempt failed: ${geminiResult.status} ${String(geminiResult.error).slice(0, 200)}`);
        }
        console.log("Falling back to Imagen models...");
        for (const location of IMAGEN_LOCATIONS) {
            for (const model of IMAGEN_MODELS) {
                const out = await callImagen({ prompt, count, aspectRatio, model, location, token });
                if (out.ok) {
                    console.log("Success with Imagen fallback:", out.modelUsed);
                    res.status(200).json({ model: out.modelUsed, images: out.images, });
                    return;
                }
                if (![403, 404].includes(out.status)) {
                    console.warn(`Imagen failed ${model}@${location}: ${out.status} ${String(out.error).slice(0, 200)}`);
                }
            }
        }
        res.status(503).json({ error: "All image-generation models failed or were unavailable for this project/region.", });
    } catch (e: any) {
        console.error("Critical error in smartGenerateImage:", e);
        res.status(500).json({ error: e?.message || "Internal error" });
    }
});