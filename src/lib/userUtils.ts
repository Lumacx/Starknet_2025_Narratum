// src/lib/userUtils.ts
import { User } from 'firebase/auth';
import { db } from './firebase'; // Your main firebase.ts file
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  // Add any other custom fields you want for a user profile
  // e.g., roles?: string[]; bio?: string;
}

export const manageUserInFirestore = async (user: User): Promise<void> => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);

  try {
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      // User exists, update lastLoginAt
      await setDoc(userRef, { 
        lastLoginAt: serverTimestamp(),
        // Optionally update other fields if they might change and you want to sync them
        // displayName: user.displayName,
        // photoURL: user.photoURL,
      }, { merge: true });
      console.log("User document updated in Firestore for UID:", user.uid);
    } else {
      // User does not exist, create new document
      const newUserProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };
      await setDoc(userRef, newUserProfile);
      console.log("New user document created in Firestore for UID:", user.uid);
    }
  } catch (error) {
    console.error("Error managing user document in Firestore:", error);
    // Optionally, re-throw the error or handle it more gracefully depending on your app's needs
  }
};
