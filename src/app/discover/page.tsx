// app/discover/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import { Heart, Feather, BookOpen, Flag, Crown, Circle } from 'lucide-react';

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
type PlanKey = 'free' | 'paid' | 'unknown';

/** ✅ Narrowed types used by the pills (exclude "unknown") */
type StoryTypeSelectable = Exclude<StoryTypeKey, 'unknown'>;
type PlanSelectable = Exclude<PlanKey, 'unknown'>;

/** ✅ Constants with narrow literal unions so TS knows "unknown" can't appear */
const TYPE_PILLS: readonly StoryTypeSelectable[] = ['short', 'novela', 'campaign'] as const;
const PLAN_PILLS: readonly PlanSelectable[] = ['paid', 'free'] as const;

/* ----------------------------- Helpers ----------------------------- */
function norm(x?: string | null) {
  return (x ?? '').toString().trim().toLowerCase();
}

function getStoryType(s: Partial<Story> & Record<string, any>): StoryTypeKey {
  const candidates = [
    norm(s.storyType),
    norm(s.mode),
    norm(s.category),
    norm(s.type),
    norm(s.metadata?.storyType),
    norm(s.metadata?.mode),
  ].filter(Boolean);

  for (const c of candidates) {
    if (c.includes('short')) return 'short';
    if (c.includes('novel') || c.includes('novela')) return 'novela';
    if (c.includes('campaign')) return 'campaign';
  }
  const slides = Number(s.pageCount ?? s.slides ?? s.pages ?? 0);
  if (!Number.isNaN(slides) && slides > 0 && slides <= 10) return 'short';
  return 'unknown';
}

function getPlan(s: Partial<Story> & Record<string, any>): PlanKey {
  const planStr = norm(s.creatorPlan) || norm(s.plan) || norm(s.metadata?.plan);
  if (planStr === 'paid' || planStr === 'premium' || planStr === 'pro') return 'paid';
  if (planStr === 'free' || planStr === 'basic') return 'free';
  if (s.isPremium === true) return 'paid';
  if (s.premium && typeof s.premium === 'object') return 'paid';
  return 'unknown';
}

function getLanguageCode(s: Partial<Story> & Record<string, any>): string | undefined {
  const cand = [s.language, s.lang, s.metadata?.language, s.metadata?.lang, s.locale]
    .map((v) => norm(v))
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
  paid:   { badgeBg: 'bg-rose-500',  badgeText: 'text-white', label: 'Premium', Icon: Crown },
  free:   { badgeBg: 'bg-slate-700', badgeText: 'text-white', label: 'Free',    Icon: Circle },
  unknown:{ badgeBg: 'bg-slate-500', badgeText: 'text-white', label: '—',       Icon: Circle },
};

/* ----------------------------- Star Rating ----------------------------- */
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

/* --------------------------------- Page ---------------------------------- */

const CatalogPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'recent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [displayedStories, setDisplayedStories] = useState<Story[]>([]);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [userRatings, setUserRatings] = useState<Record<string, number | null>>({});
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>({});

  // Filters (state types don't include "unknown")
  const [storyTypeFilter, setStoryTypeFilter] = useState<'all' | StoryTypeSelectable>('all');
  const [planFilter, setPlanFilter] = useState<'all' | PlanSelectable>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');

  // Anti-abuse tracking
  const [userReadsSet, setUserReadsSet] = useState<Record<string, true>>({});
  const [userRatedSet, setUserRatedSet] = useState<Record<string, true>>({});

  const userReadCount = useMemo(() => Object.keys(userReadsSet).length, [userReadsSet]);
  const userRatedUniqueCount = useMemo(() => Object.keys(userRatedSet).length, [userRatedSet]);

  const { user } = useAuth();
  const { data, isLoading, error } = useListPublishedStories();

  useEffect(() => {
    const stories = data ?? [];
    setAllStories(stories);
    setDisplayedStories(stories);
  }, [data]);

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

  const applyFiltersAndSearch = (stories: Story[]) => {
    let filtered = [...stories];

    switch (activeFilter) {
      case 'popular':
        filtered = [...filtered].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        break;
      case 'recent':
        filtered = [...filtered].sort(
          (a, b) =>
            new Date(b.createdAt ?? '').getTime() -
            new Date(a.createdAt ?? '').getTime()
        );
        break;
      default:
        break;
    }

    if (selectedGenres.length > 0) {
      filtered = filtered.filter(story =>
        story.genres?.some(genre => selectedGenres.includes(genre))
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

    return filtered;
  };

  useEffect(() => {
    setDisplayedStories(applyFiltersAndSearch(allStories));
  }, [activeFilter, selectedGenres, storyTypeFilter, planFilter, languageFilter, allStories]);

  useEffect(() => {
    if (
      activeFilter !== 'all' ||
      selectedGenres.length > 0 ||
      storyTypeFilter !== 'all' ||
      planFilter !== 'all' ||
      languageFilter !== 'all'
    ) {
      const parts: string[] = [];
      if (activeFilter !== 'all') parts.push(`Filter: ${activeFilter}`);
      if (selectedGenres.length > 0) parts.push(`Genres: ${selectedGenres.join(', ')}`);
      if (storyTypeFilter !== 'all') parts.push(`Type: ${storyTypeFilter}`);
      if (planFilter !== 'all') parts.push(`Plan: ${planFilter}`);
      if (languageFilter !== 'all') {
        const label = LANGUAGE_OPTIONS.find(l => l.code === languageFilter)?.label || languageFilter;
        parts.push(`Language: ${label}`);
      }
      setSearchMessage(parts.join(' • '));
    } else if (!searchQuery.trim()) {
      setSearchMessage('');
    }
  }, [activeFilter, selectedGenres, storyTypeFilter, planFilter, languageFilter, searchQuery]);

  const handleFilterClick = (filter: 'all'|'popular'|'recent') => {
    setActiveFilter(filter);
    setSearchQuery('');
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchMessage('Please enter a search query.');
      setDisplayedStories(applyFiltersAndSearch(allStories));
      return;
    }

    setSearchMessage('Searching for stories...');
    setDisplayedStories([]);

    try {
      const storyTitles = allStories.map(story => story.title || '');
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, storyTitles }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

      const { matchedTitles } = result;
      if (Array.isArray(matchedTitles) && matchedTitles.length > 0) {
        let filteredBySearch = allStories.filter(story => matchedTitles.includes(story.title));
        filteredBySearch = applyFiltersAndSearch(filteredBySearch);
        setDisplayedStories(filteredBySearch);
        setSearchMessage(`Found ${filteredBySearch.length} matching stories.`);
      } else {
        setDisplayedStories([]);
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

  if (error) {
    return (
      <div className="text-red-500 text-center mt-10">
        Error loading published stories. Please try again later.
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center p-5 md:p-10 
      bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] 
      text-[#3A4B5C] dark:text-[#E0C9A0] font-sans box-border">

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

          {/* Interactive legend pills (now strongly typed) */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center text-sm">
            {/* Story Type Pills */}
            {TYPE_PILLS.map((k) => {
              const Ico = TYPE_STYLES[k].Icon;
              const active = storyTypeFilter === k;
              return (
                <FilterPill
                  key={k}
                  active={active}
                  onClick={() => setStoryTypeFilter((cur) => (cur === k ? 'all' : k))}
                  ringClass="ring-2 ring-teal-300"
                >
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${TYPE_STYLES[k].badgeBg}`}>
                    <Ico size={14}/>
                  </span>
                  {TYPE_STYLES[k].label}
                </FilterPill>
              );
            })}

            {/* Plan Pills */}
            {PLAN_PILLS.map((k) => {
              const Ico = PLAN_STYLES[k].Icon;
              const active = planFilter === k;
              return (
                <FilterPill
                  key={k}
                  active={active}
                  onClick={() => setPlanFilter((cur) => (cur === k ? 'all' : k))}
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

        {/* Row 2 (dropdowns removed) */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-8 w-full">
          <div className="flex items-center gap-3 w-full max-w-xl">
            <input
              type="text"
              placeholder="Search stories semantically..."
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
              const my = userRatings[story.id!];

              const readHref = `/ereader?storyId=${encodeURIComponent(story.id!)}&back=%2Fdiscover`;

              const typeKey = getStoryType(story);
              const planKey = getPlan(story);
              const typeStyle = TYPE_STYLES[typeKey];
              const planStyle = PLAN_STYLES[planKey];
              const TypeIcon = typeStyle.Icon;
              const PlanIcon = planStyle.Icon;

              const hasReadThis = !!userReadsSet[story.id!];
              const hasRatedThis = !!userRatedSet[story.id!];

              return (
                <div
                  key={story.id}
                  className={`story-card bg-[#233446] border-2 ${typeStyle.border} p-2.5 rounded-lg w-64 text-[#E0C9A0] relative transition-all duration-300 ease-in-out hover:translate-y-[-5px] hover:shadow-2xl ${typeStyle.glow}`}
                >
                  <FavoriteButton storyId={story.id!} initialIsFav={!!userFavorites[story.id!]}/>

                  <div className="absolute inset-1 border border-[#BFA071] rounded-md pointer-events-none z-10"></div>

                  <div className="absolute left-2 top-2 z-30 flex gap-2">
                    <span className={`px-2 py-0.5 text-[11px] rounded ${typeStyle.badgeBg} ${typeStyle.badgeText} font-bold uppercase tracking-wide inline-flex items-center gap-1.5`}>
                      <TypeIcon size={13}/> {typeStyle.label}
                    </span>
                  </div>
                  <div className="absolute right-12 top-2 z-30 flex gap-2">
                    <span className={`px-2 py-0.5 text-[11px] rounded ${planStyle.badgeBg} ${planStyle.badgeText} font-semibold inline-flex items-center gap-1.5`}>
                      <PlanIcon size={13}/> {planStyle.label}
                    </span>
                  </div>

                  <Link
                    href={readHref}
                    onClick={() => logRead(story.id!)}
                    className="card-art-container block w-full h-40 mb-4 rounded-sm overflow-hidden relative z-20"
                  >
                    <img
                      src={story.coverImageUrl || 'https://placehold.co/300x200/BFA071/1A2533?text=Image+Not+Found'}
                      alt={story.title || 'Untitled Story'}
                      className="w-full h-full object-cover block"
                    />
                  </Link>

                  <Link href={readHref} onClick={() => logRead(story.id!)}>
                    <h3 className="font-['Merriweather'] text-xl font-bold mb-2 leading-tight min-h-[2.6rem] z-20 relative">
                      {story.title || 'Untitled Story'}
                    </h3>
                  </Link>

                  {story.genres?.length ? (
                    <p className="text-xs text-[#8FA0AF] mb-1">{story.genres.join(', ')}</p>
                  ) : null}

                  {(story as any).creator && (
                    <p className="text-sm text-[#8FA0AF] mb-1">
                      By {(story as any).creator.displayname || 'Unknown Author'}
                    </p>
                  )}

                  {(story as any).commentsCount !== undefined && (
                    <p className="text-sm text-[#8FA0AF] flex items-center justify-center gap-1">
                      💬 {(story as any).commentsCount} Comments
                    </p>
                  )}

                  <div className="mt-2">
                    <StarRating
                      storyId={story.id!}
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

                  <div className="mt-3 relative inline-block">
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
                      onClick={() => logRead(story.id!)}
                      className="font-['Lato'] bg-[#BFA071] text-[#1A2533] py-2.5 px-6 rounded-md text-base font-bold uppercase tracking-wide inline-block transition-colors duration-300 hover:bg-[#E0C9A0] z-20 relative"
                    >
                      READ
                    </Link>
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

export default CatalogPage;
