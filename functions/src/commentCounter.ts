// functions/src/commentCounter.ts
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * On new comment, increment commentsCount on /stories/{storyId}.
 * If your parent collection is different, change 'stories' below.
 */
export const incrementCommentCount = functions
  .region('us-central1')
  .firestore
  .document('comments/{commentId}')
  .onCreate(async (snap) => {
    const data = snap.data() as { storyId?: string } | undefined;
    const storyId = data?.storyId;
    if (!storyId) {
      console.log('Comment without storyId → skip');
      return null;
    }

    try {
      await db.collection('stories').doc(storyId).set(
        {
          commentsCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return null;
    } catch (e) {
      console.error('incrementCommentCount:', e);
      return null;
    }
  });
