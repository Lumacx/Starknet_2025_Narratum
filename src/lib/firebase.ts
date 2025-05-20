// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth"; 
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
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

const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const localEmulatorHost = "127.0.0.1"; 
  
  const authEmulatorPublicHost = process.env.NEXT_PUBLIC_AUTH_EMULATOR_PUBLIC_HOST;
  const authPort = parseInt(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || "9095", 10);

  // For Firestore Emulator, use its publicly forwarded host if available for client-side connections
  const firestoreEmulatorPublicHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PUBLIC_HOST;
  const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || "8085", 10);

  console.log(`Attempting to connect to Firebase Emulators.`);
  console.log(`Auth Emulator Public Host (for redirect): ${authEmulatorPublicHost || 'Not set, will use local for auth redirect'}`);
  console.log(`Firestore Emulator Public Host (for client-side): ${firestoreEmulatorPublicHost || 'Not set, will use local for Firestore'}`);
  console.log(`Local Emulator Host (for services like Functions): ${localEmulatorHost}`);

  try {
    const functionsPort = parseInt(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || "5005", 10);

    if (authEmulatorPublicHost) {
      connectAuthEmulator(auth, `https://${authEmulatorPublicHost}`, { disableWarnings: true });
      console.log(`Connected Auth Emulator for redirects to: https://${authEmulatorPublicHost}`);
    } else {
      connectAuthEmulator(auth, `http://${localEmulatorHost}:${authPort}`, { disableWarnings: true });
      console.log(`Connected Auth Emulator for redirects to: http://${localEmulatorHost}:${authPort}`);
    }

    // For Firestore, if a public host is available, the client-side SDK should use it.
    // The SDK often still needs the original port number, even if the public URL is on 443.
    // Firebase Studio's forwarding should handle mapping https://public-host -> http://internal-host:internal-port
    if (firestoreEmulatorPublicHost) {
        // Firestore connectEmulator expects host and port separately.
        // It will use HTTP for emulators unless SSL is explicitly configured for the emulator itself.
        // The public URL being HTTPS is handled by Studio's reverse proxy.
        connectFirestoreEmulator(db, firestoreEmulatorPublicHost, firestorePort );
        console.log(`Configured Firestore Emulator for client-side to use: host=${firestoreEmulatorPublicHost}, port=${firestorePort}`);
    } else {
        connectFirestoreEmulator(db, localEmulatorHost, firestorePort);
        console.log(`Configured Firestore Emulator for client-side to use: host=${localEmulatorHost}, port=${firestorePort}`);
    }

    connectFunctionsEmulator(functions, localEmulatorHost, functionsPort);
    console.log("Successfully attempted to connect relevant Firebase Emulators.");
  } catch (error) {
    console.warn("Could not connect to Firebase emulators. Ensure they are running on configured ports.", error);
  }
}

export { app, auth, functions, db };
