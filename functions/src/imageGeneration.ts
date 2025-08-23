// functions/src/imageGeneration.ts
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'node:buffer';

// Your local wrapper for the model
import { ai, type Part } from './genkit';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

interface GenerateImageRequestData {
  description?: string;
  sketchDataUrl?: string;
}

export const generateNarratumImage = functions
  .region('us-central1')
  .https.onCall(async (data: GenerateImageRequestData, context) => {
    if (!context?.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = context.auth.uid;
    const description = data.description?.trim() || '';
    const sketchDataUrl = data.sketchDataUrl?.trim();

    try {
      // 1) Build prompt
      const promptParts: Part[] = [{ text: 'Generate an image for Narratum.' }];
      if (description) promptParts.push({ text: `Description: ${description}` });

      if (sketchDataUrl) {
        const m = sketchDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (m?.[1] && m?.[2]) {
          promptParts.push({ data: { mimeType: m[1], data: m[2] } as any });
        }
      }

      // 2) Call model
      const response = await ai.generate({ prompt: promptParts });

      // 3) Extract image (base64 + mime)
      let base64 = '';
      let mime = 'image/png';

      const parts = (response as any)?.output?.candidates?.[0]?.message?.parts ?? [];
      const dataPart = parts.find(
        (p: any) => p?.data?.mimeType?.startsWith?.('image/') && typeof p?.data?.data === 'string'
      );
      if (dataPart) {
        base64 = dataPart.data.data;
        mime = dataPart.data.mimeType || mime;
      } else {
        const alt = parts.find((p: any) => p?.image?.base64Data);
        if (alt) {
          base64 = alt.image.base64Data;
          mime = alt.image.mimeType || mime;
        }
      }

      if (!base64) {
        throw new functions.https.HttpsError('internal', 'No image returned by the model.');
      }

      // 4) Save to Storage
      const buf = Buffer.from(base64, 'base64');
      const ext = (mime.split('/')[1] || 'png').toLowerCase();
      const imageId = uuidv4();
      const filePath = `narratum_images/${uid}/${imageId}.${ext}`;
      const file = bucket.file(filePath);

      await file.save(buf, { metadata: { contentType: mime } });

      // Best-effort make public (emulator may ignore)
      try { await file.makePublic(); } catch { /* ignore */ }

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
    } catch (err: any) {
      console.error('generateNarratumImage error:', err?.stack || err);
      const code: functions.https.FunctionsErrorCode =
        typeof err?.code === 'string' ? err.code : 'internal';
      throw new functions.https.HttpsError(code, err?.message || 'Image generation failed.', err?.details);
    }
  });
