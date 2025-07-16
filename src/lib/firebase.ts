import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Auth as FirebaseAuth } from 'firebase/auth';
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

export const firestoreAppId = firebaseConfig.appId || "default-app-id";

// Emulator logic (only for development)
const useEmulators =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== "false";

if (useEmulators && typeof window !== "undefined") {
  console.log("Development mode: Attempting to connect to Firebase emulators.");

  const authHost = "127.0.0.1";
  const authPort = parseInt(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || "9099", 10);
  const firestoreHost = "127.0.0.1";
  const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || "8080", 10);
  const functionsHost = "127.0.0.1";
  const functionsPort = parseInt(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || "5001", 10);

  const emulatorOptions = { disableWarnings: true };
  const authEmulatorUrl = `http://${authHost}:${authPort}`;

  // ✅ Tipado extendido corregido
  type ExtendedAuth = FirebaseAuth & { emulatorConfig?: unknown };
  const extendedAuth = auth as ExtendedAuth;

  if (!extendedAuth.emulatorConfig) {
    try {
      connectAuthEmulator(auth, authEmulatorUrl, emulatorOptions);
      console.log(`✅ connectAuthEmulator called: ${authEmulatorUrl}`);
    } catch (e: unknown) {
      const error = e as Error;
      console.error(`❌ Error connecting Auth Emulator: ${error.message}`);
    }
  }

  try {
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
    console.log(`✅ Firestore emulator connected at ${firestoreHost}:${firestorePort}`);
  } catch (e: unknown) {
    const error = e as { message?: string; code?: string };
    if (
      error.code !== "failed-precondition" &&
      (!error.message || !error.message.includes("already connected"))
    ) {
      console.warn("⚠️ Error connecting Firestore emulator:", error.message, error.code);
    } else {
      console.log("ℹ️ Firestore emulator already connected.");
    }
  }

  try {
    connectFunctionsEmulator(functions, functionsHost, functionsPort);
    console.log(`✅ Functions emulator connected at ${functionsHost}:${functionsPort}`);
  } catch (e: unknown) {
    const error = e as { message?: string; code?: string };
    if (
      error.code !== "functions/already-initialized" &&
      (!error.message || !error.message.includes("already connected"))
    ) {
      console.warn("⚠️ Error connecting Functions emulator:", error.message, error.code);
    } else {
      console.log("ℹ️ Functions emulator already connected.");
    }
  }
} else if (process.env.NODE_ENV === "development") {
  console.log("Development mode: Firebase emulators are NOT being used (based on config).");
}

export { app, auth, db, functions };
