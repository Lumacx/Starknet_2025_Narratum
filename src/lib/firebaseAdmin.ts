// src/lib/firebaseAdmin.ts
import 'server-only';

import { getApps, getApp, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Read secrets from server-only helper (throws if missing/invalid)
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} from './env.server';

/**
 * Prefer explicit env, but fall back to the conventional default so
 * admin.storage() has a valid bucket without extra config.
 * Example: narratum.appspot.com
 */
const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET || `${FIREBASE_PROJECT_ID}.appspot.com`;

/** Normalize private key for cases where \n are escaped in env vars. */
function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n');
}

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(FIREBASE_PRIVATE_KEY),
    }),
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });
}

const app = getAdminApp();

/** Firestore singleton */
export const adminDb = getFirestore(app);

/**
 * Storage singleton (service). Note: DO NOT call `.bucket()` here.
 * Access the bucket lazily inside handlers with `getAdminBucket()`.
 */
export const adminStorage = getStorage(app);

/**
 * Lazy accessor for the default Storage bucket.
 * Call this *inside* API route handlers / server actions to avoid
 * executing Storage calls during Next.js build/prerender.
 */
export function getAdminBucket() {
  return adminStorage.bucket(); // uses the `storageBucket` from initializeApp
}

/** Optional: expose for debugging if needed */
export const adminProjectId = FIREBASE_PROJECT_ID;
export const adminStorageBucketName = STORAGE_BUCKET;
