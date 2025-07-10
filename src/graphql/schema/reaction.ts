import { builder } from "../builder";
import { context } from "@/context/context";
import type { Reaction } from "@/lib/types"; // Ya definido globalmente

// Define el tipo Reaction para GraphQL
builder.objectType('Reaction', {
  fields: (t) => ({
    id: t.exposeID('id'),
    reactionType: t.exposeString('reactionType'),
    createdAt: t.exposeString('createdAt'),

    user: t.field({
      type: 'User',
      resolve: async (reaction) => {
        const userSnap = await context.db.collection('users').doc(reaction.userId).get();
        const userData = userSnap.data();
        if (!userSnap.exists || !userData) throw new Error("User not found");

        return {
          id: userSnap.id,
          username: userData.username,
          email: userData.email,
          avatarUrl: userData.avatarUrl,
          displayname: userData.displayname,
          role: userData.role,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        };
      },
    }),

    comment: t.field({
      type: 'Comment',
      resolve: async (reaction) => {
        const commentSnap = await context.db
          .collection('stories')
          .doc(reaction.storyId)
          .collection('comments')
          .doc(reaction.commentId)
          .get();
    
        const data = commentSnap.data();
        if (!commentSnap.exists || !data) throw new Error("Comment not found");
    
        return {
          id: commentSnap.id,
          content: data.content,
          createdAt: data.createdAt,
          authorId: data.authorId,
          storyId: reaction.storyId, // <- 🔑 importante
        };
      },
    }),
  }),
});

// Mutation para alternar una reacción en un comentario
builder.mutationField('toggleReaction', (t) =>
  t.field({
    type: 'String',
    args: {
      storyId: t.arg.string({ required: true }),
      commentId: t.arg.string({ required: true }),
      reactionType: t.arg.string({ required: true }),
      userId: t.arg.string({ required: true }), // En producción: sacar de contexto
    },
    resolve: async (_, { storyId, commentId, reactionType, userId }) => {
      const reactionRef = context.db
        .collection('stories')
        .doc(storyId)
        .collection('comments')
        .doc(commentId)
        .collection('reactions')
        .doc(userId); // Unique per user per comment

      const reactionDoc = await reactionRef.get();

      if (reactionDoc.exists && reactionDoc.data()?.reactionType === reactionType) {
        await reactionRef.delete();
        return 'Reaction removed';
      } else {
        await reactionRef.set({
          reactionType,
          userId,
          storyId,
          commentId,
          createdAt: new Date().toISOString(),
        });
        return 'Reaction added/updated';
      }
    },
  })
);
