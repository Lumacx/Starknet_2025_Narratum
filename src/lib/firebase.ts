import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

// Explicitly import types using 'type' keyword to avoid namespace conflicts
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Auth as FirebaseAuthType } from 'firebase/auth'; // Correct: Imports 'Auth' as a type
import type { Functions } from 'firebase/functions';
import type { Firestore } from 'firebase/firestore';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
let app: FirebaseApp;
if (!getApps().length) {
  if (!firebaseConfig.apiKey) {
    console.error("Firebase API Key is missing. Check your .env.local file.");
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Firebase services
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);
const storage: FirebaseStorage = getStorage(app); // 👈 AÑADIDO

export const firestoreAppId = firebaseConfig.appId || "default-app-id";

// Emulator logic (only for development)
const useEmulators =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== "false";

if (useEmulators && typeof window !== "undefined") {
  console.log("Development mode: Attempting to connect to Firebase emulators.");

  const authHost = '127.0.0.1';
  const authPort = parseInt(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099', 10);
  const firestoreHost = '127.0.0.1';
  const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10);
  const functionsHost = '127.0.0.1';
  const functionsPort = parseInt(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || '5001', 10);
  const storageHost = '127.0.0.1';
  const storagePort = parseInt(process.env.NEXT_PUBLIC_STORAGE_EMULATOR_PORT || '9199', 10);

  const emulatorOptions = { disableWarnings: true };

  // Auth
  type ExtendedAuth = FirebaseAuthType & { emulatorConfig?: unknown };
  const extendedAuth = auth as ExtendedAuth;
  if (!extendedAuth.emulatorConfig) {
    try {
      connectAuthEmulator(auth, `http://${authHost}:${authPort}`, emulatorOptions);
      console.log(`✅ connectAuthEmulator: http://${authHost}:${authPort}`);
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

  // Storage 👇
  try {
    connectStorageEmulator(storage, storageHost, storagePort);
    console.log(`✅ Storage emulator: ${storageHost}:${storagePort}`);
  } catch (e: any) {
    console.warn('⚠️ Storage emulator:', e?.message || e);
  }
} else if (process.env.NODE_ENV === 'development') {
  console.log('Development mode: Firebase emulators are NOT being used (based on config).');
}

export { app, auth, db, functions, storage }; // 👈 EXPORTA storage