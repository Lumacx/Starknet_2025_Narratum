// src/lib/firebaseClient.ts
// Client-only Firebase Web SDK helpers (SSR-safe, lazy-initialized)

import type { FirebaseApp } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getAuth as _getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore as _getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage as _getStorage, type FirebaseStorage } from 'firebase/storage';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

const isBrowser = () => typeof window !== 'undefined';

/** Prefer App Hosting's baked JSON; fall back to NEXT_PUBLIC_* for local dev. */
function getWebConfig() {
  // NOTE: process.env values are replaced at build time, so this is safe in the client bundle.
  const baked = process.env.FIREBASE_WEBAPP_CONFIG; // set by Firebase App Hosting build
  if (baked) {
    try {
      return JSON.parse(baked);
    } catch {
      // ignore and fall back
    }
  }
  // Local/dev & general fallback (NEXT_PUBLIC_* are exposed to client)
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  };
}

/**
 * Strict: Get (or create) the client Firebase app — only in the browser.
 * Throws if called on the server (so you don’t accidentally use client SDK in server code).
 */
export function getFirebaseApp(): FirebaseApp {
  if (!isBrowser()) {
    throw new Error('getFirebaseApp() called on the server. Use Admin SDK on the server.');
  }
  if (_app) return _app;
  const apps = getApps();
  _app = apps.length ? apps[0] : initializeApp(getWebConfig());
  return _app!;
}

/** Strict client-only getters (throw on server). */
export function getClientAuth(): Auth {
  if (!isBrowser()) throw new Error('getClientAuth() called on the server.');
  if (_auth) return _auth;
  _auth = _getAuth(getFirebaseApp());
  return _auth!;
}

export function getClientDb(): Firestore {
  if (!isBrowser()) throw new Error('getClientDb() called on the server.');
  if (_db) return _db;
  _db = _getFirestore(getFirebaseApp());
  return _db!;
}

export function getClientStorage(): FirebaseStorage {
  if (!isBrowser()) throw new Error('getClientStorage() called on the server.');
  if (_storage) return _storage;
  _storage = _getStorage(getFirebaseApp());
  return _storage!;
}

/**
 * Soft (SSR-safe) variants — return null on the server instead of throwing.
 * Use these in code paths that might run during prerender/SSR but are guarded at runtime.
 */
export function tryGetFirebaseApp(): FirebaseApp | null {
  if (!isBrowser()) return null;
  try {
    return getFirebaseApp();
  } catch {
    return null;
  }
}
export function tryGetClientAuth(): Auth | null {
  if (!isBrowser()) return null;
  try {
    return getClientAuth();
  } catch {
    return null;
  }
}
export function tryGetClientDb(): Firestore | null {
  if (!isBrowser()) return null;
  try {
    return getClientDb();
  } catch {
    return null;
  }
}
export function tryGetClientStorage(): FirebaseStorage | null {
  if (!isBrowser()) return null;
  try {
    return getClientStorage();
  } catch {
    return null;
  }
}

/**
 * Optional: call from a client-side effect (e.g., in your AuthProvider)
 * to ensure a signed-in user in dev. Never auto sign-in during SSR.
 */
export function ensureAnonAuth({ enableInProd = false } = {}) {
  if (!isBrowser()) return;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !enableInProd) return;

  const auth = getClientAuth();
  onAuthStateChanged(auth, (u) => {
    if (!u) signInAnonymously(auth).catch(console.error);
  });
}
