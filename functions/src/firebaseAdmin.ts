// functions/src/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// Prefer explicit SA creds via base64 when provided, else fall back to ADC
const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || "";
const privateKey = pkB64 ? Buffer.from(pkB64, "base64").toString("utf8") : undefined;

const app =
  getApps().length
    ? getApps()[0]
    : initializeApp(
        privateKey
          ? {
              credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey,
              }),
            }
          : { credential: applicationDefault() }
      );

// Shared singletons
export const db = getFirestore(app);
export const adminAuth = getAuth(app);
export const storage = getStorage(app);

// Handy re-exports so you don't import firebase-admin/* in every file
export { FieldValue, Timestamp };
