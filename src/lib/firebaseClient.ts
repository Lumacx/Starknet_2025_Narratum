// src/lib/firebaseClient.ts
// Client-only Firebase Web SDK helpers (SSR-safe, lazy-initialized)

import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
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

function parseJSON(value?: string): any {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/** Prefer runtime-safe NEXT_PUBLIC_* JSON, then App Hosting baked JSON, then individual NEXT_PUBLIC_* vars. */
function getWebConfig(): FirebaseOptions {
  // 1) Runtime-exposed JSON (works on any platform)
  const fromNextPublicJson = parseJSON(process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG);

  // 2) App Hosting baked JSON (BUILD-time replacement)
  const fromBakedJson = parseJSON(process.env.FIREBASE_WEBAPP_CONFIG);

  // 3) Individual NEXT_PUBLIC_* vars
  const fromIndividual: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  };

  const cfg: FirebaseOptions = {
    apiKey: fromNextPublicJson.apiKey ?? fromBakedJson.apiKey ?? fromIndividual.apiKey,
    authDomain: fromNextPublicJson.authDomain ?? fromBakedJson.authDomain ?? fromIndividual.authDomain,
    projectId: fromNextPublicJson.projectId ?? fromBakedJson.projectId ?? fromIndividual.projectId,
    storageBucket: fromNextPublicJson.storageBucket ?? fromBakedJson.storageBucket ?? fromIndividual.storageBucket,
    appId: fromNextPublicJson.appId ?? fromBakedJson.appId ?? fromIndividual.appId,
    messagingSenderId:
      fromNextPublicJson.messagingSenderId ?? fromBakedJson.messagingSenderId ?? fromIndividual.messagingSenderId,
    databaseURL: fromNextPublicJson.databaseURL ?? fromBakedJson.databaseURL ?? fromIndividual.databaseURL,
  };

  // Minimal validation to avoid cryptic "auth/invalid-api-key"
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId) {
    throw new Error(
      'Firebase web config is missing required fields (apiKey, projectId, appId). ' +
        'Provide NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG (JSON) or the individual NEXT_PUBLIC_* vars.',
    );
  }
  return cfg;
}

/** Strict: client-only app getter */
export function getFirebaseApp(): FirebaseApp {
  if (!isBrowser()) {
    throw new Error('getFirebaseApp() called on the server. Use the Admin SDK on the server.');
  }
  if (_app) return _app;
  const apps = getApps();
  _app = apps.length ? apps[0] : initializeApp(getWebConfig());
  return _app!;
}

/** Strict client-only getters */
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

/** Soft SSR-safe variants */
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

/** Optional: ensure an anonymous user during dev */
export function ensureAnonAuth({ enableInProd = false } = {}) {
  if (!isBrowser()) return;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !enableInProd) return;

  const auth = getClientAuth();
  onAuthStateChanged(auth, (u) => {
    if (!u) signInAnonymously(auth).catch(console.error);
  });
}
