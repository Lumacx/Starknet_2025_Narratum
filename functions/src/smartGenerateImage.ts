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

// =======================================================================
// REVERTED & CORRECTED: Function to call the Gemini API
// =======================================================================
async function callGemini(opts: { prompt: string; images?: string[]; token: string; }): Promise< | { ok: true; modelUsed: string; images: string[] } | { ok: false; status: number; error: string } > {
    const { prompt, images: inputImages, token } = opts;
    
    // REVERTED to the correct :generateContent endpoint
    const url = `${HOST}/v1/projects/${PROJECT_ID}/locations/${GEMINI_LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;

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

    // REVERTED to the correct body format for :generateContent (no "instances" wrapper)
    const body = { contents: [{ parts }] };

    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", }, body: JSON.stringify(body), });
    const text = await r.text();
    if (!r.ok) { return { ok: false, status: r.status, error: text }; }
    
    try {
        const data = JSON.parse(text);
        // REVERTED to the correct response parsing for :generateContent
        const imageParts = data.candidates?.[0]?.content?.parts?.filter((p: any) => p.inlineData) || [];
        const images = imageParts.map((p: any) => p.inlineData.data).filter(Boolean);
        if (!images.length) { return { ok: false, status: 502, error: "No image data in Gemini response" }; }
        return { ok: true, modelUsed: `${GEMINI_MODEL}@${GEMINI_LOCATION}`, images };
    } catch (e: any) { return { ok: false, status: 500, error: `Invalid JSON from Gemini: ${e.message}` }; }
}

// =======================================================================
// Main handler with FALLBACK DISABLED
// =======================================================================
export const smartGenerateImage = onRequest( { region: "us-central1", timeoutSeconds: 120, memory: "1GiB", serviceAccount: "vertex-runner@narratum.iam.gserviceaccount.com", }, async (req: Request, res: Response): Promise<void> => {
    try {
        const body = req.body as any;
        const prompt = (req.query.prompt || body?.prompt || "").toString();
        const inputImages = body?.images as string[] | undefined;
        if (!prompt) { res.status(400).json({ error: "Missing prompt" }); return; }
        const token = await getToken();
        
        console.log("Forcing primary generation with Gemini (fallback disabled)...");
        const geminiResult = await callGemini({ prompt, images: inputImages, token });
        
        if (geminiResult.ok) {
            console.log("Success with Gemini:", geminiResult.modelUsed);
            res.status(200).json({
                model: geminiResult.modelUsed,
                images: geminiResult.images,
            });
            return;
        } 
        
        console.error("--- GEMINI API CALL FAILED (NO FALLBACK) ---");
        console.error("Status Code:", geminiResult.status);
        try {
            const errorJson = JSON.parse(geminiResult.error);
            console.error("Full Error Response (JSON):", JSON.stringify(errorJson, null, 2));
        } catch {
            console.error("Full Error Response (Raw Text):", geminiResult.error);
        }
        console.error("--------------------------------------------");
        
        res.status(500).json({
            error: "Primary Gemini model failed and fallback is disabled.",
            details: geminiResult.error
        });

    } catch (e: any) {
        console.error("Critical error in smartGenerateImage:", e);
        res.status(500).json({ error: e?.message || "Internal error" });
    }
});