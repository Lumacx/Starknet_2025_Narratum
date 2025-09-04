// src/hooks/useListPublishedStories.ts
'use client';

import { useMemo } from 'react';
import { useGetAllStories } from '@firebasegen/default-connector/react';
import type { GetAllStoriesData } from '@firebasegen/default-connector';
import type { Story } from '@/lib/types';

type Row = NonNullable<GetAllStoriesData['stories']>[number];

/** Normalize Firestore timestamp/Date/string/number into a sortable millis number. */
function tsToMillis(x: any): number {
  if (!x) return 0;
  // Firestore Timestamp
  if (typeof x?.toMillis === 'function') return Number(x.toMillis() || 0);
  // Date
  if (x instanceof Date) return x.getTime();
  // string/number
  const n = Number(new Date(x as any).getTime());
  return Number.isFinite(n) ? n : 0;
}

/** Accept both schemas:
 *  - status === 'published'
 *  - visibility === 'public'
 *  - isPublic === true (legacy)
 */
function isDiscoverable(row: Row): boolean {
  const status = String((row as any).status ?? '').trim().toLowerCase();
  const visibility = String((row as any).visibility ?? '').trim().toLowerCase();
  const isPublic = (row as any).isPublic === true;
  return status === 'published' || visibility === 'public' || isPublic;
}

function mapRowToStory(row: Row): Story {
  return {
    id: row.id,
    title: row.title ?? undefined,
    genres: row.genres ?? null,
    description: (row as any).description ?? undefined,
    coverImageUrl:
      row.coverImageUrl ??
      (row as any).coverUrl ?? // tolerate older field name
      undefined,
    authorId: row.creator?.id ?? '',
    status: (row as any).status ?? 'draft',
    createdAt: String((row as any).createdAt ?? ''),
    updatedAt: String((row as any).updatedAt ?? ''),
    // optional extras the Discover page uses
    views: (row as any).views ?? undefined,
    likes: (row as any).likes ?? undefined,
    commentsCount: (row as any).commentsCount ?? undefined,
    ratinglevel: (row as any).ratinglevel ?? undefined,
    // creator minimal
    creator: row.creator
      ? { id: row.creator.id, displayname: row.creator.displayname ?? '' }
      : undefined,
    // not loaded by this hook
    storyContent: undefined,
    comments: undefined,
    reactions: undefined,
  };
}

export const useListPublishedStories = (limit?: number) => {
  // Generated connector fetches a flat list; we'll filter/sort locally.
  const query = useGetAllStories();

  const data: Story[] = useMemo(() => {
    const rows: Row[] = query.data?.stories ?? [];

    // filter by our "discoverable" predicate
    let mapped = rows.filter(isDiscoverable).map(mapRowToStory);

    // stable sort: publishedAt -> updatedAt -> createdAt (desc)
    mapped.sort((a, b) => {
      const ap = tsToMillis((a as any).publishedAt ?? (a as any).updatedAt ?? a.createdAt);
      const bp = tsToMillis((b as any).publishedAt ?? (b as any).updatedAt ?? b.createdAt);
      return bp - ap;
    });

    if (typeof limit === 'number') mapped = mapped.slice(0, Math.max(0, limit));
    return mapped;
  }, [query.data, limit]);

  return {
    data,
    isLoading: query.isLoading || (query as any).isFetching,
    error: (query as any).error as Error | null,
    refetch: query.refetch,
  };
};

export default useListPublishedStories;
