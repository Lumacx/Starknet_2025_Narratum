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
// functions/src/imageGeneration.ts
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const uuid_1 = require("uuid");
const node_buffer_1 = require("node:buffer");
// Your local wrapper for the model
const genkit_1 = require("./genkit");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();
exports.generateNarratumImage = functions
    .region('us-central1')
    .https.onCall(async (data, context) => {
    if (!context?.auth?.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const uid = context.auth.uid;
    const description = data.description?.trim() || '';
    const sketchDataUrl = data.sketchDataUrl?.trim();
    try {
        // 1) Build prompt
        const promptParts = [{ text: 'Generate an image for Narratum.' }];
        if (description)
            promptParts.push({ text: `Description: ${description}` });
        if (sketchDataUrl) {
            const m = sketchDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
            if (m?.[1] && m?.[2]) {
                promptParts.push({ data: { mimeType: m[1], data: m[2] } });
            }
        }
        // 2) Call model
        const response = await genkit_1.ai.generate({ prompt: promptParts });
        // 3) Extract image (base64 + mime)
        let base64 = '';
        let mime = 'image/png';
        const parts = response?.output?.candidates?.[0]?.message?.parts ?? [];
        const dataPart = parts.find((p) => p?.data?.mimeType?.startsWith?.('image/') && typeof p?.data?.data === 'string');
        if (dataPart) {
            base64 = dataPart.data.data;
            mime = dataPart.data.mimeType || mime;
        }
        else {
            const alt = parts.find((p) => p?.image?.base64Data);
            if (alt) {
                base64 = alt.image.base64Data;
                mime = alt.image.mimeType || mime;
            }
        }
        if (!base64) {
            throw new functions.https.HttpsError('internal', 'No image returned by the model.');
        }
        // 4) Save to Storage
        const buf = node_buffer_1.Buffer.from(base64, 'base64');
        const ext = (mime.split('/')[1] || 'png').toLowerCase();
        const imageId = (0, uuid_1.v4)();
        const filePath = `narratum_images/${uid}/${imageId}.${ext}`;
        const file = bucket.file(filePath);
        await file.save(buf, { metadata: { contentType: mime } });
        // Best-effort make public (emulator may ignore)
        try {
            await file.makePublic();
        }
        catch { /* ignore */ }
        const publicUrl = file.publicUrl();
        // 5) Optional: index minimal metadata in Firestore (no Data Connect)
        await db.collection('users').doc(uid).collection('aiGeneratedImages').doc(imageId).set({
            path: filePath,
            url: publicUrl,
            promptText: description,
            mediaType: mime,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
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