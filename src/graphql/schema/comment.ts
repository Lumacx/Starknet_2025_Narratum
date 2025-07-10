import { builder } from '../builder';
import { context } from '@/context/context';
import type { Comment, User, Reaction } from '@/lib/types';

builder.objectType('Comment', {
  fields: (t) => ({
    id: t.exposeID('id'),
    content: t.exposeString('content'),
    createdAt: t.exposeString('createdAt'),

    // Resolver para autor del comentario
    author: t.field({
      type: 'User',
      resolve: async (comment: Comment): Promise<User> => {
        const authorDoc = await context.db.collection('users').doc(comment.authorId).get();
        const data = authorDoc.data();
        if (!authorDoc.exists || !data) throw new Error('Author not found');

        return {
          id: authorDoc.id,
          username: data.username,
          email: data.email,
          avatarUrl: data.avatarUrl,
          displayname: data.displayname,
          role: data.role,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      },
    }),

    // Resolver para reacciones
    reactions: t.field({
      type: ['Reaction'],
      resolve: async (comment: Comment): Promise<Reaction[]> => {
        const snapshot = await context.db
          .collection('stories')
          .doc(comment.storyId)
          .collection('comments')
          .doc(comment.id)
          .collection('reactions')
          .get();

        return snapshot.docs.map((doc) => ({
          id: doc.id,
          reactionType: doc.data().reactionType,
          userId: doc.data().userId,
          commentId: comment.id,
          storyId: comment.storyId,
          createdAt: doc.data().createdAt,
        }));
      },
    }),
  }),
});

// Mutation para agregar un comentario
builder.mutationField('addComment', (t) =>
  t.field({
    type: 'Comment',
    args: {
      storyId: t.arg.string({ required: true }),
      content: t.arg.string({ required: true }),
      authorId: t.arg.string({ required: true }),
    },
    resolve: async (_, { storyId, content, authorId }): Promise<Comment> => {
      const createdAt = new Date().toISOString();

      const commentRef = await context.db
        .collection('stories')
        .doc(storyId)
        .collection('comments')
        .add({
          content,
          authorId,
          storyId,
          createdAt,
        });

      return {
        id: commentRef.id,
        content,
        authorId,
        storyId,
        createdAt,
      };
    },
  })
);
