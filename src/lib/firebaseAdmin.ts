// src/lib/firebaseAdmin.ts
import 'server-only';

import { getApps, initializeApp, applicationDefault, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/** Normalize PEM: trim quotes and convert escaped newlines (CRLF/LF). */
function normalizePrivateKey(key: string): string {
  const trimmed = key.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return trimmed.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
}

/** Resolve project/bucket from env, with sensible fallbacks. */
function resolveProjectId(): string | undefined {
  return process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
}
function resolveStorageBucket(projectId?: string): string | undefined {
  // The actual bucket name is still appspot.com (the public domain may be firebasestorage.app)
  return process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : undefined);
}

/** Lazily obtain (or create) the Admin app singleton. */
export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = resolveProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || undefined;

  // Prefer explicit private key, else try base64
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  if (!privateKey && process.env.FIREBASE_PRIVATE_KEY_BASE64) {
    try {
      privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
    } catch {
      // ignore — will fall back to ADC below
    }
  }
  if (privateKey) privateKey = normalizePrivateKey(privateKey);

  const storageBucket = resolveStorageBucket(projectId);

  // If we have explicit SA creds, use them; else fall back to ADC.
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
      storageBucket,
    });
  }

  // Application Default Credentials (e.g., App Hosting/Cloud or local gcloud auth)
  const options: Parameters<typeof initializeApp>[0] = {
    credential: applicationDefault(),
  };
  if (projectId) options.projectId = projectId;
  if (storageBucket) options.storageBucket = storageBucket;

  return initializeApp(options);
}

/** Lazy helpers — use inside API routes/server actions only. */
export function getAdminDb() {
  return getFirestore(getAdminApp());
}
export function getAdminStorage() {
  return getStorage(getAdminApp());
}
export function getAdminBucket() {
  return getAdminStorage().bucket(); // uses storageBucket from initializeApp, if provided
}

/** Optional env introspection (non-throwing) */
export function getAdminProjectId(): string | undefined {
  return resolveProjectId();
}
export function getAdminStorageBucketName(): string | undefined {
  return resolveStorageBucket(resolveProjectId());
}

export { FieldValue, Timestamp };
