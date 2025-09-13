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

const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET; // e.g. "<project-id>.appspot.com"

// Normalize private key (handle escaped newlines if env vars aren't fixed upstream)
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

// Export singletons bound to the Admin app
export const adminDb = getFirestore(app);
export const adminBucket = getStorage(app).bucket();
