//functions/src/propagateUserProfile.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { db, FieldValue, Timestamp } from './firebaseAdmin';
import { FieldPath } from 'firebase-admin/firestore'; // type/utility is fine to import


export const propagateUserProfileToStories = onDocumentUpdated('users/{uid}', async (event) => {
  const uid = event.params.uid as string;
  const after = event.data?.after?.data() as any;
  if (!after) return;

  const name =
    after.displayName || after.displayname || after.name || after.username || 'Unknown Author';
  const photoURL = after.photoURL || after.photoUrl || after.avatarUrl || after.avatar || null;

  const pageSize = 400;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  for (;;) {
    let q = db.collection('stories')
      .where('ownerUid', '==', uid)
      .orderBy(FieldPath.documentId())
      .limit(pageSize);

    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    for (const docSnap of snap.docs) {
      batch.set(
        docSnap.ref,
        {
          creator: { uid, name, photoURL },
          authorName: name,
          authorPhotoURL: photoURL,
          authorUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();

    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }
});
