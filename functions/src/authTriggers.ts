// functions/src/authTriggers.ts
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const createuserprofile = functions
  .region('us-central1')
  .auth.user()
  .onCreate(async (user: admin.auth.UserRecord) => {
    const { uid, email, displayName } = user;

    const username = displayName || `user_${uid.slice(0, 8)}`;
    const now = admin.firestore.FieldValue.serverTimestamp();

    const userProfile = {
      id: uid,
      email: email ?? 'no-email@example.com',
      username,
      displayname: displayName ?? 'Anonymous User',
      role: 'reader',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.collection('users').doc(uid).set(userProfile, { merge: true });
      console.log(`Profile created for user ${uid}`);
    } catch (e) {
      console.error(`createuserprofile failed for ${uid}:`, e);
    }
  });
