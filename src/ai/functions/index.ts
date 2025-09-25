// src/ai/functions/index.ts
import 'server-only';
import { getAdminDb } from '@/lib/firebaseAdmin';

type NewAuthUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
};

/**
 * Helper you can call from your Cloud Function (in /functions/src/**)
 * to create/merge a user profile. Safe to keep in the Next repo.
 */
export async function createUserProfile(user: NewAuthUser) {
  const db = getAdminDb();
  const { uid, email, displayName } = user;

  const username = displayName || `user_${uid.slice(0, 8)}`;
  const userProfile = {
    id: uid,
    email: email || 'no-email@example.com',
    username,
    displayname: displayName || 'Anonymous User',
    role: 'reader',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('users').doc(uid).set(userProfile, { merge: true });
}
