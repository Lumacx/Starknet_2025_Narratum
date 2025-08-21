"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNarratumImage = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const uuid_1 = require("uuid");
const node_buffer_1 = require("node:buffer");
const data_connect_1 = require("@firebase/data-connect");
const default_connector_1 = require("@firebasegen/default-connector");
// Wrapper local basado en @google/generative-ai
const genkit_1 = require("./genkit");
if (!admin.apps.length)
    admin.initializeApp();
const storage = admin.storage();
const bucket = storage.bucket();
// Singleton para Data Connect con ConnectorConfig
let dcClient = null;
function getDcClient() {
    if (!dcClient)
        dcClient = (0, data_connect_1.getDataConnect)(default_connector_1.connectorConfig);
    return dcClient;
}
exports.generateNarratumImage = functions
    .region('us-central1')
    .https.onCall(async (data, context) => {
    if (!context?.auth?.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const userId = context.auth.uid;
    const description = data.description?.trim();
    const sketchDataUrl = data.sketchDataUrl?.trim();
    try {
        // 1) Construir prompt
        const promptParts = [{ text: 'Generate an image for Narratum.' }];
        if (description)
            promptParts.push({ text: `Description: ${description}` });
        if (sketchDataUrl) {
            const m = sketchDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
            if (m?.[1] && m?.[2]) {
                promptParts.push({ data: { mimeType: m[1], data: m[2] } });
            }
            else {
                console.warn('sketchDataUrl is not a valid data URI; ignoring.');
            }
        }
        // 2) Llamar al modelo
        const response = await genkit_1.ai.generate({ prompt: promptParts });
        // 3) Extraer imagen (base64 + mimetype)
        let raw = '';
        let mime = 'image/png';
        const outputParts = response?.output?.candidates?.[0]?.message?.parts ?? [];
        const dataPart = outputParts.find((p) => p?.data?.mimeType?.startsWith?.('image/') && typeof p?.data?.data === 'string');
        if (dataPart) {
            raw = dataPart.data.data;
            mime = dataPart.data.mimeType || mime;
        }
        else {
            const alt = outputParts.find((p) => p?.image?.base64Data);
            if (alt) {
                raw = alt.image.base64Data;
                mime = alt.image.mimeType || mime;
            }
        }
        if (!raw) {
            console.error('No image data returned by model:', JSON.stringify(response?.output ?? {}, null, 2));
            throw new functions.https.HttpsError('internal', 'No image returned by the model.');
        }
        // 4) Guardar en Storage y hacer público
        const buf = node_buffer_1.Buffer.from(raw, 'base64');
        const ext = (mime.split('/')[1] || 'png').toLowerCase();
        const imageId = (0, uuid_1.v4)();
        const filePath = `narratum_images/${userId}/${imageId}.${ext}`;
        const file = bucket.file(filePath);
        // Guardar (sin "public: true": no existe en save)
        await file.save(buf, { metadata: { contentType: mime } });
        // Hacer público (en prod). En emulador puede no aplicar: lo ignoramos si falla.
        try {
            await file.makePublic();
        }
        catch (e) {
            console.warn('makePublic() failed (likely emulator). Continuing...');
        }
        const publicUrl = file.publicUrl();
        // 5) Registrar metadata en Data Connect
        const dc = getDcClient();
        await dc.run({
            connector: default_connector_1.connectorConfig.connector,
            operation: 'aIGeneratedImage_insert',
            variables: {
                imageId,
                userId,
                promptText: description || '',
                sketchUrl: sketchDataUrl || null,
                generatedImageUrl: publicUrl
            }
        });
        return { imageUrl: publicUrl, imageId };
    }
    catch (err) {
        console.error('generateNarratumImage error:', err?.stack || err);
        const code = typeof err?.code === 'string' ? err.code : 'internal';
        throw new functions.https.HttpsError(code, err?.message || 'Image generation failed.', err?.details);
    }
});
//# sourceMappingURL=imageGeneration.js.map