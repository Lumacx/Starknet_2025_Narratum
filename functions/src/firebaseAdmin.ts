// functions/src/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

/** ── Resolve runtime config (available in prod) ───────────────────────────── */
const runtimeConfig = (() => {
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG ?? "{}");
  } catch {
    return {};
  }
})() as { projectId?: string; storageBucket?: string };

/** ── Project & bucket resolution (works in emulator + prod + app hosting) ─── */
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  runtimeConfig.projectId ||
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  "narratum"; // final fallback; adjust if your project id differs

// Allow override from env (recommended to set in apphosting.yaml)
const resolvedBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  runtimeConfig.storageBucket ||
  `${projectId}.appspot.com`;

/** ── Prefer explicit SA creds via base64 when provided, else ADC ──────────── */
const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || "";
const privateKey = pkB64 ? Buffer.from(pkB64, "base64").toString("utf8") : undefined;

const app =
  getApps().length
    ? getApps()[0]
    : initializeApp(
        privateKey
          ? {
              credential: cert({
                projectId:
                  process.env.FIREBASE_PROJECT_ID ||
                  runtimeConfig.projectId ||
                  projectId,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey,
              }),
              storageBucket: resolvedBucket,
            }
          : {
              credential: applicationDefault(),
              storageBucket: resolvedBucket,
            }
      );

/** ── Shared singletons ───────────────────────────────────────────────────── */
export const db = getFirestore(app);
export const adminAuth = getAuth(app);
export const storage = getStorage(app);
/** Use this everywhere instead of calling getStorage().bucket() inline */
export const bucket = storage.bucket(resolvedBucket);

/** ── Handy re-exports ────────────────────────────────────────────────────── */
export { FieldValue, Timestamp };
