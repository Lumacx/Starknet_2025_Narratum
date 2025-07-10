import { builder } from "../builder";
import { context } from "@/context/context";
import type { Story, User, Comment } from "@/lib/types";

// Define el tipo GraphQL para Story
builder.objectType('Story', {
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title', { nullable: true }),
    genre: t.exposeString('genre', { nullable: true }),
    description: t.exposeString('description', { nullable: true }),
    coverImageUrl: t.exposeString('coverImageUrl', { nullable: true }),
    status: t.exposeString('status'),
    createdAt: t.exposeString('createdAt'),
    updatedAt: t.exposeString('updatedAt'),

    // Resolver para el autor
    author: t.field({
      type: 'User',
      resolve: async (story: Story): Promise<User> => {
        const authorDoc = await context.db.collection('users').doc(story.authorId).get();
        const data = authorDoc.data();
        if (!authorDoc.exists || !data) throw new Error("Author not found");

        return {
          id: authorDoc.id,
          username: data.username,
          email: data.email,
          displayname: data.displayname,
          avatarUrl: data.avatarUrl,
          role: data.role,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      },
    }),

    // Resolver para los comentarios del story
    comments: t.field({
      type: ['Comment'],
      resolve: async (story: Story): Promise<Comment[]> => {
        const snapshot = await context.db
          .collection('stories')
          .doc(story.id)
          .collection('comments')
          .get();

        return snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            content: data.content,
            authorId: data.authorId,
            storyId: story.id,
            createdAt: data.createdAt,
          };
        });
      },
    }),
  }),
});

// Query para obtener todas las historias
builder.queryField('stories', (t) =>
  t.field({
    type: ['Story'],
    resolve: async (): Promise<Story[]> => {
      const snapshot = await context.db.collection('stories').get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          genre: data.genre,
          description: data.description,
          coverImageUrl: data.coverImageUrl,
          authorId: data.authorId,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
    },
  })
);
