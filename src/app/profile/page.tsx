// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut, signInAnonymously, updateProfile, reload } from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  getDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import AvatarUploader from '@/components/AvatarUploader';

type FavoriteItem = {
  storyId: string;
  createdAt?: any;
};

type BaseStoryLite = {
  id: string;
  title?: string;
  coverImageUrl?: string;
  genres?: string[];
};

type RatingFields = {
  averageRating?: number;
  ratingCount?: number;
  ratingSum?: number;
};

type MetricFields = RatingFields & {
  views?: number;
  status?: string;
  updatedAt?: any;
};

type StoryLite = BaseStoryLite & RatingFields;

type MyStory = BaseStoryLite & MetricFields;

const ProfilePage: React.FC = () => {
  const { user, starknetAddress, loading, logout } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const isLoggedIn = !!user || !!starknetAddress;

  // Section state
  const [activeTab, setActiveTab] = useState<'stories' | 'drafts' | 'favorites'>('stories');

  // Favorites state
  const [favs, setFavs] = useState<FavoriteItem[]>([]);
  const [favStories, setFavStories] = useState<StoryLite[]>([]);
  const [favLoading, setFavLoading] = useState(true);

  // My stories / drafts
  const [myStories, setMyStories] = useState<MyStory[]>([]);
  const [myDrafts, setMyDrafts] = useState<MyStory[]>([]);
  const [mineLoading, setMineLoading] = useState(true);

  // If the user connected ONLY via Starknet, ensure an anonymous Firebase user
  useEffect(() => {
    (async () => {
      if (!loading && starknetAddress && !auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn('[profile] signInAnonymously failed:', e);
        }
      }
    })();
  }, [loading, starknetAddress]);

  // Persist the Starknet address on the user's Firestore doc
  useEffect(() => {
    (async () => {
      if (!loading && auth.currentUser && starknetAddress) {
        await setDoc(
          doc(db, 'users', auth.currentUser.uid),
          { walletAddress: starknetAddress },
          { merge: true }
        );
        // Optional: set a short alias as displayName for anonymous users
        if (!auth.currentUser.displayName) {
          const short = `${starknetAddress.slice(0, 6)}...${starknetAddress.slice(-4)}`;
          try {
            await updateProfile(auth.currentUser, { displayName: short });
            await reload(auth.currentUser);
          } catch (e) {
            console.warn('[profile] updateProfile(displayName) failed:', e);
          }
        }
      }
    })();
  }, [loading, starknetAddress]);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.push('/login');
  }, [isLoggedIn, loading, router]);

  // Prefer provider photo; fallback to user.photoURL
  const computedAuthAvatar = useMemo(() => {
    const candidate =
      user?.providerData?.find((p) => !!p.photoURL)?.photoURL ||
      user?.photoURL ||
      null;

    if (!candidate) return null;
    try {
      const url = new URL(candidate);
      const isG = url.hostname.endsWith('googleusercontent.com');
      if (isG) {
        if (url.searchParams.has('sz')) {
          url.searchParams.set('sz', '256');
          return url.toString();
        }
        return candidate.replace(/=s\d+-c/g, '=s256-c').replace(/\/s\d+-c\//g, '/s256-c/');
      }
      return candidate;
    } catch {
      return candidate;
    }
  }, [user]);

  const avatarSrc = useMemo(() => {
    if (avatarOverride) return avatarOverride;
    return computedAuthAvatar || 'https://placehold.co/160x160/A88F72/FFFFFF?text=User';
  }, [avatarOverride, computedAuthAvatar]);

  // Name
  let displayName = 'Narratum User';
  if (user?.displayName) displayName = user.displayName;
  else if (user?.email) displayName = user.email;
  else if (starknetAddress)
    displayName = `${starknetAddress.substring(0, 6)}...${starknetAddress.substring(
      starknetAddress.length - 4
    )}`;

  const loginMethod = user ? 'Logged in with Google/Email' : 'Connected via Starknet';

  const handleUploaded = (url: string) => {
    const busted = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    setAvatarOverride(busted);
    setMessage('Avatar updated successfully.');
  };

  /* =========================
     FAVORITES: live subscribe
     ========================= */
  useEffect(() => {
    if (!user) {
      setFavs([]);
      setFavStories([]);
      setFavLoading(false);
      return;
    }
    setFavLoading(true);

    const favCol = collection(db, 'users', user.uid, 'favorites');
    const unsub = onSnapshot(
      favCol,
      (snap) => {
        const items: FavoriteItem[] = [];
        snap.forEach((d) => items.push({ storyId: d.id, ...(d.data() as any) }));
        // Sort by createdAt desc if present
        items.sort((a, b) => {
          const at = (a.createdAt?.toMillis?.() ?? 0);
          const bt = (b.createdAt?.toMillis?.() ?? 0);
          return bt - at;
        });
        setFavs(items);
      },
      () => setFavLoading(false)
    );

    return () => unsub();
  }, [user]);

  // Fetch the story docs for the current favorites
  useEffect(() => {
    const loadStories = async () => {
      if (!favs.length) {
        setFavStories([]);
        setFavLoading(false);
        return;
      }
      const fetched: StoryLite[] = [];
      await Promise.all(
        favs.map(async (f) => {
          const sRef = doc(db, 'stories', f.storyId);
          const sSnap = await getDoc(sRef);
          if (sSnap.exists()) {
            const d = sSnap.data() as any;
            const ratingCount = d.ratingCount ?? 0;
            const average =
              typeof d.averageRating === 'number'
                ? d.averageRating
                : ratingCount
                  ? (d.ratingSum ?? 0) / ratingCount
                  : undefined;

            fetched.push({
              id: sSnap.id,
              title: d.title,
              coverImageUrl: d.coverImageUrl,
              genres: d.genres ?? [],
              averageRating: average,
              ratingCount,
            });
          }
        })
      );
      setFavStories(fetched);
      setFavLoading(false);
    };
    loadStories();
  }, [favs]);

  /* =========================
     MY STORIES & DRAFTS
     ========================= */
  useEffect(() => {
    if (!user) {
      setMyStories([]);
      setMyDrafts([]);
      setMineLoading(false);
      return;
    }
    setMineLoading(true);

    // All stories owned by user; we split client-side by status
    const qStories = query(
      collection(db, 'stories'),
      where('ownerUid', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(
      qStories,
      (snap) => {
        const owned: MyStory[] = [];
        snap.forEach((d) => {
          const x = d.data() as any;
          const ratingCount = x.ratingCount ?? 0;
          const avg =
            typeof x.averageRating === 'number'
              ? x.averageRating
              : ratingCount
                ? (x.ratingSum ?? 0) / ratingCount
                : undefined;

          owned.push({
            id: d.id,
            title: x.title || '(untitled)',
            coverImageUrl: x.coverImageUrl ?? undefined,
            genres: Array.isArray(x.genres) ? x.genres : [],
            views: x.views ?? 0,
            ratingCount,
            ratingSum: x.ratingSum ?? 0,
            averageRating: avg,
            status: x.status || 'draft',
            updatedAt: x.updatedAt,
          });
        });

        const published = owned.filter(s => (s.status ?? 'draft').toLowerCase() === 'published');
        const drafts = owned.filter(s => (s.status ?? 'draft').toLowerCase() !== 'published');

        setMyStories(published);
        setMyDrafts(drafts);
        setMineLoading(false);
      },
      () => setMineLoading(false)
    );

    return () => unsub();
  }, [user]);

  // Nav helpers
  const jumpTo = (id: string, tab?: 'stories' | 'drafts' | 'favorites') => {
    if (tab) setActiveTab(tab);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading || !isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl font-semibold">
          {loading ? 'Loading profile...' : 'Redirecting to login...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start 
      bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] 
      text-[#3A4B5C] dark:text-[#E0C9A0] font-['Georgia'] p-5 md:p-10 pb-28 md:pb-36 box-border">


      <div className="fixed top-7 right-4 z-50 flex gap-4">
        <Link
          href="/"
          className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition"
        >
          Back to Landing
        </Link>
        <button
          onClick={async () => {
            await signOut(auth);
            if (logout) logout();
            router.push('/login');
          }}
          className="px-6 py-3 bg-red-600 text-white font-semibold rounded-full shadow-md hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>

      <div className="profile-container w-full max-w-6xl text-center pt-16">
        <header className="profile-header mb-8">
          <div className="avatar-section relative inline-block mb-4">
            <div className="avatar-frame w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-[#8B6F4E] p-1.5 bg-[#F5EFE3] flex justify-center items-center shadow-md">
              <img
                src={avatarSrc}
                alt={displayName}
                className="avatar-image w-full h-full rounded-full border-3 border-[#A88F72] object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          </div>

          {/* Google/Email AND Starknet+anonymous */}
          <AvatarUploader className="mb-6" onUploaded={handleUploaded} />

          <h1 className="user-name text-4xl md:text-5xl font-bold text-[#3A4B5C] dark:text-[#E0C9A0] m-0">
            {displayName}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#C2B6A3] mt-2">{loginMethod}</p>
        </header>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-green-100 text-green-700">
            {message}
          </div>
        )}

        <hr className="separator border-0 h-0.5 bg-[#B09A7A] my-8" />

        {/* Top nav */}
        <nav className="profile-navigation flex justify-around items-center mb-8 px-2 md:px-4 flex-wrap gap-y-4">
          <button
            onClick={() => jumpTo('my-stories-section', 'stories')}
            className={`nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 ${activeTab==='stories' ? 'text-[#8B6F4E]' : 'text-[#3A4B5C] dark:text-[#E0C9A0]'} hover:text-[#8B6F4E] dark:hover:text-[#3A4B5C]`}
          >
            MY STORIES
          </button>
          <button
            onClick={() => jumpTo('drafts-section', 'drafts')}
            className={`nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 ${activeTab==='drafts' ? 'text-[#8B6F4E]' : 'text-[#3A4B5C] dark:text-[#E0C9A0]'} hover:text-[#8B6F4E] dark:hover:text-[#3A4B5C]`}
          >
            DRAFTS
          </button>
          <button
            onClick={() => jumpTo('favorites-section', 'favorites')}
            className={`nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 ${activeTab==='favorites' ? 'text-[#8B6F4E]' : 'text-[#3A4B5C] dark:text-[#E0C9A0]'} hover:text-[#8B6F4E] dark:hover:text-[#3A4B5C]`}
          >
            FAVORITES
          </button>
        </nav>

        {/* =============== MY STORIES (Published) =============== */}
        <section id="my-stories-section" className="w-full mt-2">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">My Stories</h2>
          {mineLoading ? (
            <p className="text-sm text-[#8FA0AF]">Loading your stories…</p>
          ) : myStories.length === 0 ? (
            <p className="text-sm text-[#8FA0AF]">You haven't published any stories yet.</p>
          ) : (
            <div className="content-grid flex justify-start gap-6 flex-wrap">
              {myStories.map((s) => (
                <div
                  key={s.id}
                  className="w-64 bg-[#233446] border-2 border-[#4A5C6E] p-2.5 rounded-lg text-[#E0C9A0] shadow-xl relative"
                >
                  <div className="absolute inset-1 border border-[#BFA071] rounded-md pointer-events-none z-10"></div>

                  <Link
                    href={`/ereader?storyId=${encodeURIComponent(s.id)}&back=${encodeURIComponent('/profile')}`}
                    className="block w-full h-40 mb-3 rounded-sm overflow-hidden relative z-20"
                  >
                    <img
                      src={s.coverImageUrl || 'https://placehold.co/300x200/BFA071/1A2533?text=Image+Not+Found'}
                      alt={s.title || 'Story'}
                      className="w-full h-full object-cover block"
                    />
                  </Link>

                  <h3 className="font-['Merriweather'] text-lg font-bold mb-1 leading-tight min-h-[2.2rem]">
                    {s.title || 'Untitled Story'}
                  </h3>
                  {s.genres?.length ? (
                    <p className="text-xs text-[#8FA0AF] mb-1">{s.genres.join(', ')}</p>
                  ) : null}

                  <div className="flex justify-between text-xs text-[#8FA0AF] mt-1">
                    <span>👁 {s.views ?? 0}</span>
                    {typeof s.averageRating === 'number' ? (
                      <span>⭐ {s.averageRating.toFixed(1)} ({s.ratingCount ?? 0})</span>
                    ) : (
                      <span>⭐ 0.0 (0)</span>
                    )}
                  </div>

                  <Link
                    href={`/ereader?storyId=${encodeURIComponent(s.id)}&back=${encodeURIComponent('/profile')}`}
                    className="mt-3 inline-block font-['Lato'] bg-[#BFA071] text-[#1A2533] py-2 px-5 rounded-md text-sm font-bold uppercase tracking-wide hover:bg-[#E0C9A0]"
                  >
                    Read
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =============== DRAFTS (Work in progress) =============== */}
        <section id="drafts-section" className="w-full mt-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">My Drafts</h2>
          {mineLoading ? (
            <p className="text-sm text-[#8FA0AF]">Loading your drafts…</p>
          ) : myDrafts.length === 0 ? (
            <p className="text-sm text-[#8FA0AF]">You have no drafts yet.</p>
          ) : (
            <div className="content-grid flex justify-start gap-6 flex-wrap">
              {myDrafts.map((s) => (
                <div
                  key={s.id}
                  className="w-64 bg-[#233446] border-2 border-[#4A5C6E] p-2.5 rounded-lg text-[#E0C9A0] shadow-xl relative"
                >
                  <div className="absolute inset-1 border border-[#BFA071] rounded-md pointer-events-none z-10"></div>

                  <Link
                    href={`/create/scenes?storyId=${encodeURIComponent(s.id)}`}
                    className="block w-full h-40 mb-3 rounded-sm overflow-hidden relative z-20"
                    title="Open in Scenes editor"
                  >
                    <img
                      src={s.coverImageUrl || 'https://placehold.co/300x200/BFA071/1A2533?text=Image+Not+Found'}
                      alt={s.title || 'Draft'}
                      className="w-full h-full object-cover block"
                    />
                  </Link>

                  <h3 className="font-['Merriweather'] text-lg font-bold mb-1 leading-tight min-h-[2.2rem]">
                    {s.title || 'Untitled Draft'}
                  </h3>
                  {s.genres?.length ? (
                    <p className="text-xs text-[#8FA0AF] mb-1">{s.genres.join(', ')}</p>
                  ) : null}

                  <div className="flex justify-between text-xs text-[#8FA0AF] mt-1">
                    <span>Status: {(s.status ?? 'draft').toUpperCase()}</span>
                    <span>👁 {s.views ?? 0}</span>
                  </div>

                  <Link
                    href={`/create/scenes?storyId=${encodeURIComponent(s.id)}`}
                    className="mt-3 inline-block font-['Lato'] bg-[#BFA071] text-[#1A2533] py-2 px-5 rounded-md text-sm font-bold uppercase tracking-wide hover:bg-[#E0C9A0]"
                  >
                    Edit Scenes
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =============== FAVORITES GRID =============== */}
        <section id="favorites-section" className="w-full mt-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-24">My Favorites</h2>

          {favLoading ? (
            <p className="text-sm text-[#8FA0AF]">Loading favorites…</p>
          ) : favStories.length === 0 ? (
            <p className="text-sm text-[#8FA0AF]">You haven’t added any favorites yet.</p>
          ) : (
            <div className="content-grid flex justify-start gap-6 flex-wrap">
              {favStories.map((s) => (
                <Link
                  key={s.id}
                  href={`/ereader?storyId=${encodeURIComponent(s.id)}&back=${encodeURIComponent('/profile')}`}
                  className="w-64 bg-[#233446] border-2 border-[#4A5C6E] p-2.5 rounded-lg text-[#E0C9A0] shadow-xl relative transition-all duration-200 hover:-translate-y-1"
                  title="Open in Reader"
                >
                  <div className="absolute inset-1 border border-[#BFA071] rounded-md pointer-events-none z-10"></div>

                  <div className="w-full h-40 mb-3 rounded-sm overflow-hidden relative z-20">
                    <img
                      src={s.coverImageUrl || 'https://placehold.co/300x200/BFA071/1A2533?text=Image+Not+Found'}
                      alt={s.title || 'Story'}
                      className="w-full h-full object-cover block"
                    />
                  </div>

                  <h3 className="font-['Merriweather'] text-lg font-bold mb-1 leading-tight min-h-[2.2rem]">
                    {s.title || 'Untitled Story'}
                  </h3>
                  {s.genres?.length ? (
                    <p className="text-xs text-[#8FA0AF] mb-1">{s.genres.join(', ')}</p>
                  ) : null}
                  {typeof s.averageRating === 'number' ? (
                    <p className="text-xs text-[#8FA0AF]">⭐ {s.averageRating.toFixed(1)} ({s.ratingCount ?? 0})</p>
                  ) : (
                    <p className="text-xs text-[#8FA0AF]">⭐ 0.0 (0)</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
