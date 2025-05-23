// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Added measurementId
};

let app: FirebaseApp;
if (!getApps().length) {
  if (!firebaseConfig.apiKey) {
    console.error("Firebase API Key is missing. Check your .env.local file.");
    // Potentially throw an error or use a default/mock app for critical failures
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const functions: Functions = getFunctions(app);
const db: Firestore = getFirestore(app);

// Consistent App ID for Firestore paths, taken from your config
export const firestoreAppId = firebaseConfig.appId || 'default-app-id';

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Check if emulators are already running to avoid re-connecting
  // This simple check might not be foolproof for all HMR scenarios but is a starting point.
  // Firebase JS SDK v9+ doesn't throw an error if you connect multiple times, but it's good to be mindful.

  const localEmulatorHost = "127.0.0.1"; // Or "localhost"

  // Auth Emulator
  const authPort = parseInt(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || "9099", 10); // Default 9099
  // Check if auth emulator is already connected, not straightforward with SDK v9
  // For now, we'll call connectAuthEmulator, subsequent calls are usually no-ops or idempotent.
  if (!(auth as any).emulatorConfig) { // Basic check
      connectAuthEmulator(auth, `http://${localEmulatorHost}:${authPort}`, { disableWarnings: true });
      console.log(`Auth emulator connected to http://${localEmulatorHost}:${authPort}`);
  }


  // Firestore Emulator
  const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || "8080", 10); // Default 8080
  // Similar to Auth, checking Firestore emulator connection state isn't direct.
  // We connect, and the SDK handles subsequent calls.
  // Firestore emulator connection doesn't have a simple 'emulatorConfig' like property to check before connecting.
  try {
      connectFirestoreEmulator(db, localEmulatorHost, firestorePort);
      console.log(`Firestore emulator connected to http://${localEmulatorHost}:${firestorePort}`);
  } catch (error: any) {
      // Potential error if trying to connect when already connected in some strict modes or older SDKs, though typically safe.
      if (error.code !== 'failed-precondition' && error.message && !error.message.includes('already connected')) { // Firestore specific error for already connected
          console.warn("Error connecting to Firestore emulator:", error.message);
      }
  }

  // Functions Emulator
  const functionsPort = parseInt(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || "5001", 10); // Default 5001
  // Similar to Auth, checking Functions emulator connection state isn't direct.
  try {
    connectFunctionsEmulator(functions, localEmulatorHost, functionsPort);
    console.log(`Functions emulator connected to http://${localEmulatorHost}:${functionsPort}`);
  } catch (error: any) {
    if (error.code !== 'functions/already-initialized' && error.message && !error.message.includes('already connected')) {
        console.warn("Error connecting to Functions emulator:", error.message);
    }
  }
}

export { app, auth, db, functions };
