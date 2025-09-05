// src/hooks/useListPublishedStories.ts
'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  limit as fsLimit,
  query,
  where,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import type { Story } from '@/lib/types';

/* ----------------------------- helpers ------------------------------ */
function tsToIso(x: any): string | undefined {
  if (!x) return undefined;
  try {
    if (typeof (x as Timestamp)?.toDate === 'function') {
      return (x as Timestamp).toDate().toISOString();
    }
  } catch {}
  const s = String(x ?? '');
  return s || undefined;
}

function normalizeStoryType(row: any): 'Short' | 'Novela' | 'Campaign' | 'Unknown' {
  const raw =
    row?.category ??
    row?.type ??
    row?.storyType ??
    row?.metadata?.category ??
    '';
  const s = String(raw || '').toLowerCase();
  if (s.includes('short')) return 'Short';
  if (s.includes('novela') || s.includes('novel') || s.includes('novella')) return 'Novela';
  if (s.includes('campaign') || (row?.metadata?.campaignName && String(row.metadata.campaignName).trim() !== '')) {
    return 'Campaign';
  }
  return 'Unknown';
}

function mapDocToStory(d: { id: string; data: DocumentData }): Story {
  const row = d.data;

  // ratings (supports ratingSum/ratingCount or precomputed averages)
  const ratingCount = typeof row?.ratingCount === 'number' ? row.ratingCount : 0;
  const ratingSum   = typeof row?.ratingSum   === 'number' ? row.ratingSum   : 0;
  const computedAvg = ratingCount > 0 ? ratingSum / ratingCount : null;
  const averageRating =
    typeof row?.averageRating === 'number'
      ? row.averageRating
      : typeof row?.ratingAvg === 'number'
        ? row.ratingAvg
        : typeof row?.avgRating === 'number'
          ? row.avgRating
          : computedAvg;

  // Premium mapping (optional object)
  const premiumRow = row?.premium || {};
  const convaiAgentId = typeof premiumRow?.convaiAgentId === 'string' ? premiumRow.convaiAgentId : undefined;
  const teaserVideoUrl =
    typeof premiumRow?.teaserVideoUrl === 'string' ? premiumRow.teaserVideoUrl : undefined;
  const freeNavigationIndex =
    typeof premiumRow?.freeNavigationIndex === 'boolean' ? premiumRow.freeNavigationIndex : undefined;

  const hasPremium =
    convaiAgentId != null || teaserVideoUrl != null || freeNavigationIndex != null;

  const s: any = {
    id: d.id,

    // ownership / access
    ownerUid: row?.ownerUid,
    authorId: row?.creator?.id ?? row?.ownerUid ?? undefined,
    visibility: row?.visibility,
    status: row?.status ?? 'draft',

    // core
    title: row?.title ?? undefined,
    synopsis: row?.synopsis ?? undefined,
    description: row?.description ?? undefined,
    genres: Array.isArray(row?.genres)
      ? row.genres
      : typeof row?.genres === 'string'
        ? row.genres.split(',').map((g: string) => g.trim()).filter(Boolean)
        : null,
    category: row?.category,
    storyType: normalizeStoryType(row), // <<< added normalized type
    pageCount: typeof row?.pageCount === 'number' ? row.pageCount : undefined,
    language: row?.language,

    // media
    coverImageUrl: row?.coverImageUrl ?? undefined,

    // timestamps
    createdAt: tsToIso(row?.createdAt) ?? '',
    updatedAt: tsToIso(row?.updatedAt) ?? '',
    publishedAt: tsToIso(row?.publishedAt),

    // denormalized creator
    creator: row?.creator
      ? {
          id: row.creator.id,
          displayname: row.creator.displayname ?? '',
          avatarUrl: row.creator.avatarUrl ?? undefined,
        }
      : undefined,

    // metrics
    views: typeof row?.views === 'number' ? row.views : undefined,
    likes: typeof row?.likes === 'number' ? row.likes : undefined,
    commentsCount:
      typeof row?.commentsCount === 'number' ? row.commentsCount : undefined,

    // ratings
    ratingCount,
    ratingSum,
    averageRating,          // your field
    ratingsAvg: averageRating ?? undefined, // alias for consumers

    // relations not used here
    storyContent: undefined,
    comments: undefined,
    reactions: undefined,

    // premium (only set if present)
    premium: hasPremium
      ? {
          convaiAgentId,
          teaserVideoUrl,
          freeNavigationIndex,
        }
      : undefined,

    // carry-through metadata if present
    metadata: row?.metadata,
  };

  // legacy isPublic flag (kept for client filter)
  if (typeof row?.isPublic === 'boolean') {
    s.isPublic = row.isPublic;
  }

  return s as Story;
}

/* ------------------------------- hook -------------------------------- */
export const useListPublishedStories = (take?: number) => {
  const [data, setData] = useState<Story[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const col = collection(db, 'stories');
        const lim = typeof take === 'number' ? [fsLimit(take)] : [];

        // client-side OR union
        const [q1, q2, q3] = await Promise.all([
          getDocs(query(col, where('status', '==', 'published'), ...lim)),
          getDocs(query(col, where('visibility', '==', 'public'), ...lim)),
          getDocs(query(col, where('isPublic', '==', true), ...lim)),
        ]);

        if (cancelled) return;

        const bag = new Map<string, Story>();
        for (const snap of [q1, q2, q3]) {
          snap.forEach(docSnap => {
            bag.set(docSnap.id, mapDocToStory({ id: docSnap.id, data: docSnap.data() }));
          });
        }

        setData(Array.from(bag.values()));
      } catch (e: any) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [take, reloadTick]);

  // OR semantics: published OR public visibility OR legacy isPublic
  const filtered = useMemo(() => {
    return (data || []).filter((s: any) => {
      const statusOk = (s.status ?? '').toLowerCase() === 'published';
      const visOk = (s.visibility ?? '').toLowerCase() === 'public';
      const isPub = (s as any).isPublic === true;
      return statusOk || visOk || isPub;
    });
  }, [data]);

  return {
    data: filtered,
    isLoading,
    error,
    refetch: () => setReloadTick(t => t + 1),
  };
};

export default useListPublishedStories;
