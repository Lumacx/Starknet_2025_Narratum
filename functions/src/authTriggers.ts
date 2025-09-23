// functions/src/authTriggers.ts
import * as functions from 'firebase-functions';
import { db, FieldValue } from './firebaseAdmin';
import type { UserRecord } from 'firebase-admin/auth';

export const createuserprofile = functions
  .region('us-central1')
  .auth.user()
  .onCreate(async (user: UserRecord) => {
    const { uid, email, displayName } = user;

    const username = displayName || `user_${uid.slice(0, 8)}`;
    const now = FieldValue.serverTimestamp();

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
