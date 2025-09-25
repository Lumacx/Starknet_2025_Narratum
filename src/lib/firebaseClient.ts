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

/** Prefer App Hosting's baked JSON; fall back to NEXT_PUBLIC_* for local dev. */
function getWebConfig() {
  const baked = process.env.FIREBASE_WEBAPP_CONFIG; // injected at BUILD in App Hosting
  if (baked) {
    try { return JSON.parse(baked); } catch { /* ignore and fall back */ }
  }
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

/** Get (or create) the client Firebase app — only in the browser. */
export function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    // Guard: never initialize the client SDK during SSR or build
    throw new Error('getFirebaseApp() called on the server. Use Admin SDK on the server.');
  }
  if (_app) return _app;
  const existing = getApps();
  _app = existing.length ? existing[0] : initializeApp(getWebConfig());
  return _app!;
}

/** Lazy getters (client only). */
export function getClientAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('getClientAuth() called on the server.');
  }
  if (_auth) return _auth;
  _auth = _getAuth(getFirebaseApp());
  return _auth!;
}

export function getClientDb(): Firestore {
  if (typeof window === 'undefined') {
    throw new Error('getClientDb() called on the server.');
  }
  if (_db) return _db;
  _db = _getFirestore(getFirebaseApp());
  return _db!;
}

export function getClientStorage(): FirebaseStorage {
  if (typeof window === 'undefined') {
    throw new Error('getClientStorage() called on the server.');
  }
  if (_storage) return _storage;
  _storage = _getStorage(getFirebaseApp());
  return _storage!;
}

/**
 * Optional: Call this from a client-side effect (e.g., in your AuthProvider)
 * to ensure a signed-in user is present in dev. Never auto sign-in during SSR.
 */
export function ensureAnonAuth({ enableInProd = false } = {}) {
  if (typeof window === 'undefined') return;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !enableInProd) return;

  const auth = getClientAuth();
  onAuthStateChanged(auth, (u) => {
    if (!u) signInAnonymously(auth).catch(console.error);
  });
}
