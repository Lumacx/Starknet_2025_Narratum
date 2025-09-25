// src/context/context.ts
import 'server-only';
import { getAdminDb, getAdminApp } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

/**
 * Server-only Firebase Admin context.
 *
 * Provides lazy getters for Admin SDK services.
 * Import this ONLY from server code (API routes, server actions, or server utilities).
 */
export const context = {
  get db() {
    return getAdminDb();
  },
  get auth() {
    return getAuth(getAdminApp());
  },
};
