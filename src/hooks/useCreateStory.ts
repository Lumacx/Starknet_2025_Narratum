'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export type StoryCategory = 'short' | 'novela' | 'campaign';
export type StoryVisibility = 'public' | 'private' | 'unlisted'; // 'unlisted' acts like private with current rules
export type StoryStatus = 'draft' | 'published';

export type CreateStoryInput = {
  title: string;
  synopsis: string;
  genres: string[];
  category: StoryCategory;
  pageCount: number;
  coverImageUrl?: string | null;
  visibility?: StoryVisibility;   // default -> 'private'
  status?: StoryStatus;           // default -> 'draft'
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
