import SchemaBuilder from "@pothos/core";
import type { GraphQLContext, User, Comment, Reaction, Story } from "@/lib/types"; // ✅ Importa desde types.ts

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Objects: {
    User: User;
    Comment: Comment;
    Reaction: Reaction;
    Story: Story;
    // Puedes seguir agregando otros tipos aquí si los necesitas (StoryContent, etc.)
  };
}>({});

builder.queryType({});
builder.mutationType({});
