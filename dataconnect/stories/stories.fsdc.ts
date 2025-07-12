import { defineDataConnect } from 'firebase-data-connect';

export const stories = defineDataConnect('stories', (collection) => ({
  getStoriesByUser: collection.query((q, { userId }: { userId: string }) =>
    q.where('authorId', '==', userId)
  ),
}));
