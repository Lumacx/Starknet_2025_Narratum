"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithImagen = exports.generateWithGemini = void 0;
// functions/src/smartGenerateImage.ts
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const generative_ai_1 = require("@google/generative-ai");
const google_auth_library_1 = require("google-auth-library");
// --- Common Configuration ---
const HOST = "https://us-central1-aiplatform.googleapis.com";
const PROJECT_ID = process.env.GCLOUD_PROJECT || "narratum";
const SERVICE_ACCOUNT = "vertex-runner@narratum.iam.gserviceaccount.com";
// --- Authentication Helper for Imagen ---
async function getToken() {
    const auth = new google_auth_library_1.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    if (!token)
        throw new Error("Failed to obtain access token");
    return token;
}
// =======================================================================
// 1. FINAL, CORRECTED GEMINI (NANO BANANA) FUNCTION
// =======================================================================
const GEMINI_API_KEY = (0, params_1.defineSecret)("GEMINI_API_KEY");
exports.generateWithGemini = (0, https_1.onRequest)({ region: "us-central1", timeoutSeconds: 120, memory: "1GiB", invoker: "public", secrets: [GEMINI_API_KEY] }, async (req, res) => {
    try {
        const { prompt, images: inputImages } = req.body;
        if (!prompt) {
            res.status(400).json({ error: "Missing prompt" });
            return;
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY.value());
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-image-preview",
        });
        const imageParts = (inputImages ?? [])
            .filter(img => img && img.startsWith('data:image/'))
            .map(imgDataUrl => {
            const [header, data] = imgDataUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            return { inlineData: { data, mimeType } };
        });
        const contents = [
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
    }
    catch (e) {
        console.error("Critical error in generateWithGemini:", e);
        res.status(500).json({ error: e.message || "Internal server error" });
    }
});
// =======================================================================
// 2. DEDICATED IMAGEN (FALLBACK) FUNCTION
// =======================================================================
const IMAGEN_MODELS = ["imagen-4.0-fast-generate-001", "imagen-4.0-generate-001", "imagen-3.0-fast-generate-001", "imagen-3.0-generate-002",];
exports.generateWithImagen = (0, https_1.onRequest)({ region: "us-central1", timeoutSeconds: 120, memory: "1GiB", serviceAccount: SERVICE_ACCOUNT, invoker: "public" }, async (req, res) => {
    try {
        const { prompt, count = 1, aspectRatio } = req.body;
        if (!prompt) {
            res.status(400).json({ error: "Missing prompt" });
            return;
        }
        const token = await getToken();
        for (const model of IMAGEN_MODELS) {
            const url = `${HOST}/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${model}:predict`;
            const body = { instances: [{ prompt, ...(aspectRatio ? { aspectRatio } : {}) }], parameters: { sampleCount: Math.min(Math.max(Number(count) || 1, 1), 4) }, };
            const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), });
            if (r.ok) {
                const data = await r.json();
                const images = data.predictions?.map((p) => p?.bytesBase64Encoded).filter(Boolean);
                if (images?.length) {
                    res.status(200).json({ model: `${model}@us-central1`, images });
                    return;
                }
            }
        }
        res.status(503).json({ error: "All Imagen models were unavailable." });
    }
    catch (e) {
        console.error("Critical error in generateWithImagen:", e);
        res.status(500).json({ error: e.message || "Internal server error" });
    }
});
//# sourceMappingURL=smartGenerateImage.js.map