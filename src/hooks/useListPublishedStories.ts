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
  const s = String(x);
  return s || undefined;
}

function mapDocToStory(d: { id: string; data: DocumentData }): Story {
  const row = d.data;

  // Build a Story, then tack on visibility/isPublic as extra props.
  const s: any = {
    id: d.id,
    title: row?.title ?? undefined,
    genres: Array.isArray(row?.genres) ? row.genres : null,
    description: row?.description ?? undefined,
    coverImageUrl: row?.coverImageUrl ?? undefined,

    authorId: row?.creator?.id ?? row?.ownerUid ?? '',
    status: row?.status ?? 'draft',

    createdAt: tsToIso(row?.createdAt) ?? '',
    updatedAt: tsToIso(row?.updatedAt) ?? '',

    creator: row?.creator
      ? { id: row.creator.id, displayname: row.creator.displayname ?? '' }
      : undefined,

    views: row?.views ?? undefined,
    likes: row?.likes ?? undefined,
    commentsCount: row?.commentsCount ?? undefined,
    ratinglevel: row?.ratinglevel ?? undefined,

    // not used in Discover
    storyContent: undefined,
    comments: undefined,
    reactions: undefined,
  };

  // Extras used for visibility filtering (not necessarily in your Story type)
  s.visibility = row?.visibility;
  s.isPublic = row?.isPublic;

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

        // 3 independent queries (OR via client-side union)
        const [q1, q2, q3] = await Promise.all([
          getDocs(query(col, where('status', '==', 'published'), ...lim)),
          getDocs(query(col, where('visibility', '==', 'public'), ...lim)),
          getDocs(query(col, where('isPublic', '==', true), ...lim)),
        ]);

        if (cancelled) return;

        // Union by id
        const bag = new Map<string, Story>();
        for (const snap of [q1, q2, q3]) {
          snap.forEach(doc => {
            bag.set(doc.id, mapDocToStory({ id: doc.id, data: doc.data() }));
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

  // Safety filter in client (keeps semantics even if something slips in)
  const filtered = useMemo(() => {
    return (data || []).filter((s: any) => {
      const statusOk = (s.status ?? '').toLowerCase() === 'published';
      const visOk = (s.visibility ?? '').toLowerCase() === 'public';
      const isPub = s.isPublic === true;
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
