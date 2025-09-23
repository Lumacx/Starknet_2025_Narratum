// functions/src/commentCounter.ts
import * as functions from 'firebase-functions';
import { db, FieldValue, Timestamp } from './firebaseAdmin';

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
          commentsCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return null;
    } catch (e) {
      console.error('incrementCommentCount:', e);
      return null;
    }
  });
