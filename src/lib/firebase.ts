// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
// ✅ NEW: Realtime Database
import { getDatabase, connectDatabaseEmulator, type Database } from 'firebase/database';
// If you need these later, re-add them; removing now to avoid unused warnings.
// import { onAuthStateChanged, signOut } from 'firebase/auth';

// ✅ type-only imports (no runtime cost)
import type { Auth as FirebaseAuthType } from 'firebase/auth';
import type { Functions } from 'firebase/functions';
import type { Firestore } from 'firebase/firestore';

// ---- Config ----
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ---- App ----
let app: FirebaseApp;
if (!getApps().length) {
  if (!firebaseConfig.apiKey) {
    console.error('Firebase API Key is missing. Check your .env.local file.');
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// ---- Services ----
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
// ✅ NEW: RTDB instance
const rtdb = getDatabase(app);   // ✅ make sure you defined this

export const firestoreAppId = firebaseConfig.appId || 'default-app-id';

// ---- Emulators (dev only, browser only) ----
const useEmulators =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== 'false';

if (useEmulators && typeof window !== 'undefined') {
  console.log('Development mode: Attempting to connect to Firebase emulators.');

  const authHost = '127.0.0.1';
  const authPort = parseInt(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099', 10);
  const firestoreHost = '127.0.0.1';
  const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10);
  const functionsHost = '127.0.0.1';
  const functionsPort = parseInt(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || '5001', 10);
  const storageHost = '127.0.0.1';
  const storagePort = parseInt(process.env.NEXT_PUBLIC_STORAGE_EMULATOR_PORT || '9199', 10);
// ✅ NEW: RTDB emulator defaults to 9000
const rtdbHost = '127.0.0.1';
const rtdbPort = parseInt(process.env.NEXT_PUBLIC_RTDB_EMULATOR_PORT || '9000', 10);

  const emulatorOptions = { disableWarnings: true as const };

  // Auth (skip double-connect)
  type ExtendedAuth = FirebaseAuthType & { emulatorConfig?: unknown };
  const extendedAuth = auth as ExtendedAuth;
  if (!extendedAuth.emulatorConfig) {
    try {
      connectAuthEmulator(auth, `http://${authHost}:${authPort}`, emulatorOptions);
      console.log(`✅ Auth emulator: http://${authHost}:${authPort}`);
    } catch (e: any) {
      console.error(`❌ Auth emulator: ${e?.message}`);
    }
  }

  // Firestore
  try {
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
    console.log(`✅ Firestore emulator: ${firestoreHost}:${firestorePort}`);
  } catch (e: any) {
    console.warn('⚠️ Firestore emulator:', e?.message || e);
  }

  // Functions
  try {
    connectFunctionsEmulator(functions, functionsHost, functionsPort);
    console.log(`✅ Functions emulator: ${functionsHost}:${functionsPort}`);
  } catch (e: any) {
    console.warn('⚠️ Functions emulator:', e?.message || e);
  }

  // Storage
  try {
    connectStorageEmulator(storage, storageHost, storagePort);
    console.log(`✅ Storage emulator: ${storageHost}:${storagePort}`);
  } catch (e: any) {
    console.warn('⚠️ Storage emulator:', e?.message || e);
  }
  // ✅ NEW: RTDB
  try {
    connectDatabaseEmulator(rtdb, rtdbHost, rtdbPort);
    console.log(`✅ RTDB emulator: ${rtdbHost}:${rtdbPort}`);
  } catch (e: any) {
    console.warn('⚠️ RTDB emulator:', e?.message || e);
  }
} else if (process.env.NODE_ENV === 'development') {
  console.log('Development mode: Firebase emulators are NOT being used (based on config).');
}

export { app, auth, db, functions, storage, rtdb }; // ✅ named export
export default app;