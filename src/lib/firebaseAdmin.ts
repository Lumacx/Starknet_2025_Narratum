// src/lib/firebaseAdmin.ts
import 'server-only';

import { getApps, getApp, initializeApp, applicationDefault, cert, type App } from 'firebase-admin/app';
//import { getFirestore } from 'firebase-admin/firestore';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/** Normalize PEM: trim quotes and convert escaped newlines. */
function normalizePrivateKey(key: string): string {
  // remove surrounding quotes if present
  const trimmed = key.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return trimmed.replace(/\\n/g, '\n');
}

/** Resolve project/bucket from env, with sensible fallbacks. */
function resolveProjectId(): string | undefined {
  return process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
}
function resolveStorageBucket(projectId?: string): string | undefined {
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
      storageBucket, // okay if undefined
    });
  }

  // Application Default Credentials (e.g., Cloud env or local gcloud auth)
  return initializeApp({
    credential: applicationDefault(),
    projectId,      // hint if available
    storageBucket,  // hint if available
  });
}

/** Lazy helpers — use inside API routes/server actions only. */
export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}

export function getAdminBucket() {
  const app = getAdminApp();
  const storage = getStorage(app);
  return storage.bucket(); // uses storageBucket from initializeApp, if provided
}

/** Optional env introspection (non-throwing) */
export function getAdminProjectId(): string | undefined {
  return resolveProjectId();
}
export function getAdminStorageBucketName(): string | undefined {
  return resolveStorageBucket(resolveProjectId());
}

export { FieldValue, Timestamp };