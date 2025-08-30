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
  orderBy,
  getDoc,
} from 'firebase/firestore';

import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import AvatarUploader from '@/components/AvatarUploader';

type FavoriteItem = {
  storyId: string;
  createdAt?: any;
};

type StoryLite = {
  id: string;
  title?: string;
  coverImageUrl?: string;
  genres?: string[];
  averageRating?: number;
  ratingCount?: number;
};

const ProfilePage: React.FC = () => {
  const { user, starknetAddress, loading, logout } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const isLoggedIn = !!user || !!starknetAddress;

  // NEW: Favorites state
  const [favs, setFavs] = useState<FavoriteItem[]>([]);
  const [favStories, setFavStories] = useState<StoryLite[]>([]);
  const [favLoading, setFavLoading] = useState(true);

  // If the user connected ONLY via Starknet, ensure we have an anonymous Firebase user
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

  // Persist the Starknet address on the user's Firestore doc (for mapping)
  useEffect(() => {
    (async () => {
      if (!loading && auth.currentUser && starknetAddress) {
        await setDoc(
          doc(db, 'users', auth.currentUser.uid),
          { walletAddress: starknetAddress },
          { merge: true }
        );
        // Optional: put a short alias as displayName for anonymous users
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

  // Avatar source (override (cache-busted) right after upload)
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

  // After uploader finishes, update the img instantly
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
    const q = orderBy('createdAt', 'desc');
    const unsub = onSnapshot(
      // users/{uid}/favorites ordered by createdAt
      collection(db, 'users', user.uid, 'favorites'),
      (snap) => {
        const items: FavoriteItem[] = [];
        snap.forEach((d) => items.push({ storyId: d.id, ...(d.data() as any) }));
        // NOTE: orderBy requires composite index; if not set, we just rely on client sort
        items.sort((a, b) => {
          const at = (a.createdAt?.toMillis?.() ?? 0);
          const bt = (b.createdAt?.toMillis?.() ?? 0);
          return bt - at;
        });
        setFavs(items);
      }
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
            fetched.push({
              id: sSnap.id,
              title: d.title,
              coverImageUrl: d.coverImageUrl,
              genres: d.genres ?? [],
              averageRating:
                typeof d.averageRating === 'number'
                  ? d.averageRating
                  : d.ratingCount
                    ? (d.ratingSum ?? 0) / d.ratingCount
                    : undefined,
              ratingCount: d.ratingCount ?? 0,
            });
          }
        })
      );
      setFavStories(fetched);
      setFavLoading(false);
    };
    loadStories();
  }, [favs]);

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
      text-[#3A4B5C] dark:text-[#E0C9A0] font-['Georgia'] p-5 md:p-10 box-border">

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

      <div className="profile-container w-full max-w-3xl text-center pt-16">
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

          {/* Works for Google/Email AND for Starknet+anonymous */}
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

        <nav className="profile-navigation flex justify-around items-center mb-8 px-2 md:px-4 flex-wrap gap-y-4">
          <button
            onClick={() => setMessage('My Stories clicked!')}
            className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#3A4B5C] dark:text-[#E0C9A0] hover:text-[#8B6F4E] dark:hover:text-[#3A4B5C]"
          >
            MY STORIES
          </button>
          <button
            onClick={() => setMessage('Drafts clicked!')}
            className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#3A4B5C] dark:text-[#E0C9A0] hover:text-[#8B6F4E] dark:hover:text-[#3A4B5C]"
          >
            DRAFTS
          </button>
          <button
            onClick={() => {
              setMessage('Favorites clicked!');
              // easy anchor jump
              const el = document.getElementById('favorites-section');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#3A4B5C] dark:text-[#E0C9A0] hover:text-[#8B6F4E] dark:hover:text-[#3A4B5C]"
          >
            FAVORITES
          </button>
        </nav>

        {/* =============== FAVORITES GRID =============== */}
        <section id="favorites-section" className="w-full mt-2">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">My Favorites</h2>

          {favLoading ? (
            <p className="text-sm text-[#8FA0AF]">Loading favorites…</p>
          ) : favStories.length === 0 ? (
            <p className="text-sm text-[#8FA0AF]">You haven’t added any favorites yet.</p>
          ) : (
            <div className="content-grid flex justify-center gap-5 flex-wrap">
              {favStories.map((s) => (
                <Link
                  key={s.id}
                  href={`/story/${s.id}`}
                  className="content-card w-40 bg-[#F0E6D2] border-3 border-[#A88F72] rounded-lg p-1.5 block shadow-sm transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="w-full h-40 mb-2 rounded-sm overflow-hidden">
                    <img
                      src={s.coverImageUrl || 'https://placehold.co/300x200/BFA071/1A2533?text=Image+Not+Found'}
                      alt={s.title || 'Story'}
                      className="w-full h-full object-cover block"
                    />
                  </div>
                  <div className="px-0.5">
                    <h3 className="text-base font-bold leading-tight min-h-[2.4rem] text-[#3A4B5C]">
                      {s.title || 'Untitled Story'}
                    </h3>
                    {s.genres?.length ? (
                      <p className="text-[11px] text-[#6B7280]">{s.genres.join(', ')}</p>
                    ) : null}
                    {typeof s.averageRating === 'number' ? (
                      <p className="text-[11px] text-[#6B7280] mt-0.5">⭐ {s.averageRating.toFixed(1)} ({s.ratingCount})</p>
                    ) : (
                      <p className="text-[11px] text-[#6B7280] mt-0.5">No ratings yet</p>
                    )}
                  </div>
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
