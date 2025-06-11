
import * as admin from "firebase-admin";
import { onUserCreate } from "firebase-functions/v2/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize the Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore();

/**
 * This function triggers whenever a new user is created in Firebase Authentication.
 * It automatically creates a corresponding user profile in the database.
 * This is the most reliable way to handle user profile creation, as it
 * avoids client-side race conditions.
 */
exports.createuserprofile = onUserCreate(async (event) => {
  const user = event.data;
  const { uid, email, displayName } = user;

  // Ensure a unique username, especially if the displayName is not available.
  const username = displayName || `user_${uid.slice(0, 8)}`;

  const userProfile = {
    id: uid, // Explicitly set the document ID to match the user's UID
    email: email || "no-email@example.com",
    username: username,
    displayname: displayName || "Anonymous User",
    role: "reader", // Default role
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    // Use the user's UID as the document ID in the 'users' collection.
    await db.collection("users").doc(uid).set(userProfile);
    console.log(`Successfully created profile for user: ${uid}`);
  } catch (error) {
    console.error(`Error creating profile for user: ${uid}`, error);
  }
});
