// functions/src/firebaseAdmin.ts
import * as admin from 'firebase-admin';

const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || '';
const privateKey = pkB64 ? Buffer.from(pkB64, 'base64').toString('utf8') : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: privateKey
      ? admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        })
      : admin.credential.applicationDefault(),
  });
}
