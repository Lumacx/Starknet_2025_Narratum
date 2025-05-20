// src/ai/functions/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

// Using 'any' for both data and context to bypass the complex type checking for now
export const simpleTest = functions.https.onCall(async (data: any, context: any) => {
  console.log("Simple test function called with data:", data);
  
  // Since context is 'any', we need to be careful checking for auth
  if (context && context.auth && context.auth.uid) { 
    console.log("Called by user:", context.auth.uid);
  } else {
    console.log("Function called without authentication context or UID missing.");
  }
  return { message: "Simple test function executed successfully!" };
});

// Comment out the real function for now
// export { generateNarratumImage } from './imageGeneration'; 
