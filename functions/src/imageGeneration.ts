import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'node:buffer';

import { getDataConnect, type DataConnect } from '@firebase/data-connect';
import { connectorConfig } from '@firebasegen/default-connector';

// Wrapper local basado en @google/generative-ai
import { ai, type Part } from './genkit';

if (!admin.apps.length) admin.initializeApp();

const storage = admin.storage();
const bucket = storage.bucket();

// Singleton para Data Connect con ConnectorConfig
let dcClient: DataConnect | null = null;
function getDcClient(): DataConnect {
  if (!dcClient) dcClient = getDataConnect(connectorConfig);
  return dcClient;
}

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

    const userId = context.auth.uid;
    const description = data.description?.trim();
    const sketchDataUrl = data.sketchDataUrl?.trim();

    try {
      // 1) Construir prompt
      const promptParts: Part[] = [{ text: 'Generate an image for Narratum.' }];
      if (description) promptParts.push({ text: `Description: ${description}` });

      if (sketchDataUrl) {
        const m = sketchDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (m?.[1] && m?.[2]) {
          promptParts.push({ data: { mimeType: m[1], data: m[2] } as any });
        } else {
          console.warn('sketchDataUrl is not a valid data URI; ignoring.');
        }
      }

      // 2) Llamar al modelo
      const response = await ai.generate({ prompt: promptParts });

      // 3) Extraer imagen (base64 + mimetype)
      let raw = '';
      let mime = 'image/png';

      const outputParts = (response as any)?.output?.candidates?.[0]?.message?.parts ?? [];
      const dataPart = outputParts.find(
        (p: any) => p?.data?.mimeType?.startsWith?.('image/') && typeof p?.data?.data === 'string'
      );
      if (dataPart) {
        raw = dataPart.data.data;
        mime = dataPart.data.mimeType || mime;
      } else {
        const alt = outputParts.find((p: any) => p?.image?.base64Data);
        if (alt) {
          raw = alt.image.base64Data;
          mime = alt.image.mimeType || mime;
        }
      }

      if (!raw) {
        console.error('No image data returned by model:', JSON.stringify((response as any)?.output ?? {}, null, 2));
        throw new functions.https.HttpsError('internal', 'No image returned by the model.');
      }

      // 4) Guardar en Storage y hacer público
      const buf = Buffer.from(raw, 'base64');
      const ext = (mime.split('/')[1] || 'png').toLowerCase();
      const imageId = uuidv4();
      const filePath = `narratum_images/${userId}/${imageId}.${ext}`;

      const file = bucket.file(filePath);

      // Guardar (sin "public: true": no existe en save)
      await file.save(buf, { metadata: { contentType: mime } });

      // Hacer público (en prod). En emulador puede no aplicar: lo ignoramos si falla.
      try {
        await file.makePublic();
      } catch (e) {
        console.warn('makePublic() failed (likely emulator). Continuing...');
      }

      const publicUrl = file.publicUrl();

      // 5) Registrar metadata en Data Connect
      const dc = getDcClient();
      await (dc as any).run({
        connector: connectorConfig.connector,
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
    } catch (err: any) {
      console.error('generateNarratumImage error:', err?.stack || err);
      const code: functions.https.FunctionsErrorCode =
        typeof err?.code === 'string' ? err.code : 'internal';
      throw new functions.https.HttpsError(
        code,
        err?.message || 'Image generation failed.',
        err?.details
      );
    }
  });
