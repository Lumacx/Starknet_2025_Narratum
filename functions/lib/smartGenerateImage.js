"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartGenerateImage = void 0;
// functions/src/smartGenerateImage.ts
const https_1 = require("firebase-functions/v2/https");
const google_auth_library_1 = require("google-auth-library");
const HOST = "https://aiplatform.googleapis.com";
const PROJECT_ID = process.env.GCLOUD_PROJECT || "narratum";
// Regiones donde tengas habilitado Imagen
const LOCATIONS = ["us-central1"];
// Orden de fallback (puedes reordenar por calidad/velocidad)
const IMAGEN_MODELS = [
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
    "imagen-3.0-fast-generate-001",
    "imagen-3.0-generate-002",
];
async function getToken() {
    const auth = new google_auth_library_1.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    if (!token)
        throw new Error("Failed to obtain access token");
    return token;
}
async function callImagen(opts) {
    const { prompt, count = 1, aspectRatio, model, location, token } = opts;
    const url = `${HOST}/v1/projects/${PROJECT_ID}/locations/${location}/publishers/google/models/${model}:predict`;
    const body = {
        instances: [{ prompt, ...(aspectRatio ? { aspectRatio } : {}) }],
        parameters: { sampleCount: Math.min(Math.max(Number(count) || 1, 1), 4) },
    };
    const r = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const text = await r.text();
    if (!r.ok) {
        return { ok: false, status: r.status, error: text };
    }
    try {
        const data = JSON.parse(text);
        const preds = data.predictions || [];
        // Path A: bytesBase64Encoded (Imagen 4.x)
        let images = preds.map((p) => p?.bytesBase64Encoded).filter(Boolean);
        // Path B: generatedImages[].image.imageBytes (algunas variantes 3.x)
        if (!images.length && preds[0]?.generatedImages) {
            images = (preds[0].generatedImages || [])
                .map((g) => g?.image?.imageBytes)
                .filter(Boolean);
        }
        if (!images.length) {
            return { ok: false, status: 502, error: "No image bytes in response" };
        }
        return { ok: true, modelUsed: `${model}@${location}`, images };
    }
    catch {
        return { ok: false, status: 500, error: "Invalid JSON from Vertex" };
    }
}
/**
 * HTTP v2: SOLO imágenes con fallback 4.0 → 3.0
 * GET/POST /smartGenerateImage?prompt=...&count=1&aspectRatio=4:3
 */
exports.smartGenerateImage = (0, https_1.onRequest)({
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "1GiB",
    serviceAccount: "vertex-runner@narratum.iam.gserviceaccount.com",
}, async (req, res) => {
    try {
        const prompt = (req.query.prompt || req.body?.prompt || "").toString();
        const count = Number(req.query.count || req.body?.count || 1);
        const arRaw = (req.query.aspectRatio || req.body?.aspectRatio || "").toString().trim();
        const aspectRatio = arRaw || undefined;
        if (!prompt) {
            res.status(400).json({ error: "Missing prompt" });
            return;
        }
        const token = await getToken();
        // Prueba en cascada: regiones × modelos
        for (const location of LOCATIONS) {
            for (const model of IMAGEN_MODELS) {
                const out = await callImagen({ prompt, count, aspectRatio, model, location, token });
                if (out.ok) {
                    res.status(200).json({
                        model: out.modelUsed,
                        images: out.images, // base64 sin data-url
                    });
                    return;
                }
                // Ignora 403/404 (modelo no habilitado) y sigue probando
                if (![403, 404].includes(out.status)) {
                    console.warn(`Imagen failed ${model}@${location}: ${out.status} ${String(out.error).slice(0, 200)}`);
                }
            }
        }
        res.status(503).json({
            error: "No image-generation model available for this project/region.",
        });
        return;
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message || "Internal error" });
        return;
    }
});
//# sourceMappingURL=smartGenerateImage.js.map