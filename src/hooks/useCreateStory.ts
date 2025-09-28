// src/hooks/useCreateStory.ts
'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export type StoryCategory = 'short' | 'novela' | 'campaign';
export type StoryVisibility = 'public' | 'private' | 'unlisted';
export type StoryStatus = 'draft' | 'published';

export type LangCode =
  | 'en' | 'es' | 'pt' | 'fr' | 'de'
  | 'it' | 'ja' | 'ko' | 'zh' | 'hi' | 'ar';

type ServerStoryType = 'basic' | 'premium' | 'convai';

export type CreateStoryInput = {
  title: string;
  synopsis: string;
  genres: string[];
  category: StoryCategory;
  pageCount: number;
  coverImageUrl?: string | null;
  visibility?: StoryVisibility;   // default -> 'private'
  status?: StoryStatus;           // default -> 'draft'
  language?: LangCode;            // default -> 'en'
  metadata?: Record<string, any>; // e.g. { campaignName }
  premium?: Record<string, any>;  // optional payload for premium/convai features
};

function categoryToServerType(cat: StoryCategory): ServerStoryType {
  if (cat === 'novela') return 'premium';
  if (cat === 'campaign') return 'convai';
  return 'basic'; // short
}

export function useCreateStory() {
  const { user } = useAuth();

  return async function createStory(data: CreateStoryInput): Promise<string> {
    if (!user) throw new Error('You must be signed in to create a story.');

    const now = serverTimestamp();

    const serverType = categoryToServerType(data.category);

    const docRef = await addDoc(collection(db, 'stories'), {
      // 🔐 required by rules
      ownerUid: user.uid,

      // 🔑 rules expect this field:
      type: serverType, // 'basic' | 'premium' | 'convai'  ← matches rules

      // main fields
      title: data.title ?? '(untitled)',
      synopsis: data.synopsis ?? '',
      genres: Array.isArray(data.genres) ? data.genres : [],
      category: data.category, // keep for app logic ('short' | 'novela' | 'campaign')
      pageCount: Number.isFinite(data.pageCount) ? Math.floor(data.pageCount) : 1,
      coverImageUrl: data.coverImageUrl ?? null,

      // state
      language: data.language ?? 'en',
      visibility: data.visibility ?? 'private',
      status: data.status ?? 'draft',

      // optional payloads
      metadata: data.metadata ?? {},
      ...(data.premium ? { premium: data.premium } : {}),

      // timestamps
      createdAt: now,
      updatedAt: now,
    });

    return docRef.id;
  };
}
