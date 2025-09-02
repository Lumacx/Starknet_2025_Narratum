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
  /** 🔹 NUEVO: para soportar campaignName y futuros metadatos */
  metadata?: Record<string, any>;
};

export function useCreateStory() {
  const { user } = useAuth();

  return async function createStory(data: CreateStoryInput): Promise<string> {
    if (!user) throw new Error('You must be signed in to create a story.');

    const now = serverTimestamp();

    const docRef = await addDoc(collection(db, 'stories'), {
      // 🔐 Reglas: requerido
      ownerUid: user.uid,

      // Datos
      title: data.title ?? '(untitled)',
      synopsis: data.synopsis ?? '',
      genres: Array.isArray(data.genres) ? data.genres : [],
      category: data.category,
      pageCount: Number.isFinite(data.pageCount) ? data.pageCount : 1,
      coverImageUrl: data.coverImageUrl ?? null,

      // Idioma/estado/visibilidad
      language: data.language ?? 'en',
      visibility: data.visibility ?? 'private',
      status: data.status ?? 'draft',

      // 🔹 Metadata opcional (ej. { campaignName })
      metadata: data.metadata ?? {},

      // Timestamps
      createdAt: now,
      updatedAt: now,
    });

    return docRef.id;
  };
}
