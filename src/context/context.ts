import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, cert, getApps } from 'firebase-admin/app'

// Temporarily add these console.log statements for debugging
console.log("Debugging Firebase Admin SDK Initialization:");
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("FIREBASE_PRIVATE_KEY (first 50 chars):", process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50));
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
console.log("privateKey after replace (first 50 chars):", privateKey?.substring(0, 50));
console.log("privateKey length:", privateKey?.length);

// Ensure the app is only initialized once
let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // <--- This line needs to be added
  });
} else {
  app = getApps()[0];
}

export const context = {
  db: getFirestore(app),
  auth: getAuth(app),
}