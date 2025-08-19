// src/hooks/useListPublishedStories.ts
'use client';

import { useMemo } from 'react';
import { useGetAllStories } from '@firebasegen/default-connector/react';
import type { GetAllStoriesData } from '@firebasegen/default-connector';
import type { Story } from '@/lib/types';

// Row type returned by the generated query
type Row = NonNullable<GetAllStoriesData['stories']>[number];

function mapRowToStory(row: Row): Story {
  return {
    id: row.id,
    title: row.title ?? undefined,
    genres: row.genres ?? null,
    description: (row as any).description ?? undefined,
    coverImageUrl: row.coverImageUrl ?? undefined,

    // Your local model expects authorId; derive it from creator
    authorId: row.creator?.id ?? '',

    status: row.status ?? 'draft',
    createdAt: String((row as any).createdAt ?? ''),
    updatedAt: String((row as any).updatedAt ?? ''),

    creator: row.creator
      ? { id: row.creator.id, displayname: row.creator.displayname ?? '' }
      : undefined,

    // optional extras if you later select them
    views: (row as any).views ?? undefined,
    likes: (row as any).likes ?? undefined,
    commentsCount: (row as any).commentsCount ?? undefined,
    ratinglevel: (row as any).ratinglevel ?? undefined,

    storyContent: undefined,
    comments: undefined,
    reactions: undefined,
  };
}

/**
 * Returns Story[] already filtered to status === "published".
 * Optional `limit` caps results client-side.
 */
export const useListPublishedStories = (limit?: number) => {
  // ❗ No options here (your generated hook doesn't support `select`)
  const query = useGetAllStories();

  const data: Story[] = useMemo(() => {
    const rows: Row[] = query.data?.stories ?? [];
    let mapped = rows.map(mapRowToStory).filter(
      s => (s.status ?? '').toLowerCase() === 'published'
    );
    if (typeof limit === 'number') {
      mapped = mapped.slice(0, Math.max(0, limit));
    }
    return mapped;
  }, [query.data, limit]);

  return {
    data,                                    // Story[]
    isLoading: query.isLoading || query.isFetching,
    error: (query as any).error as Error | null,
    refetch: query.refetch,
  };
};

export default useListPublishedStories;
