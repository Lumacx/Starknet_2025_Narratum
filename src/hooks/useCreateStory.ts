'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export type CreateStoryInput = {
  title: string;
  synopsis: string;
  genres: string[];
  category: string;
  pageCount: number;
  coverImageUrl?: string | null;
  visibility?: 'public' | 'private' | 'unlisted';
  status?: 'draft' | 'published';
};

/**
 * Creates a story document that satisfies your Firestore rules:
 * requires ownerUid == request.auth.uid, sets createdAt/updatedAt.
 */
export function useCreateStory() {
  const { user } = useAuth();

  return async function createStory(data: CreateStoryInput): Promise<string> {
    if (!user) throw new Error('You must be signed in to create a story.');

    const now = serverTimestamp();
    const docRef = await addDoc(collection(db, 'stories'), {
      ...data,
      ownerUid: user.uid,                 // <-- rules depend on this
      visibility: data.visibility ?? 'private',
      status: data.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
    });

    return docRef.id;
  };
}
