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
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
if (!getApps().length) {
  if (!firebaseConfig.apiKey) {
    console.error("Firebase API Key is missing. Check your .env.local file.");
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const functions: Functions = getFunctions(app);
const db: Firestore = getFirestore(app);

export const firestoreAppId = firebaseConfig.appId || 'default-app-id';

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  console.log("Development mode: Attempting to connect to Firebase emulators.");

  const authHost = "127.0.0.1";
  const authPort = parseInt(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || "9099", 10);
  
  const firestoreHost = "127.0.0.1";
  const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || "8080", 10);

  const functionsHost = "127.0.0.1";
  const functionsPort = parseInt(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || "5001", 10);

  const emulatorOptions = { disableWarnings: true };

  // Auth Emulator
  const authEmulatorUrl = `http://${authHost}:${authPort}`;
  console.log(`Auth Emulator: Checking config. Target URL: ${authEmulatorUrl}`);
  if (!(auth as any).emulatorConfig) { 
      try {
        connectAuthEmulator(auth, authEmulatorUrl, emulatorOptions);
        console.log(`SUCCESS: connectAuthEmulator called for ${authEmulatorUrl}`);
      } catch (e: any) {
        console.error(`ERROR calling connectAuthEmulator with URL ${authEmulatorUrl}:`, e);
      }
  } else {
    console.log("Auth emulator already configured. Current config:", (auth as any).emulatorConfig);
  }

  // Firestore Emulator
  console.log(`Firestore Emulator: Attempting to connect to host: ${firestoreHost}, port: ${firestorePort}`);
  try {
      connectFirestoreEmulator(db, firestoreHost, firestorePort);
      console.log(`SUCCESS: connectFirestoreEmulator called for host: ${firestoreHost}, port: ${firestorePort}`);
  } catch (error: any) {
      if (error.code !== 'failed-precondition' && (!error.message || !error.message.includes('already connected'))) {
          console.warn("ERROR connecting to Firestore emulator:", error.message, error.code);
      } else {
          console.log("Firestore emulator already connected or successfully reconnected.");
      }
  }

  // Functions Emulator
  console.log(`Functions Emulator: Attempting to connect to host: ${functionsHost}, port: ${functionsPort}`);
  try {
    connectFunctionsEmulator(functions, functionsHost, functionsPort);
    console.log(`SUCCESS: connectFunctionsEmulator called for host: ${functionsHost}, port: ${functionsPort}`);
  } catch (error: any) {
    if (error.code !== 'functions/already-initialized' && (!error.message || !error.message.includes('already connected'))) {
        console.warn("ERROR connecting to Functions emulator:", error.message, error.code);
    } else {
        console.log("Functions emulator already connected or successfully reconnected.");
    }
  }
}

export { app, auth, db, functions };
