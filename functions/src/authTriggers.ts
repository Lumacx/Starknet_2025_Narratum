import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

export const createuserprofile = functions
  .region('us-central1')
  .auth.user()
  .onCreate(async (user) => {
    const { uid, email, displayName } = user;

    const username = displayName || `user_${uid.slice(0, 8)}`;
    const userProfile = {
      id: uid,
      email: email || 'no-email@example.com',
      username,
      displayname: displayName || 'Anonymous User',
      role: 'reader',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await db.collection('users').doc(uid).set(userProfile);
      console.log(`Profile created for user: ${uid}`);
    } catch (e) {
      console.error(`createuserprofile failed for ${uid}:`, e);
    }
  });
