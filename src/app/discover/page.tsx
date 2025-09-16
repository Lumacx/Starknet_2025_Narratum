// app/discover/page.tsx
'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamicImport  from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Story } from '@/lib/types';
import { useListPublishedStories } from '@/hooks/useListPublishedStories';
import GenreMultiSelect from '@/components/GenreMultiSelect';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { Heart, Feather, BookOpen, Flag, Crown, Circle, X, Bot, Youtube as YoutubeIcon } from 'lucide-react';

// Prevent SSG/prerender issues with search params etc.
export const dynamic = 'force-dynamic';

// Lazy-load the YouTube player (client-only)
const YoutubeVideoPlayer = dynamicImport(
  () => import('@/components/YoutubeVideoPlayer'),
  { ssr: false }
);

/* ----------------------------- Constants ----------------------------- */
const GENRE_OPTIONS = [
  'Fantasy','Sci-Fi','Mystery','Horror','Romance','Adventure','Children','Comedy','Drama','Action','Other'
] as const;

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'all', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
];

type StoryTypeKey = 'short' | 'novela' | 'campaign' | 'unknown';
type PlanKey = 'basic' | 'premium' | 'convai' | 'unknown';
type StoryTypeSelectable = Exclude<StoryTypeKey, 'unknown'>;
type PlanSelectable = Exclude<PlanKey, 'unknown'>;

const TYPE_PILLS: readonly StoryTypeSelectable[] = ['short', 'novela', 'campaign'] as const;
const PLAN_PILLS: readonly PlanSelectable[] = ['basic', 'premium', 'convai'] as const;

/* ----------------------------- Helpers ----------------------------- */
const DEFAULT_AVATAR =
  'https://placehold.co/40x40/233446/E0C9A0?text=%F0%9F%91%A4';

function norm(x?: string | null) {
  return (x ?? '').toString().trim().toLowerCase();
}

function getOwnerId(s: Partial<Story> & Record<string, any>): string | undefined {
  const d: any = s as any;
  return (
    d.ownerId ||
    d.ownerUid ||
    d.ownerID ||
    d.creatorUid ||
    d.creatorId ||
    d.userId ||
    d.creator?.uid ||
    d.creator?.id ||
    d.metadata?.ownerId
  )?.toString();
}
function getCreatorName(s: Partial<Story> & Record<string, any>): string | undefined {
  const d: any = s as any;
  return (
    d.creator?.displayname ||
    d.creator?.name ||
    d.displayname ||
    d.authorName ||
    d.creatorName ||
    d.metadata?.authorName ||
    d.metadata?.creatorName
  )?.toString();
}
function getCreatorPhoto(s: Partial<Story> & Record<string, any>): string | undefined {
  const d: any = s as any;
  return (
    d.creator?.photoURL ||
    d.creator?.photoUrl ||
    d.creator?.avatar ||
    d.creator?.avatarUrl ||
    d.avatarUrl ||
    d.authorPhotoURL ||
    d.metadata?.authorPhotoURL
  )?.toString();
}
function getSynopsis(s: Partial<Story> & Record<string, any>): string {
  const d: any = s as any;
  return (
    d.synopsis ||
    d.description ||
    d.summary ||
    d.metadata?.synopsis ||
    'No synopsis provided.'
  );
}

function getStoryType(s: Partial<Story> & Record<string, any>): StoryTypeKey {
  const candidates = [
    norm((s as any).storyType),
    norm((s as any).mode),
    norm((s as any).category),
    norm((s as any).type),
    norm((s as any).metadata?.storyType),
    norm((s as any).metadata?.mode),
  ].filter(Boolean);

  for (const c of candidates) {
    if (c.includes('short')) return 'short';
    if (c.includes('novel') || c.includes('novela')) return 'novela';
    if (c.includes('campaign')) return 'campaign';
  }
  const slides = Number((s as any).pageCount ?? (s as any).slides ?? (s as any).pages ?? 0);
  if (!Number.isNaN(slides) && slides > 0 && slides <= 10) return 'short';
  return 'unknown';
}

function hasConvAI(s: Partial<Story> & Record<string, any>): boolean {
  const d: any = s as any;
  const m: any = d.metadata || {};
  const c: any = d.creator || {};
  const candidates = [
    d.elevenlabsAgentId,
    d.elevenLabsAgentId,
    d.voiceAgentId,
    d.agentId,
    d.agent?.id,
    m.elevenlabsAgentId,
    m.elevenLabsAgentId,
    m.voiceAgentId,
    m.agentId,
    c.elevenlabsAgentId,
    c.elevenLabsAgentId,
    c.voiceAgentId,
    c.agentId,
  ];
  return candidates.some((v) =>
    typeof v === 'string' ? v.trim().length > 0 : Boolean(v)
  );
}

function getPlan(s: Partial<Story> & Record<string, any>): PlanKey {
  if (hasConvAI(s)) return 'convai';

  const p = norm((s as any).creatorPlan) || norm((s as any).plan) || norm((s as any).metadata?.plan);
  if (p === 'convai') return 'convai';
  if (['premium', 'paid', 'pro'].includes(p)) return 'premium';
  if (['basic', 'free', 'freemium', 'starter'].includes(p)) return 'basic';
  if ((s as any).isPremium === true) return 'premium';
  return 'basic';
}

function getLanguageCode(s: Partial<Story> & Record<string, any>): string | undefined {
  const d: any = s as any;
  const cand = [d.language, d.lang, d.metadata?.language, d.metadata?.lang, d.locale]
    .map((v: any) => norm(v))
    .find(Boolean);
  if (!cand) return undefined;
  if (/^[a-z]{2}$/.test(cand)) return cand;
  const map: Record<string, string> = {
    english: 'en', spanish: 'es', espanol: 'es', portuguese: 'pt', french: 'fr', german: 'de',
    italian: 'it', japanese: 'ja', korean: 'ko', chinese: 'zh', hindi: 'hi', arabic: 'ar'
  };
  return map[cand] || undefined;
}

/** Visual config */
const TYPE_STYLES: Record<StoryTypeKey, {
  border: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  label: string;
  Icon: React.FC<any>;
}> = {
  short: {
    border: 'border-teal-500',
    glow: 'shadow-[0_0_0_1px_rgba(20,184,166,0.35),0_6px_24px_rgba(20,184,166,0.25)]',
    badgeBg: 'bg-teal-500/90',
    badgeText: 'text-white',
    label: 'Short Story',
    Icon: Feather,
  },
  novela: {
    border: 'border-violet-500',
    glow: 'shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_6px_24px_rgba(139,92,246,0.25)]',
    badgeBg: 'bg-violet-500/90',
    badgeText: 'text-white',
    label: 'Novela',
    Icon: BookOpen,
  },
  campaign: {
    border: 'border-amber-400',
    glow: 'shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_6px_24px_rgba(251,191,36,0.25)]',
    badgeBg: 'bg-amber-400/90',
    badgeText: 'text-white',
    label: 'Campaign',
    Icon: Flag,
  },
  unknown: {
    border: 'border-[#4A5C6E]',
    glow: 'shadow-none',
    badgeBg: 'bg-slate-500/80',
    badgeText: 'text-white',
    label: 'Story',
    Icon: Feather,
  },
};

const PLAN_STYLES: Record<PlanKey, {
  badgeBg: string; badgeText: string; label: string; Icon: React.FC<any>;
}> = {
  basic:   { badgeBg: 'bg-slate-700',  badgeText: 'text-white', label: 'Basic',   Icon: Circle },
  premium: { badgeBg: 'bg-rose-500',   badgeText: 'text-white', label: 'Premium', Icon: Crown },
  convai:  { badgeBg: 'bg-indigo-500', badgeText: 'text-white', label: 'ConvAI',  Icon: Bot },
  unknown: { badgeBg: 'bg-slate-500',  badgeText: 'text-white', label: '—',       Icon: Circle },
};

/* ------------------------- Reusable UI: Filter Pill ------------------------ */
function FilterPill({
  active,
  onClick,
  children,
  ringClass,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ringClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition
        text-[#3A4B5C] dark:text-white
        ${active ? `bg-white/10 dark:bg-white/10 ${ringClass ?? 'ring-2 ring-[#BFA071]'} border-transparent` : 'border-white/30 hover:bg-white/5'}
      `}
    >
      {children}
    </button>
  );
}

/* ------------------------------- Favorites UI ------------------------------ */
function Star({
  filled, onClick, onMouseEnter, onMouseLeave, size=22
}: {
  filled: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  size?: number;
}) {
  return (
    <svg
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`cursor-pointer transition-transform ${filled ? 'scale-110' : ''}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  );
}

function StarRating({
  storyId,
  initialUserRating,
  average,
  count,
  userReadCount,
  userRatedUniqueCount,
  hasReadThisStory,
  hasRatedThisStory,
  onRated
}: {
  storyId: string;
  initialUserRating?: number | null;
  average?: number;
  count?: number;
  userReadCount: number;
  userRatedUniqueCount: number;
  hasReadThisStory: boolean;
  hasRatedThisStory: boolean;
  onRated?: () => void;
}) {
  const { user } = useAuth();
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [userRating, setUserRating] = useState<number | null>(initialUserRating ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUserRating(initialUserRating ?? null);
  }, [initialUserRating]);

  const displayAverage = useMemo(() => {
    if (typeof average === 'number' && typeof count === 'number' && count > 0) {
      return `${average.toFixed(1)} (${count})`;
    }
    return 'No ratings yet';
  }, [average, count]);

  const allowedToRate = useMemo(() => {
    if (!user?.uid) return false;
    if (hasRatedThisStory) return true;
    if (hasReadThisStory) return true;
    return userRatedUniqueCount < userReadCount;
  }, [user?.uid, hasRatedThisStory, hasReadThisStory, userRatedUniqueCount, userReadCount]);

  const handleSetRating = async (value: number) => {
    if (!user?.uid) {
      alert('Sign in to rate.');
      return;
    }
    if (!storyId) return;

    if (!allowedToRate) {
      const remaining = Math.max(0, userReadCount - userRatedUniqueCount);
      alert(
        remaining > 0
          ? `You have ${remaining} rating star(s) left. Read a story or use a remaining star to rate.`
          : 'You’ve used all your rating stars. Read more stories to unlock more ratings.'
      );
      return;
    }

    setSaving(true);
    try {
      await runTransaction(db, async (tx) => {
        const storyRef = doc(db, 'stories', storyId);
        const userRatingRef = doc(db, 'stories', storyId, 'ratings', user.uid);
        const userRatingMirrorRef = doc(db, 'users', user.uid, 'ratings', storyId);

        const storySnap = await tx.get(storyRef);
        const prevCount = (storySnap.data()?.ratingCount ?? 0) as number;
        const prevSum   = (storySnap.data()?.ratingSum   ?? 0) as number;

        const userSnap = await tx.get(userRatingRef);
        const hadRating = userSnap.exists();
        const oldVal = hadRating ? (userSnap.data()?.rating ?? 0) as number : 0;

        let newCount = prevCount;
        let newSum   = prevSum;

        if (!hadRating) {
          newCount = prevCount + 1;
          newSum   = prevSum + value;
        } else {
          newSum = prevSum - oldVal + value;
        }

        tx.set(userRatingRef,       { rating: value, updatedAt: serverTimestamp() }, { merge: true });
        tx.set(userRatingMirrorRef, { rating: value, updatedAt: serverTimestamp(), storyId }, { merge: true });
        tx.set(
          storyRef,
          {
            ratingCount: newCount,
            ratingSum: newSum,
            averageRating: newCount > 0 ? newSum / newCount : null,
          },
          { merge: true }
        );
      });

      setUserRating(value);
      onRated?.();
    } catch (e) {
      console.error('Rating save failed', e);
      alert('Could not save rating. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const stars = [1,2,3,4,5];

  const tip = !allowedToRate
    ? (hasReadThisStory
        ? ''
        : (userRatedUniqueCount < userReadCount
           ? `You have ${userReadCount - userRatedUniqueCount} rating star(s) left`
           : 'Read more stories to unlock more ratings'))
    : '';

  return (
    <div className="relative group flex flex-col items-center gap-1">
      <div
        className={`flex ${saving ? 'opacity-70 pointer-events-none' : ''} ${!allowedToRate ? 'opacity-60' : ''}`}
        aria-disabled={!allowedToRate}
        title={tip}
      >
        {stars.map((s) => {
          const active = hoverValue ? s <= hoverValue : s <= (userRating ?? 0);
          return (
            <span
              key={s}
              className={`${!allowedToRate ? 'pointer-events-none' : 'cursor-pointer'}`}
            >
              <Star
                filled={active}
                onClick={() => handleSetRating(s)}
                onMouseEnter={() => setHoverValue(s)}
                onMouseLeave={() => setHoverValue(null)}
              />
            </span>
          );
        })}
      </div>

      {!allowedToRate && tip && (
        <div className="absolute -top-7 w-max max-w-[240px] text-[11px] px-2 py-1 rounded bg-black/80 text-white opacity-0 group-hover:opacity-100 transition pointer-events-none z-30">
          {tip}
        </div>
      )}

      <p className="text-[11px] text-[#8FA0AF]">{displayAverage}</p>
    </div>
  );
}

/* ------------------------------- Favorites UI ------------------------------ */
function FavoriteButton({
  storyId,
  initialIsFav
}: {
  storyId: string;
  initialIsFav: boolean;
}) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(initialIsFav);
  const [busy, setBusy] = useState(false);

  useEffect(() => setIsFav(initialIsFav), [initialIsFav]);

  const toggleFavorite = async () => {
    if (!user?.uid) {
      alert('Sign in to add favorites.');
      return;
    }
    setBusy(true);
    try {
      const favRef = doc(db, 'users', user.uid, 'favorites', storyId);
      if (isFav) {
        await deleteDoc(favRef);
        setIsFav(false);
      } else {
        await setDoc(favRef, { createdAt: serverTimestamp(), storyId });
        setIsFav(true);
      }
    } catch (e) {
      console.error('Favorite toggle failed', e);
      alert('Could not update favorite. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={busy}
      className={`absolute top-2 right-2 z-30 rounded-full p-2 border transition
        ${isFav ? 'bg-red-600/90 border-red-300 text-white' : 'bg-black/40 border-white/40 text-white'}
        hover:scale-105`}
      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart className={`${isFav ? 'fill-white' : ''}`} size={18}/>
    </button>
  );
}

/* ------------------------------ INNER PAGE ------------------------------ */
function CatalogPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'recent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [displayedStories, setDisplayedStories] = useState<Story[]>([]);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [userRatings, setUserRatings] = useState<Record<string, number | null>>({});
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>({});

  // Author / owner filter
  const [ownerIdFilter, setOwnerIdFilter] = useState<string | null>(null);

  // Other filters
  const [storyTypeFilter, setStoryTypeFilter] = useState<'all' | StoryTypeSelectable>('all');
  const [planFilter, setPlanFilter] = useState<'all' | PlanSelectable>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');

  // Anti-abuse tracking
  const [userReadsSet, setUserReadsSet] = useState<Record<string, true>>({});
  const [userRatedSet, setUserRatedSet] = useState<Record<string, true>>({});

  // Teaser modal state using the reusable component props
  const [teaserOpen, setTeaserOpen] = useState(false);
  const [teaserUrl, setTeaserUrl] = useState<string | null>(null);

  const userReadCount = useMemo(() => Object.keys(userReadsSet).length, [userReadsSet]);
  const userRatedUniqueCount = useMemo(() => Object.keys(userRatedSet).length, [userRatedSet]);

  const { user } = useAuth();
  const { data, isLoading, error } = useListPublishedStories();

  /* ---------- Build a lookup of owners by name (for search) ---------- */
  const ownerNameIndex = useMemo(() => {
    const byId: Record<string, string> = {};
    const nameToIds: Record<string, Set<string>> = {};
    for (const s of allStories) {
      const id = getOwnerId(s);
      if (!id) continue;
      const name = getCreatorName(s) || 'Unknown Author';
      byId[id] = name;
      const key = norm(name);
      if (!nameToIds[key]) nameToIds[key] = new Set();
      nameToIds[key].add(id);
    }
    return { byId, nameToIds };
  }, [allStories]);

  /* ---------- Initial data ---------- */
  useEffect(() => {
    const stories = data ?? [];
    setAllStories(stories);
    setDisplayedStories(stories);
  }, [data]);

  /* ---------- Read ?owner=<uid> from URL ---------- */
  useEffect(() => {
    const qOwner = params.get('owner');
    if (qOwner && qOwner !== ownerIdFilter) {
      setOwnerIdFilter(qOwner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  /* ---------- User mirrors ---------- */
  useEffect(() => {
    if (!user?.uid) {
      setUserRatings({});
      setUserFavorites({});
      setUserReadsSet({});
      setUserRatedSet({});
      return;
    }

    const unsubFav = onSnapshot(
      collection(db, 'users', user.uid, 'favorites'),
      (snap) => {
        const map: Record<string, boolean> = {};
        snap.forEach((d) => { map[d.id] = true; });
        setUserFavorites(map);
      },
      (err) => console.error('[favorites onSnapshot] error:', err?.code || err, err)
    );

    const unsubReads = onSnapshot(
      collection(db, 'users', user.uid, 'reads'),
      (snap) => {
        const map: Record<string, true> = {};
        snap.forEach((d) => { map[d.id] = true; });
        setUserReadsSet(map);
      },
      (err) => console.error('[reads onSnapshot] error:', err?.code || err, err)
    );

    const unsubUserRatingsMirror = onSnapshot(
      collection(db, 'users', user.uid, 'ratings'),
      (snap) => {
        const setMap: Record<string, true> = {};
        const userRatingsVal: Record<string, number | null> = {};
        snap.forEach((d) => {
          setMap[d.id] = true;
          const r = (d.data() as any)?.rating;
          userRatingsVal[d.id] = typeof r === 'number' ? r : null;
        });
        setUserRatedSet(setMap);
        setUserRatings((prev) => ({ ...prev, ...userRatingsVal }));
      },
      (err) => console.error('[user ratings mirror onSnapshot] error:', err?.code || err, err)
    );

    (async () => {
      const list = data ?? [];
      const map: Record<string, number | null> = {};
      await Promise.all(
        list.map(async (s) => {
          if (!s.id) return;
          try {
            const rRef = doc(db, 'stories', s.id, 'ratings', user.uid);
            const rSnap = await getDoc(rRef);
            if (rSnap.exists()) {
              map[s.id] = (rSnap.data() as any)?.rating ?? null;
            }
          } catch { /* ignore */ }
        })
      );
      if (Object.keys(map).length) setUserRatings((prev) => ({ ...map, ...prev }));
    })();

    return () => {
      unsubFav();
      unsubReads();
      unsubUserRatingsMirror();
    };
  }, [user?.uid, data]);

  /* ---------- Filtering ---------- */
  const applyFiltersAndSearch = (stories: Story[]) => {
    let filtered = [...stories];

    switch (activeFilter) {
      case 'popular':
        filtered = [...filtered].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        break;
      case 'recent':
        filtered = [...filtered].sort(
          (a, b) =>
            new Date((b as any).createdAt ?? '').getTime() - new Date((a as any).createdAt ?? '').getTime()
        );
        break;
      default:
        break;
    }

    if (selectedGenres.length > 0) {
      filtered = filtered.filter(story =>
        (story as any).genres?.some((genre: string) => selectedGenres.includes(genre))
      );
    }

    if (storyTypeFilter !== 'all') {
      filtered = filtered.filter(s => getStoryType(s) === storyTypeFilter);
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(s => getPlan(s) === planFilter);
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter((s) => getLanguageCode(s) === languageFilter);
    }

    if (ownerIdFilter) {
      filtered = filtered.filter((s) => getOwnerId(s) === ownerIdFilter);
    }

    return filtered;
  };

  useEffect(() => {
    setDisplayedStories(applyFiltersAndSearch(allStories));
  }, [activeFilter, selectedGenres, storyTypeFilter, planFilter, languageFilter, ownerIdFilter, allStories]);

  useEffect(() => {
    const parts: string[] = [];

    if (
      activeFilter !== 'all' ||
      selectedGenres.length > 0 ||
      storyTypeFilter !== 'all' ||
      planFilter !== 'all' ||
      languageFilter !== 'all' ||
      ownerIdFilter
    ) {
      if (activeFilter !== 'all') parts.push(`Filter: ${activeFilter}`);
      if (selectedGenres.length > 0) parts.push(`Genres: ${selectedGenres.join(', ')}`);
      if (storyTypeFilter !== 'all') parts.push(`Type: ${storyTypeFilter}`);
      if (planFilter !== 'all') parts.push(`Plan: ${PLAN_STYLES[planFilter].label}`);
      if (languageFilter !== 'all') {
        const label = LANGUAGE_OPTIONS.find(l => l.code === languageFilter)?.label || languageFilter;
        parts.push(`Language: ${label}`);
      }
      if (ownerIdFilter) {
        const name = ownerNameIndex.byId[ownerIdFilter] || 'Unknown Author';
        parts.push(`Author: ${name}`);
      }
      setSearchMessage(parts.join(' • '));
    } else if (!searchQuery.trim()) {
      setSearchMessage('');
    }
  }, [activeFilter, selectedGenres, storyTypeFilter, planFilter, languageFilter, ownerIdFilter, searchQuery, ownerNameIndex.byId]);

  const setOwnerFilter = (uid: string | null) => {
    setOwnerIdFilter(uid);
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (uid) sp.set('owner', uid); else sp.delete('owner');
    router.replace(`/discover${sp.toString() ? `?${sp.toString()}` : ''}`);
  };

  const handleFilterClick = (filter: 'all'|'popular'|'recent') => {
    setActiveFilter(filter);
    setSearchQuery('');
  };

  /* ---------- Search: author name or semantic title ---------- */
  const handleSemanticSearch = async () => {
    const raw = searchQuery.trim();
    if (!raw) {
      setSearchMessage('Please enter a search query.');
      setDisplayedStories(applyFiltersAndSearch(allStories));
      return;
    }

    const authorPrefixMatch = raw.match(/^author:\s*(.+)$/i);
    const nameCandidate = authorPrefixMatch ? authorPrefixMatch[1] : raw;

    const wanted = norm(nameCandidate);
    const matchingOwnerIds = new Set<string>();
    for (const [nameKey, idSet] of Object.entries(ownerNameIndex.nameToIds)) {
      if (nameKey.includes(wanted) && (idSet as Set<string>).size) {
        (idSet as Set<string>).forEach((id) => matchingOwnerIds.add(id));
      }
    }

    if (matchingOwnerIds.size > 0) {
      const idsArr = Array.from(matchingOwnerIds);
      if (idsArr.length === 1) {
        setOwnerFilter(idsArr[0]);
      } else {
        setOwnerFilter(null);
        const subset = allStories.filter((s) => {
          const oid = getOwnerId(s);
          return oid ? matchingOwnerIds.has(oid) : false;
        });
        const finalList = applyFiltersAndSearch(subset);
        setDisplayedStories(finalList);
        setSearchMessage(`Found ${finalList.length} stories from ${idsArr.length} matching author(s).`);
      }
      return;
    }

    // Fallback: existing semantic title search
    setSearchMessage('Searching for stories...');
    setDisplayedStories([]);

    try {
      const storyTitles = allStories.map(story => (story as any).title || '');
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery: raw, storyTitles }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      const { matchedTitles } = result;
      if (Array.isArray(matchedTitles) && matchedTitles.length > 0) {
        let filteredBySearch = allStories.filter(story => matchedTitles.includes((story as any).title));
        filteredBySearch = applyFiltersAndSearch(filteredBySearch);
        setDisplayedStories(filteredBySearch);
        setSearchMessage(`Found ${filteredBySearch.length} matching stories.`);
      } else {
        setDisplayedStories(applyFiltersAndSearch(allStories));
        setSearchMessage('No semantically related stories found from your titles.');
      }
    } catch (error: any) {
      console.error('Semantic search error:', error);
      setSearchMessage(`Error during search: ${error.message}. Please try again.`);
      setDisplayedStories(applyFiltersAndSearch(allStories));
    }
  };

  const logRead = async (storyId: string) => {
    if (!user?.uid || !storyId) return;
    try {
      const ref = doc(db, 'users', user.uid, 'reads', storyId);
      await setDoc(ref, { storyId, lastReadAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('[logRead] failed', e);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center p-5 md:p-10 
      bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] 
      text-[#3A4B5C] dark:text-[#E0C9A0] font-sans box-border">

      {/* Reusable Teaser Modal */}
      <YoutubeVideoPlayer
        videoUrl={teaserUrl}
        isOpen={teaserOpen}
        onClose={() => { setTeaserOpen(false); setTeaserUrl(null); }}
      />

      <div className="fixed top-7 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Back to Landing
        </Link>
      </div>

      <div className="catalog-container w-full max-w-6xl text-center pt-16">
        <header className="page-header mb-8">
          <h1 className="font-['Cinzel_Decorative'] text-5xl md:text-6xl font-bold text-[#3A4B5C] dark:text-[#E0C9A0] m-0 tracking-wide">
            NARRATUM
          </h1>
          <h2 className="font-['Lato'] text-xl md:text-2xl font-bold uppercase tracking-wider text-[#3A4B5C] dark:text-[#E0C9A0] m-0">
            CATALOG OF STORIES
          </h2>

          {/* Legend (unchanged visuals) */}
          <div className="mt-4 flex flex-wrap items-center gap-3 justify-center text-sm">
            <div className="flex flex-wrap items-center gap-3">
              {(['short','novela','campaign'] as const).map((k) => {
                const Ico = TYPE_STYLES[k].Icon;
                return (
                  <FilterPill
                    key={k}
                    active={false}
                    onClick={() => {}}
                    ringClass="ring-2 ring-teal-300"
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${TYPE_STYLES[k].badgeBg}`}>
                      <Ico size={14}/>
                    </span>
                    {TYPE_STYLES[k].label}
                  </FilterPill>
                );
              })}
            </div>

            <div
              role="separator"
              aria-orientation="vertical"
              className="h-6 w-px mx-2 sm:mx-3 bg-[#3A4B5C]/30 dark:bg-white/30"
            />

            <div className="flex flex-wrap items-center gap-3">
              {(['basic','premium','convai'] as const).map((k) => {
                const Ico = PLAN_STYLES[k].Icon;
                return (
                  <FilterPill
                    key={k}
                    active={false}
                    onClick={() => {}}
                    ringClass="ring-2 ring-amber-300"
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${PLAN_STYLES[k].badgeBg}`}>
                      <Ico size={14}/>
                    </span>
                    {PLAN_STYLES[k].label}
                  </FilterPill>
                );
              })}
            </div>
           </div>
        </header>

        {/* Row 1 */}
        <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-4">
          {(['all', 'popular', 'recent'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => handleFilterClick(filter)}
              className={`font-['Lato'] text-lg font-bold px-3 py-1.5 border-b-2 transition-colors duration-300 focus:outline-none ${
                activeFilter === filter
                  ? 'text-[#3A4B5C] dark:text-[#E0C9A0] border-[#3A4B5C] dark:border-[#E0C9A0]'
                  : 'text-[#3A4B5C] dark:text-[#E0C9A0] border-transparent hover:border-[#3A4B5C] dark:hover:border-[#E0C9A0]'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border-2 border-[#4A5C6E] bg-[#233446] text-[#E0C9A0] focus:outline-none"
            title="Filter by Language"
          >
            {LANGUAGE_OPTIONS.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          <GenreMultiSelect
            genresList={GENRE_OPTIONS as unknown as string[]}
            selectedGenres={selectedGenres}
            onSelectedGenresChange={setSelectedGenres}
          />
        </nav>

        {/* Row 2 */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-4 w-full">
          <div className="flex items-center gap-3 w-full max-w-xl">
            <input
              type="text"
              placeholder='Search stories… try: author: Ana Perez'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-grow p-3 rounded-lg border-2 border-[#4A5C6E] bg-[#233446] text-[#E0C9A0] placeholder-[#8FA0AF] focus:outline-none focus:border-[#BFA071]"
            />
            <button
              onClick={handleSemanticSearch}
              disabled={isLoading}
              className="bg-[#BFA071] text-[#1A2533] py-3 px-6 rounded-lg font-bold text-sm uppercase tracking-wide transition-colors duration-300 hover:bg-[#E0C9A0] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Active author chip */}
        {ownerIdFilter && (
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 bg-[#233446] text-[#E0C9A0] border border-[#BFA071] px-3 py-1 rounded-full">
              Author: <strong>{ownerNameIndex.byId[ownerIdFilter] || 'Unknown Author'}</strong>
              <button
                onClick={() => setOwnerFilter(null)}
                className="p-1 hover:bg-white/10 rounded-full"
                aria-label="Clear author filter"
                title="Clear author filter"
              >
                <X size={16} />
              </button>
            </span>
          </div>
        )}

        {searchMessage && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-blue-900 text-blue-200 border border-blue-700">
            {searchMessage}
          </div>
        )}

        <main className="story-grid flex flex-wrap justify-center gap-8">
          {displayedStories.length > 0 ? (
            displayedStories.map(story => {
              const avg = typeof (story as any).averageRating === 'number'
                ? (story as any).averageRating as number
                : (story as any).ratingCount > 0
                  ? ((story as any).ratingSum ?? 0) / ((story as any).ratingCount ?? 1)
                  : undefined;

              const count = (story as any).ratingCount as number | undefined;
              const my = userRatings[(story as any).id!];

              const readHref = `/ereader?storyId=${encodeURIComponent((story as any).id!)}&back=%2Fdiscover`;

              const typeKey = getStoryType(story);
              const planKey = getPlan(story);
              const typeStyle = TYPE_STYLES[typeKey];
              const planStyle = PLAN_STYLES[planKey];

              const hasReadThis = !!userReadsSet[(story as any).id!];
              const hasRatedThis = !!userRatedSet[(story as any).id!];

              const creatorName = getCreatorName(story) || 'Unknown Author';
              const ownerId = getOwnerId(story);
              const authorPhoto = getCreatorPhoto(story) || DEFAULT_AVATAR;

              const teaser = (story as any).teaserYoutubeUrl as string | undefined;

              return (
                <div
                  key={(story as any).id}
                  className={`group/story story-card bg-[#233446] border-2 ${typeStyle.border} p-2.5 rounded-lg w-64 text-[#E0C9A0] relative transition-all duration-300 ease-in-out hover:translate-y-[-5px] hover:shadow-2xl ${typeStyle.glow}`}
                >
                  <FavoriteButton storyId={(story as any).id!} initialIsFav={!!userFavorites[(story as any).id!]}/>

                  <div className="absolute inset-1 border border-[#BFA071] rounded-md pointer-events-none z-10"></div>

                  {/* Type & Plan badges */}
                  <div className="absolute left-2 top-2 z-30 flex gap-2">
                    <span className={`px-2 py-0.5 text-[11px] rounded ${typeStyle.badgeBg} ${typeStyle.badgeText} font-bold uppercase tracking-wide inline-flex items-center gap-1.5`}>
                      {React.createElement(TYPE_STYLES[typeKey].Icon, { size: 13 })} {TYPE_STYLES[typeKey].label}
                    </span>
                  </div>
                  <div className="absolute right-12 top-2 z-30 flex gap-2">
                    <span className={`px-2 py-0.5 text-[11px] rounded ${planStyle.badgeBg} ${planStyle.badgeText} font-semibold inline-flex items-center gap-1.5`}>
                      {React.createElement(PLAN_STYLES[planKey].Icon, { size: 13 })} {PLAN_STYLES[planKey].label}
                    </span>
                  </div>

                  {/* Cover */}
                  <Link
                    href={readHref}
                    onClick={() => logRead((story as any).id!)}
                    className="card-art-container block w-full h-40 mb-4 rounded-sm overflow-hidden relative z-20"
                  >
                    <img
                      src={(story as any).coverImageUrl || 'https://placehold.co/300x200/BFA071/1A2533?text=Image+Not+Found'}
                      alt={(story as any).title || 'Untitled Story'}
                      className="w-full h-full object-cover block"
                    />
                  </Link>

                  {/* Title */}
                  <Link href={readHref} onClick={() => logRead((story as any).id!)}>
                    <h3 className="font-['Merriweather'] text-xl font-bold mb-2 leading-tight min-h-[2.6rem] z-20 relative">
                      {(story as any).title || 'Untitled Story'}
                    </h3>
                  </Link>

                  {/* Genres */}
                  {(story as any).genres?.length ? (
                    <p className="text-xs text-[#8FA0AF] mb-1">{(story as any).genres.join(', ')}</p>
                  ) : null}

                  {/* Author line */}
                  <div className="mt-1">
                    {ownerId ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setOwnerFilter(ownerId);
                        }}
                        className="inline-flex items-center gap-2 text-xs text-[#8FA0AF] hover:text-[#E0C9A0] transition underline-offset-2"
                        title={`See all by ${creatorName}`}
                      >
                        <img
                          src={authorPhoto}
                          alt={`${creatorName} avatar`}
                          className="w-5 h-5 rounded-full object-cover border border-white/30"
                        />
                        <span>
                          Created by: <span className="underline">{creatorName}</span>
                        </span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-xs text-[#8FA0AF]">
                        <img
                          src={authorPhoto}
                          alt={`${creatorName} avatar`}
                          className="w-5 h-5 rounded-full object-cover border border-white/30"
                        />
                        <span>Created by: {creatorName}</span>
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  {(story as any).commentsCount !== undefined && (
                    <p className="text-sm text-[#8FA0AF] flex items-center justify-center gap-1">
                      💬 {(story as any).commentsCount} Comments
                    </p>
                  )}

                  {/* Stars */}
                  <div className="mt-2">
                    <StarRating
                      storyId={(story as any).id!}
                      initialUserRating={my ?? null}
                      average={avg}
                      count={count}
                      userReadCount={userReadCount}
                      userRatedUniqueCount={userRatedUniqueCount}
                      hasReadThisStory={hasReadThis}
                      hasRatedThisStory={hasRatedThis}
                      onRated={() => {}}
                    />
                  </div>

                  {/* Read + Teaser (single teaser button to the right) */}
                  <div className="mt-3 relative flex items-center justify-center gap-2">
                    {!hasReadThis && (
                      <span
                        className="absolute -top-2 -right-2 z-30 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow"
                        title="Reading logs a star so you can rate more"
                      >
                        Earn Stars
                      </span>
                    )}
                    <Link
                      href={readHref}
                      onClick={() => logRead((story as any).id!)}
                      className="font-['Lato'] bg-[#BFA071] text-[#1A2533] py-2.5 px-6 rounded-md text-base font-bold uppercase tracking-wide inline-block transition-colors duration-300 hover:bg-[#E0C9A0] z-20 relative"
                    >
                      READ
                    </Link>

                    {/* Only one teaser button, next to READ, for premium stories with a teaser URL */}
                    {planKey === 'premium' && !!teaser && (
                      <button
                        type="button"
                        onClick={() => { setTeaserUrl(teaser); setTeaserOpen(true); }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-white/20 bg-black/40 text-white hover:bg-black/55"
                        title="Watch teaser"
                        aria-label="Watch teaser"
                      >
                        <YoutubeIcon size={18} />
                        <span className="text-sm font-semibold">Teaser</span>
                      </button>
                    )}
                  </div>

                  {/* Hover info box */}
                  <div
                    className="pointer-events-none opacity-0 group-hover/story:opacity-100 transition-opacity duration-200
                               absolute inset-x-2 bottom-24 z-40"
                  >
                    <div className="bg-black/85 text-white text-xs rounded-md p-3 border border-white/10 shadow-xl">
                      <div className="font-semibold mb-1">Synopsis</div>
                      <div className="line-clamp-5 text-[12px]">
                        {getSynopsis(story)}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[12px] opacity-90">
                        <img
                          src={authorPhoto}
                          alt={`${creatorName} avatar`}
                          className="w-4 h-4 rounded-full object-cover border border-white/30"
                        />
                        <span>Created by: <span className="font-medium">{creatorName}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            !isLoading && <p className="text-lg text-gray-400">No stories to display.</p>
          )}
        </main>
      </div>
    </div>
  );
};

/* ----------------------- PAGE EXPORT WITH SUSPENSE ----------------------- */
export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading discover…</div>}>
      <CatalogPageInner />
    </Suspense>
  );
}
