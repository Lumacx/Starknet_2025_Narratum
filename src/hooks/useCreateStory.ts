// src/hooks/useCreateStory.ts
'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export type StoryCategory = 'short' | 'novela' | 'campaign';
export type StoryVisibility = 'public' | 'private' | 'unlisted';
export type StoryStatus = 'draft' | 'published';

// mismos códigos que usas en Begin/page
export type LangCode =
  | 'en' | 'es' | 'pt' | 'fr' | 'de'
  | 'it' | 'ja' | 'ko' | 'zh' | 'hi' | 'ar';

export type CreateStoryInput = {
  title: string;
  synopsis: string;
  genres: string[];
  category: StoryCategory;
  pageCount: number;
  coverImageUrl?: string | null;
  visibility?: StoryVisibility;   // default -> 'private'
  status?: StoryStatus;           // default -> 'draft'
  /** ✅ NUEVO: idioma coherente con Begin/Support */
  language?: LangCode;            // default -> 'en'
};

/**
 * Creates a story document that satisfies your Firestore rules:
 * - ownerUid == request.auth.uid
 * - sets status/visibility
 * - sets createdAt/updatedAt
 */
export function useCreateStory() {
  const { user } = useAuth();

  return async function createStory(data: CreateStoryInput): Promise<string> {
    if (!user) throw new Error('You must be signed in to create a story.');

    const now = serverTimestamp();
    const docRef = await addDoc(collection(db, 'stories'), {
      title: data.title ?? '(untitled)',
      synopsis: data.synopsis ?? '',
      genres: Array.isArray(data.genres) ? data.genres : [],
      category: data.category,
      pageCount: Number.isFinite(data.pageCount) ? data.pageCount : 1,
      coverImageUrl: data.coverImageUrl ?? null,

      // ✅ idioma persistido
      language: data.language ?? 'en',

      // ✅ required by your rules
      ownerUid: user.uid,

      // ✅ rules read these for public/published access gates
      visibility: data.visibility ?? 'private',
      status: data.status ?? 'draft',

      createdAt: now,
      updatedAt: now,
    });

    return docRef.id;
  };
}
