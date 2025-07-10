
import { builder } from "../builder";

// Defines the User object type for our GraphQL schema.
// This represents a user in our system.
builder.objectType('User', {
  fields: (t) => ({
    id: t.exposeID('id'),
    username: t.exposeString('username'),
    email: t.exposeString('email'),
    avatarUrl: t.exposeString('avatarUrl', { nullable: true }), // <- ✅ ya permitido por types.ts
    displayname: t.exposeString('displayname'),
    role: t.exposeString('role'),
    createdAt: t.exposeString('createdAt'),
    updatedAt: t.exposeString('updatedAt'),
  }),
});