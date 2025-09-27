// src/lib/firebase.ts
// Client SDK only. If imported on the server by mistake, we export typed stubs
// so TS is happy, and we throw on *use* (not on import).

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth as FirebaseAuthType } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator, type Database } from 'firebase/database';

const isBrowser = typeof window !== 'undefined';

/* ---------- read config (from env or FIREBASE_WEBAPP_CONFIG) ---------- */
let webAppCfg: any = {};
try {
  if (process.env.FIREBASE_WEBAPP_CONFIG) {
    webAppCfg = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
  }
} catch { /* ignore */ }

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || webAppCfg.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || webAppCfg.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || webAppCfg.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || webAppCfg.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || webAppCfg.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || webAppCfg.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || webAppCfg.measurementId,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || webAppCfg.databaseURL,
};

/* ---------- server stubs (never used in 'use client' components) ---------- */
function throwOnUse(name: string): never {
  throw new Error(`'${name}' is a client-only Firebase SDK export. Import this module only in client components.`);
}
// typed stubs so TS sees non-optional types on the server
const serverApp     = null as unknown as FirebaseApp;
const serverAuth    = new Proxy({}, { get: () => throwOnUse('auth') }) as unknown as FirebaseAuthType;
const serverFuncs   = new Proxy({}, { get: () => throwOnUse('functions') }) as unknown as Functions;
const serverDb      = new Proxy({}, { get: () => throwOnUse('db') }) as unknown as Firestore;
const serverStorage = new Proxy({}, { get: () => throwOnUse('storage') }) as unknown as FirebaseStorage;
const serverRtdb    = new Proxy({}, { get: () => throwOnUse('rtdb') }) as unknown as Database;

/* ---------- real instances in the browser ---------- */
let app: FirebaseApp;
let auth: FirebaseAuthType;
let functions: Functions;
let db: Firestore;
let storage: FirebaseStorage;
let rtdb: Database;

if (isBrowser) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  functions = getFunctions(app);
  db = getFirestore(app);
  storage = getStorage(app);
  rtdb = getDatabase(app);

  const useEmulators =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== 'false';

  if (useEmulators) {
    const host = '127.0.0.1';
    const authPort = parseInt(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099', 10);
    const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10);
    const functionsPort = parseInt(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || '5001', 10);
    const storagePort = parseInt(process.env.NEXT_PUBLIC_STORAGE_EMULATOR_PORT || '9199', 10);
    const rtdbPort = parseInt(process.env.NEXT_PUBLIC_RTDB_EMULATOR_PORT || '9000', 10);

    const emulatorOptions = { disableWarnings: true as const };

    const extendedAuth = auth as FirebaseAuthType & { emulatorConfig?: unknown };
    if (!extendedAuth.emulatorConfig) {
      try { connectAuthEmulator(auth, `http://${host}:${authPort}`, emulatorOptions); } catch {}
    }
    try { connectFirestoreEmulator(db, host, firestorePort); } catch {}
    try { connectFunctionsEmulator(functions, host, functionsPort); } catch {}
    try { connectStorageEmulator(storage, host, storagePort); } catch {}
    try { connectDatabaseEmulator(rtdb, host, rtdbPort); } catch {}
  }
} else {
  // server: assign stubs
  app = serverApp;
  auth = serverAuth;
  functions = serverFuncs;
  db = serverDb;
  storage = serverStorage;
  rtdb = serverRtdb;
}

export const firestoreAppId = firebaseConfig.appId || 'default-app-id';
export const firebaseProjectId = firebaseConfig.projectId || 'unknown-project';
export { app, auth, db, functions, storage, rtdb };
export default app;
