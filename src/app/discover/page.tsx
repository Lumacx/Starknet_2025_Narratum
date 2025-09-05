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
import { Heart } from 'lucide-react';

/* ----------------------------- Constants ----------------------------- */
const GENRE_OPTIONS = [
  'Fantasy','Sci-Fi','Mystery','Horror','Romance','Adventure','Children','Comedy','Drama','Action','Other'
] as const;

/* ----------------------------- Star Rating UI ----------------------------- */
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
  count
}: {
  storyId: string;
  initialUserRating?: number | null;
  average?: number;
  count?: number;
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

  const handleSetRating = async (value: number) => {
    if (!user?.uid) {
      alert('Sign in to rate.');
      return;
    }
    if (!storyId) return;

    setSaving(true);
    try {
      await runTransaction(db, async (tx) => {
        const storyRef = doc(db, 'stories', storyId);
        const userRatingRef = doc(db, 'stories', storyId, 'ratings', user.uid);

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

        tx.set(userRatingRef, { rating: value, updatedAt: serverTimestamp() }, { merge: true });
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
    } catch (e) {
      console.error('Rating save failed', e);
      alert('Could not save rating. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const stars = [1,2,3,4,5];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex ${saving ? 'opacity-70 pointer-events-none' : ''}`}>
        {stars.map((s) => {
          const active = hoverValue ? s <= hoverValue : s <= (userRating ?? 0);
          return (
            <Star
              key={s}
              filled={active}
              onClick={() => handleSetRating(s)}
              onMouseEnter={() => setHoverValue(s)}
              onMouseLeave={() => setHoverValue(null)}
            />
          );
        })}
      </div>
      <p className="text-xs text-[#8FA0AF]">{displayAverage}</p>
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

  // ✅ Correct use of the hook — NO getState here
  const { user } = useAuth();

  const { data, isLoading, error } = useListPublishedStories();

  // Pull published stories (para no logueados también)
  useEffect(() => {
    const stories = data ?? [];
    setAllStories(stories);
    setDisplayedStories(stories);
  }, [data]);

  // Live load user ratings/favorites — SOLO si hay user
  useEffect(() => {
    if (!user?.uid) {
      setUserRatings({});
      setUserFavorites({});
      return;
    }

    // Favorites subscription (con handler de error)
    const favCol = collection(db, 'users', user.uid, 'favorites');
    const unsubFav = onSnapshot(
      favCol,
      (snap) => {
        const map: Record<string, boolean> = {};
        snap.forEach((d) => { map[d.id] = true; });
        setUserFavorites(map);
      },
      (err) => {
        console.error('[favorites onSnapshot] error:', err?.code || err, err);
      }
    );

    // Ratings del usuario para las historias visibles (lookup 1x)
    const loadRatings = async () => {
      const map: Record<string, number | null> = {};
      const list = data ?? [];
      await Promise.all(
        list.map(async (s) => {
          if (!s.id) return;
          try {
            const rRef = doc(db, 'stories', s.id, 'ratings', user.uid);
            const rSnap = await getDoc(rRef);
            map[s.id] = rSnap.exists() ? (rSnap.data()?.rating ?? null) : null;
          } catch (e) {
            console.warn('get rating failed for story', s.id, e);
            map[s.id] = null;
          }
        })
      );
      setUserRatings(map);
    };
    loadRatings();

    return () => {
      unsubFav();
    };
  }, [user?.uid, data]);

  const applyFiltersAndSearch = (stories: Story[]) => {
    let filtered = [...stories];

    // Sort by popular or recent
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

    // Genre filter
    if (selectedGenres.length > 0) {
      filtered = filtered.filter(story =>
        story.genres?.some(genre => selectedGenres.includes(genre))
      );
    }
    return filtered;
  };

  useEffect(() => {
    setDisplayedStories(applyFiltersAndSearch(allStories));
  }, [activeFilter, selectedGenres, allStories]);

  useEffect(() => {
    if (activeFilter !== 'all' || selectedGenres.length > 0) {
      let message = '';
      if (activeFilter !== 'all') message += `Filter: ${activeFilter}. `;
      if (selectedGenres.length > 0) message += `Genres: ${selectedGenres.join(', ')}.`;
      setSearchMessage(message.trim());
    } else if (!searchQuery.trim()) {
      setSearchMessage('');
    }
  }, [activeFilter, selectedGenres, searchQuery]);

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
        </header>

        <nav className="filter-nav flex justify-center gap-6 md:gap-8 mb-6 flex-wrap">
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
          <GenreMultiSelect
            genresList={GENRE_OPTIONS as unknown as string[]}
            selectedGenres={selectedGenres}
            onSelectedGenresChange={setSelectedGenres}
          />
        </nav>

        <div className="flex justify-center items-center gap-3 mb-8 w-full max-w-md mx-auto">
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

              return (
                <div
                  key={story.id}
                  className="story-card bg-[#233446] border-2 border-[#4A5C6E] p-2.5 rounded-lg w-64 text-[#E0C9A0] shadow-xl relative transition-all duration-300 ease-in-out hover:translate-y-[-5px] hover:shadow-2xl"
                >
                  {/* Favorite */}
                  <FavoriteButton storyId={story.id!} initialIsFav={!!userFavorites[story.id!]}/>

                  {/* Border overlay */}
                  <div className="absolute inset-1 border border-[#BFA071] rounded-md pointer-events-none z-10"></div>

                  {/* Cover */}
                  <Link href={readHref} className="card-art-container block w-full h-40 mb-4 rounded-sm overflow-hidden relative z-20">
                    <img
                      src={story.coverImageUrl || 'https://placehold.co/300x200/BFA071/1A2533?text=Image+Not+Found'}
                      alt={story.title || 'Untitled Story'}
                      className="w-full h-full object-cover block"
                    />
                  </Link>

                  {/* Title */}
                  <Link href={readHref}>
                    <h3 className="font-['Merriweather'] text-xl font-bold mb-2 leading-tight min-h-[2.6rem] z-20 relative">
                      {story.title || 'Untitled Story'}
                    </h3>
                  </Link>

                  {/* Genres */}
                  {story.genres?.length ? (
                    <p className="text-xs text-[#8FA0AF] mb-1">{story.genres.join(', ')}</p>
                  ) : null}

                  {/* Author */}
                  {(story as any).creator && (
                    <p className="text-sm text-[#8FA0AF] mb-1">
                      By {(story as any).creator.displayname || 'Unknown Author'}
                    </p>
                  )}

                  {/* Comments */}
                  {(story as any).commentsCount !== undefined && (
                    <p className="text-sm text-[#8FA0AF] flex items-center justify-center gap-1">
                      💬 {(story as any).commentsCount} Comments
                    </p>
                  )}

                  {/* Rating */}
                  <div className="mt-2">
                    <StarRating
                      storyId={story.id!}
                      initialUserRating={my ?? null}
                      average={avg}
                      count={count}
                    />
                  </div>

                  {/* Read */}
                  <Link
                    href={readHref}
                    className="mt-3 font-['Lato'] bg-[#BFA071] text-[#1A2533] py-2.5 px-6 rounded-md text-base font-bold uppercase tracking-wide inline-block transition-colors duration-300 hover:bg-[#E0C9A0] z-20 relative"
                  >
                    READ
                  </Link>
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
