import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import { getDataConnect, type DataConnect } from '@firebase/data-connect';
import { connectorConfig, type UpdateStoryVariables } from '@firebasegen/default-connector';

if (!admin.apps.length) admin.initializeApp();

// Singleton para Data Connect usando ConnectorConfig (NO FirebaseApp)
let dcClient: DataConnect | null = null;
function getDcClient(): DataConnect {
  if (!dcClient) dcClient = getDataConnect(connectorConfig);
  return dcClient;
}

export const incrementCommentCount = functions
  .region('us-central1')
  .firestore.document('comments/{commentId}')
  .onCreate(async (snap) => {
    const newComment = snap.data();
    const storyId = newComment?.storyId as string | undefined;

    if (!storyId) {
      console.log('Comment without storyId → skip');
      return null;
    }

    try {
      const dc = getDcClient();

      // 1) Obtener la historia actual
      const getRes = await (dc as any).run({
        connector: connectorConfig.connector,
        operation: 'GetStoryWithContent',
        variables: { storyId }
      });

      const currentStory = getRes?.story;
      if (!currentStory) {
        console.log(`Story ${storyId} not found → skip`);
        return null;
      }

      // 2) Incrementar contador
      const current = currentStory.commentsCount ?? 0;
      const next = current + 1;

      const vars: UpdateStoryVariables = { id: storyId, commentsCount: next };

      await (dc as any).run({
        connector: connectorConfig.connector,
        operation: 'UpdateStory',
        variables: vars
      });

      console.log(`commentsCount for story ${storyId}: ${current} → ${next}`);
      return null;
    } catch (err) {
      console.error(`incrementCommentCount failed for story ${storyId}:`, err);
      throw err;
    }
  });
