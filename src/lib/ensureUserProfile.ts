import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function ensureUserProfile(uid: string, extra: Record<string, any> = {}) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(
      ref,
      { createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra },
      { merge: true }
    );
  }
  return (await getDoc(ref)).data();
}
