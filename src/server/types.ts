// src/server/types.ts
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import type { User } from '@/lib/types';

export interface GraphQLContext {
  db: Firestore;
  auth: Auth;
  user?: User;
}
