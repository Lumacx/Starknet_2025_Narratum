// src/hooks/useListPublishedStories.ts
'use client';

import { useMemo } from 'react';
import { useGetAllStories } from '@firebasegen/default-connector/react';
import type { GetAllStoriesData } from '@firebasegen/default-connector';
import type { Story } from '@/lib/types';

type Row = NonNullable<GetAllStoriesData['stories']>[number];

function mapRowToStory(row: Row): Story {
  return {
    id: row.id,
    title: row.title ?? undefined,
    genres: row.genres ?? null,
    description: (row as any).description ?? undefined,
    coverImageUrl: row.coverImageUrl ?? undefined,
    authorId: row.creator?.id ?? '',
    status: row.status ?? 'draft',
    createdAt: String((row as any).createdAt ?? ''),
    updatedAt: String((row as any).updatedAt ?? ''),
    creator: row.creator
      ? { id: row.creator.id, displayname: row.creator.displayname ?? '' }
      : undefined,
    views: (row as any).views ?? undefined,
    likes: (row as any).likes ?? undefined,
    commentsCount: (row as any).commentsCount ?? undefined,
    ratinglevel: (row as any).ratinglevel ?? undefined,
    storyContent: undefined,
    comments: undefined,
    reactions: undefined,
  };
}

export const useListPublishedStories = (limit?: number) => {
  const query = useGetAllStories(); // no options; we’ll map locally

  const data: Story[] = useMemo(() => {
    const rows: Row[] = query.data?.stories ?? [];
    let mapped = rows.map(mapRowToStory).filter(
      s => (s.status ?? '').toLowerCase() === 'published'
    );
    if (typeof limit === 'number') mapped = mapped.slice(0, Math.max(0, limit));
    return mapped;
  }, [query.data, limit]);

  return {
    data,
    isLoading: query.isLoading || query.isFetching,
    error: (query as any).error as Error | null,
    refetch: query.refetch,
  };
};

export default useListPublishedStories;
