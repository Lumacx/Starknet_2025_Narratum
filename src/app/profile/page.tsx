// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, signInAnonymously, updateProfile, reload } from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteField
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AvatarUploader from '@/components/AvatarUploader';

/* ----------------------------- Types ----------------------------- */
type FavoriteItem = { storyId: string; createdAt?: any };

type BaseStoryLite = { id: string; title?: string; coverImageUrl?: string; genres?: string[] };

type RatingFields = { averageRating?: number; ratingCount?: number; ratingSum?: number };

type MetricFields = RatingFields & { views?: number; status?: string; updatedAt?: any };

type StoryLite = BaseStoryLite & RatingFields;
type MyStory = BaseStoryLite & MetricFields;

type Plan = 'free' | 'paid';
type Tier = 'basic' | 'fan' | 'premium';

type UserProfileDoc = {
  plan?: Plan;
  subscriptionTier?: Tier;
  credits?: number;
  bio?: string;
  location?: string;
  website?: string;
  socials?: { twitter?: string; instagram?: string; discord?: string };
  createdAt?: any; // for referral code timestamp
  referredBy?: string | null; // who referred this user (uid), set-once
  walletAddress?: string;
  photoURL?: string;
  displayName?: string;
};

type TxStatus = 'confirmed' | 'pending' | 'failed';
type TxType = 'purchase' | 'spend' | 'bonus';

type TxItem = {
  id: string;
  type: TxType;
  creditsDelta: number;
  amountUsd?: number;
  storyId?: string;
  note?: string;
  status: TxStatus;
  createdAt?: any;
};

type RefUser = {
  id: string;
  displayName?: string;
  email?: string;
  createdAt?: any;
};

/* ----------------------------- Page ----------------------------- */
const ProfilePage: React.FC = () => {
  const { user, starknetAddress, loading, logout } = useAuth();
  const router = useRouter();
  const isLoggedIn = !!user || !!starknetAddress;

  /* ---------- Local UI state ---------- */
  const [message, setMessage] = useState('');
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'stories' | 'drafts' | 'favorites' | 'transactions'>('stories');
  const [txSubtab, setTxSubtab] = useState<'personal' | 'referrals'>('personal');

  const [editOpen, setEditOpen] = useState(false);
  const [profileDoc, setProfileDoc] = useState<UserProfileDoc>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // editable fields
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [socials, setSocials] = useState<{ twitter?: string; instagram?: string; discord?: string }>({});

  /* ---------- Favorites ---------- */
  const [favs, setFavs] = useState<FavoriteItem[]>([]);
  const [favStories, setFavStories] = useState<StoryLite[]>([]);
  const [favLoading, setFavLoading] = useState(true);

  /* ---------- My stories / drafts ---------- */
  const [myStories, setMyStories] = useState<MyStory[]>([]);
  const [myDrafts, setMyDrafts] = useState<MyStory[]>([]);
  const [mineLoading, setMineLoading] = useState(true);

  /* ---------- Transactions ---------- */
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  /* ---------- Referrals list ---------- */
  const [refUsers, setRefUsers] = useState<RefUser[]>([]);
  const [refLoading, setRefLoading] = useState(true);

  /* =========================
     ANON SIGN-IN FOR WALLET
     ========================= */
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

  /* =========================
     STARKNET ADDRESS -> USER DOC
     ========================= */
  useEffect(() => {
    (async () => {
      if (!loading && auth.currentUser && starknetAddress) {
        await setDoc(
          doc(db, 'users', auth.currentUser.uid),
          { walletAddress: starknetAddress },
          { merge: true }
        );
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

  /* =========================
     AUTH GUARD
     ========================= */
  useEffect(() => {
    if (!loading && !isLoggedIn) router.push('/login');
  }, [isLoggedIn, loading, router]);

  /* =========================
     COMPUTED AVATAR
     ========================= */
  const computedAuthAvatar = useMemo(() => {
    const candidate =
      user?.providerData?.find((p) => !!p.photoURL)?.photoURL || user?.photoURL || null;

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

  /* =========================
     DISPLAY NAME
     ========================= */
  const computedDisplayName = useMemo(() => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email;
    if (starknetAddress)
      return `${starknetAddress.substring(0, 6)}...${starknetAddress.substring(
        starknetAddress.length - 4
      )}`;
    return 'Narratum User';
  }, [user, starknetAddress]);

  const loginMethod = user ? 'Logged in with Google/Email' : 'Connected via Starknet';

  const handleUploaded = (url: string) => {
    const busted = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    setAvatarOverride(busted);
    setMessage('Avatar updated successfully.');
  };

  /* ----------------------------- Referral helpers ----------------------------- */

  function slugifyName(name: string): string {
    return (name || '')
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  function monthYearFromDate(d: Date) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return { mm, yyyy };
  }

  function makeReferralCode(
    displayName: string | undefined | null,
    createdAtTs: any,
    authCreationTime?: string | null
  ) {
    const name = slugifyName(displayName || '');
    if (!name) return null;

    let dt: Date | null = null;

    if (createdAtTs?.toDate?.()) {
      dt = createdAtTs.toDate();
    } else if (authCreationTime) {
      const parsed = new Date(authCreationTime);
      if (!isNaN(parsed.getTime())) dt = parsed;
    } else {
      dt = new Date();
    }

    const { mm, yyyy } = monthYearFromDate(dt!);
    return `${name}-${mm}${yyyy}`;
  }

  /* =========================
     USER PROFILE DOC (Plan/Tier/Credits & personal info)
     ========================= */
  useEffect(() => {
    const fetch = async () => {
      if (!auth.currentUser) return;
      const uref = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(uref);
      const d = (snap.exists() ? (snap.data() as UserProfileDoc) : {}) || {};

      setProfileDoc(d);
      setDisplayNameInput(computedDisplayName);
      setBio(d.bio || '');
      setLocation(d.location || '');
      setWebsite(d.website || '');
      setSocials(d.socials || {});
    };
    fetch();
  }, [computedDisplayName]);

  /* =========================
     FAVORITES live
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
        items.sort((a, b) => {
          const at = a.createdAt?.toMillis?.() ?? 0;
          const bt = b.createdAt?.toMillis?.() ?? 0;
          return bt - at;
        });
        setFavs(items);
      },
      () => setFavLoading(false)
    );

    return () => unsub();
  }, [user]);

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

        const published = owned.filter((s) => (s.status ?? 'draft').toLowerCase() === 'published');
        const drafts = owned.filter((s) => (s.status ?? 'draft').toLowerCase() !== 'published');

        setMyStories(published);
        setMyDrafts(drafts);
        setMineLoading(false);
      },
      () => setMineLoading(false)
    );

    return () => unsub();
  }, [user]);

  /* =========================
     TRANSACTIONS (latest 100) — only when tab is open
     ========================= */
  useEffect(() => {
    if (!user || activeTab !== 'transactions') {
      setTxs([]);
      setTxLoading(false);
      return;
    }
    setTxLoading(true);

    const qTx = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(
      qTx,
      (snap) => {
        const items: TxItem[] = [];
        snap.forEach((d) => {
          const x = d.data() as any;
          items.push({
            id: d.id,
            type: x.type ?? 'spend',
            creditsDelta: x.creditsDelta ?? 0,
            amountUsd: x.amountUsd,
            storyId: x.storyId,
            note: x.note,
            status: x.status ?? 'confirmed',
            createdAt: x.createdAt,
          });
        });
        setTxs(items);
        setTxLoading(false);
      },
      () => setTxLoading(false)
    );

    return () => unsub();
  }, [user, activeTab]);

  /* =========================
     REFERRAL LIST — only when Transactions + subtab 'referrals'
     ========================= */
  useEffect(() => {
    const loadReferrals = async () => {
      if (!user || activeTab !== 'transactions' || txSubtab !== 'referrals') {
        setRefUsers([]);
        setRefLoading(false);
        return;
      }
      setRefLoading(true);
      try {
        const qRef = query(collection(db, 'users'), where('referredBy', '==', user.uid), limit(200));
        const snap = await getDocs(qRef);
        const rows: RefUser[] = [];
        snap.forEach((d) => {
          const x = d.data() as any;
          rows.push({
            id: d.id,
            displayName: x.displayName || x.email || d.id,
            email: x.email,
            createdAt: x.createdAt,
          });
        });
        setRefUsers(rows);
      } finally {
        setRefLoading(false);
      }
    };
    loadReferrals();
  }, [user, activeTab, txSubtab]);

  /* =========================
     HELPERS
     ========================= */

  // CHANGED: don't try to scroll to Transactions before it's rendered
  const jumpTo = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab);

    if (tab !== 'transactions') {
      const el =
        tab === 'stories'
          ? document.getElementById('my-stories-section')
          : tab === 'drafts'
          ? document.getElementById('drafts-section')
          : document.getElementById('favorites-section');

      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // NEW: when Transactions becomes active, scroll after it mounts
  useEffect(() => {
    if (activeTab === 'transactions') {
      requestAnimationFrame(() => {
        const el = document.getElementById('transactions-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [activeTab]);

  const saveProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    setSavingProfile(true);
    try {
      if (displayNameInput && displayNameInput !== computedDisplayName) {
        await updateProfile(auth.currentUser, { displayName: displayNameInput });
        await reload(auth.currentUser);
      }
  
      const uref = doc(db, 'users', auth.currentUser.uid);
  
      const trim = (v?: string) => (v && v.trim() ? v.trim() : '');
  
      // Build socials update that *removes* empty fields
      const socialsUpdate: any = {
        twitter: trim(socials.twitter) || deleteField(),
        instagram: trim(socials.instagram) || deleteField(),
        discord: trim(socials.discord) || deleteField(),
      };
  
      // Build top-level fields (delete if user cleared them)
      const payload: any = {
        displayName: trim(displayNameInput) || deleteField(),
        bio: trim(bio) || deleteField(),
        location: trim(location) || deleteField(),
        website: trim(website) || deleteField(),
        socials: socialsUpdate,
      };
  
      // Only set photoURL if it exists; otherwise delete it (prevents undefined)
      if (auth.currentUser.photoURL) {
        payload.photoURL = auth.currentUser.photoURL;
      } else {
        payload.photoURL = deleteField();
      }
  
      await setDoc(uref, payload, { merge: true });
  
      setMessage('Profile updated.');
      setEditOpen(false);
    } catch (e) {
      console.warn('[profile] saveProfile error', e);
      setMessage('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }, [bio, location, website, socials, displayNameInput, computedDisplayName]);

  const plan: Plan = profileDoc.plan || 'free';
  const tier: Tier = profileDoc.subscriptionTier || (plan === 'free' ? 'basic' : 'fan');
  const credits = typeof profileDoc.credits === 'number' ? profileDoc.credits! : 0;

  // -------- Referral code (uid + createdAt seconds) --------
  const authCreationTime = auth.currentUser?.metadata?.creationTime || null;
  const referralCode = makeReferralCode(
    profileDoc.displayName ?? user?.displayName ?? null,
    profileDoc.createdAt,
    authCreationTime
  );
  const hasReferralCode = !!referralCode;

  const copyReferral = async () => {
    if (!referralCode) {
      setMessage('Fill personal info to get your code first.');
      return;
    }
    try {
      await navigator.clipboard.writeText(referralCode);
      setMessage('Referral code copied to clipboard.');
    } catch {
      setMessage('Could not copy referral code.');
    }
  };

  // ---- Small presentational helpers ----
  const Chip = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-[#4A5C6E] bg-[#0b1220]/50 text-[#E0C9A0]">
      {children}
    </span>
  );

  const CardWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="border border-[#4A5C6E] bg-[#0b1220]/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition">
      {children}
    </div>
  );

  /* =========================
     RENDER
     ========================= */
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
    <div
      className="min-h-screen relative flex flex-col items-center justify-start 
      bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] 
      text-[#3A4B5C] dark:text-[#E0C9A0] font-['Georgia'] p-5 md:p-10 pb-28 md:pb-36 box-border"
    >
      {/* Top Right Controls */}
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

      {/* Header */}
      <div className="w-full max-w-6xl text-center pt-16">
        <header className="mb-5">
          <div className="relative inline-block mb-4">
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-[#8B6F4E] p-1.5 bg-[#F5EFE3] flex justify-center items-center shadow-md">
              <img
                src={avatarSrc}
                alt={computedDisplayName}
                className="w-full h-full rounded-full border-3 border-[#A88F72] object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          </div>

          <AvatarUploader className="mb-4" onUploaded={handleUploaded} />

          <h1 className="text-4xl md:text-5xl font-bold text-[#3A4B5C] dark:text-[#E0C9A0] m-0">
            {computedDisplayName}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#C2B6A3] mt-1">{loginMethod}</p>

          {/* Plan / Tier / Credits + Edit */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center items-center">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                plan === 'paid'
                  ? 'bg-green-700/20 border-green-500 text-green-200'
                  : 'bg-gray-700/20 border-gray-500 text-gray-200'
              }`}
            >
              Plan: {plan === 'paid' ? 'Paid' : 'Free'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold border border-[#BFA071] bg-[#233446] text-[#E0C9A0]">
              Subscription: {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold border border-[#4A5C6E] bg-[#1F2937] text-[#FDE68A]">
              Credits: {credits}
            </span>
            <button
              onClick={() => setEditOpen(true)}
              className="ml-2 px-4 py-1.5 rounded-full text-sm font-bold bg-[#BFA071] text-[#1A2533] hover:bg-[#E0C9A0] shadow"
            >
              Edit Profile
            </button>
          </div>

          {/* Referral Code Block */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Your Referral Code:</span>

              {hasReferralCode ? (
                <>
                  <code
                    className="
                      text-xs px-2 py-1 rounded border font-semibold
                      text-slate-800 bg-slate-50 border-slate-300
                      dark:text-slate-100 dark:bg-slate-800 dark:border-slate-600
                    "
                  >
                    {referralCode}
                  </code>

                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(referralCode!);
                        setMessage('Referral code copied to clipboard.');
                      } catch {
                        setMessage('Could not copy referral code.');
                      }
                    }}
                    title="Copy code"
                    className="
                      text-xs px-2 py-1 rounded border transition
                      bg-slate-200/80 text-slate-800 border-slate-300 hover:bg-slate-200
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60
                      dark:bg-[#233446] dark:text-slate-100 dark:border-[#4A5C6E]
                      dark:hover:bg-[#2b3e52] dark:focus-visible:ring-slate-300/40
                    "
                  >
                    Copy
                  </button>
                </>
              ) : (
                <span
                  className="
                    text-xs px-2 py-1 rounded border
                    bg-yellow-50 text-yellow-800 border-yellow-300
                    dark:bg-yellow-200/20 dark:text-yellow-200 dark:border-yellow-400/40
                  "
                >
                  Fill personal info to get your code
                </span>
              )}
            </div>

            <div
              className="
                text-xs px-3 py-1 rounded-full border text-center
                bg-amber-50 text-amber-900 border-amber-200
                dark:bg-[#BFA071]/15 dark:text-[#E0C9A0] dark:border-[#BFA071]/40
              "
            >
              <strong>Share it</strong> to earn <strong>20% to 40%</strong> on referrals for purchases.
            </div>
          </div>
        </header>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-green-100 text-green-700">{message}</div>
        )}

        <hr className="border-0 h-0.5 bg-[#B09A7A] my-6" />

        {/* 4 tabs */}
        <nav className="w-full mb-6 flex justify-center">
          <div className="inline-flex items-center gap-3 bg-[#0f172a]/40 border border-[#4A5C6E] rounded-full p-2 shadow-inner">
            {[
              { key: 'stories', label: 'My Stories' },
              { key: 'drafts', label: 'Drafts' },
              { key: 'favorites', label: 'Favorites' },
              { key: 'transactions', label: 'Transactions' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => jumpTo(t.key as any)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  activeTab === (t.key as any)
                    ? 'bg-[#BFA071] text-[#1A2533]'
                    : 'bg-transparent text-[#E0C9A0] hover:bg-[#233446]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ---------- My Stories ---------- */}
        {activeTab === 'stories' && (
          <section id="my-stories-section" className="w-full mt-2">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">My Stories</h2>

            {mineLoading ? (
              <p className="text-sm text-center text-[#8FA0AF]">Loading your stories…</p>
            ) : myStories.length === 0 ? (
              <p className="text-sm text-center text-[#8FA0AF]">
                You haven’t published any stories yet. Create one in{' '}
                <Link className="underline" href="/create/begin">Create</Link>.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {myStories.map((s) => (
                  <CardWrap key={s.id}>
                    <div className="aspect-[4/3] w-full bg-[#0f172a] overflow-hidden">
                      <img
                        src={s.coverImageUrl || '/placeholder-cover.png'}
                        className="w-full h-full object-cover"
                        alt={s.title || 'cover'}
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="text-lg font-bold line-clamp-2">{s.title || '(untitled)'}</h3>
                      <div className="flex flex-wrap gap-2">
                        {(s.genres || []).slice(0, 3).map((g) => (
                          <Chip key={g}>{g}</Chip>
                        ))}
                        <Chip>Views: {s.views ?? 0}</Chip>
                        <Chip>
                          ⭐ {s.averageRating ? s.averageRating.toFixed(1) : '—'}
                          {s.ratingCount ? ` (${s.ratingCount})` : ''}
                        </Chip>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <Link
                          href={`/read/${s.id}`}
                          className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#BFA071] text-[#1A2533] hover:bg-[#E0C9A0]"
                        >
                          Read
                        </Link>
                        <Link
                          href={`/create/begin?storyId=${s.id}`}
                          className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#233446] text-[#E0C9A0] hover:bg-[#2b3e52]"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </CardWrap>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- Drafts ---------- */}
        {activeTab === 'drafts' && (
          <section id="drafts-section" className="w-full mt-2">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">Drafts</h2>

            {mineLoading ? (
              <p className="text-sm text-center text-[#8FA0AF]">Loading your drafts…</p>
            ) : myDrafts.length === 0 ? (
              <p className="text-sm text-center text-[#8FA0AF]">No drafts yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {myDrafts.map((s) => (
                  <CardWrap key={s.id}>
                    <div className="aspect-[4/3] w-full bg-[#0f172a] overflow-hidden">
                      <img
                        src={s.coverImageUrl || '/placeholder-cover.png'}
                        className="w-full h-full object-cover"
                        alt={s.title || 'cover'}
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="text-lg font-bold line-clamp-2">{s.title || '(untitled)'}</h3>
                      <div className="flex flex-wrap gap-2">
                        {(s.genres || []).slice(0, 3).map((g) => (
                          <Chip key={g}>{g}</Chip>
                        ))}
                        <Chip>Status: {s.status ?? 'draft'}</Chip>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <Link
                          href={`/create/begin?storyId=${s.id}`}
                          className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#BFA071] text-[#1A2533] hover:bg-[#E0C9A0]"
                        >
                          Continue
                        </Link>
                        <Link
                          href={`/read/${s.id}`}
                          className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#233446] text-[#E0C9A0] hover:bg-[#2b3e52]"
                        >
                          Preview
                        </Link>
                      </div>
                    </div>
                  </CardWrap>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- Favorites ---------- */}
        {activeTab === 'favorites' && (
          <section id="favorites-section" className="w-full mt-2">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">Favorites</h2>

            {favLoading ? (
              <p className="text-sm text-center text-[#8FA0AF]">Loading favorites…</p>
            ) : favStories.length === 0 ? (
              <p className="text-sm text-center text-[#8FA0AF]">
                You haven’t favorited any stories yet. Explore in{' '}
                <Link className="underline" href="/discover">Discover</Link>.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favStories.map((s) => (
                  <CardWrap key={s.id}>
                    <div className="aspect-[4/3] w-full bg-[#0f172a] overflow-hidden">
                      <img
                        src={s.coverImageUrl || '/placeholder-cover.png'}
                        className="w-full h-full object-cover"
                        alt={s.title || 'cover'}
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="text-lg font-bold line-clamp-2">{s.title || '(untitled)'}</h3>
                      <div className="flex flex-wrap gap-2">
                        {(s.genres || []).slice(0, 3).map((g) => (
                          <Chip key={g}>{g}</Chip>
                        ))}
                        <Chip>
                          ⭐ {s.averageRating ? s.averageRating.toFixed(1) : '—'}
                          {s.ratingCount ? ` (${s.ratingCount})` : ''}
                        </Chip>
                      </div>
                      <div className="pt-2">
                        <Link
                          href={`/read/${s.id}`}
                          className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#BFA071] text-[#1A2533] hover:bg-[#E0C9A0]"
                        >
                          Read
                        </Link>
                      </div>
                    </div>
                  </CardWrap>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- Transactions ---------- */}
        {activeTab === 'transactions' && (
          <section id="transactions-section" className="w-full mt-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">Transactions</h2>

            {/* Sub-toggle */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex rounded-full border border-[#4A5C6E] overflow-hidden">
                <button
                  className={`px-4 py-2 text-sm font-semibold ${
                    txSubtab === 'personal' ? 'bg-[#BFA071] text-[#1A2533]' : 'bg-[#0f172a] text-[#E0C9A0]'
                  }`}
                  onClick={() => setTxSubtab('personal')}
                >
                  Personal Transactions
                </button>
                <button
                  className={`px-4 py-2 text-sm font-semibold ${
                    txSubtab === 'referrals' ? 'bg-[#BFA071] text-[#1A2533]' : 'bg-[#0f172a] text-[#E0C9A0]'
                  }`}
                  onClick={() => setTxSubtab('referrals')}
                >
                  Referral Transactions
                </button>
              </div>
            </div>

            {txSubtab === 'personal' ? (
              txLoading ? (
                <p className="text-sm text-center text-[#8FA0AF]">Loading transactions…</p>
              ) : txs.length === 0 ? (
                <p className="text-sm text-center text-[#8FA0AF]">
                  No transactions yet. Purchases, bonuses, and spends will show up here.
                </p>
              ) : (
                <div className="max-w-4xl mx-auto overflow-hidden rounded-lg border border-[#4A5C6E] bg-[#0b1220]/60">
                  <div className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wide bg-[#162235] text-[#E0C9A0] border-b border-[#4A5C6E]">
                    <div className="col-span-3 px-3 py-2">Date</div>
                    <div className="col-span-2 px-3 py-2">Type</div>
                    <div className="col-span-2 px-3 py-2">Credits</div>
                    <div className="col-span-2 px-3 py-2">Amount (USD)</div>
                    <div className="col-span-3 px-3 py-2">Note</div>
                  </div>
                  {txs.map((t) => {
                    const ts = t.createdAt?.toDate?.() as Date | undefined;
                    const dateStr = ts ? ts.toLocaleString() : '—';
                    const sign = t.creditsDelta >= 0 ? '+' : '';
                    const color =
                      t.creditsDelta > 0
                        ? 'text-green-300'
                        : t.creditsDelta < 0
                        ? 'text-rose-300'
                        : 'text-slate-200';
                    return (
                      <div
                        key={t.id}
                        className="grid grid-cols-12 text-sm border-b border-[#243041] last:border-none text-[#E5E7EB]"
                      >
                        <div className="col-span-3 px-3 py-2">{dateStr}</div>
                        <div className="col-span-2 px-3 py-2 capitalize">
                          {t.type}{' '}
                          {t.status !== 'confirmed' && <span className="text-xs opacity-70">({t.status})</span>}
                        </div>
                        <div className={`col-span-2 px-3 py-2 font-bold ${color}`}>
                          {sign}
                          {t.creditsDelta}
                        </div>
                        <div className="col-span-2 px-3 py-2">{t.amountUsd ? `$${t.amountUsd.toFixed(2)}` : '—'}</div>
                        <div className="col-span-3 px-3 py-2">{t.note || (t.storyId ? `Story: ${t.storyId}` : '—')}</div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // Referral subtab
              <div className="max-w-4xl mx-auto">
                {refLoading ? (
                  <p className="text-sm text-center text-[#8FA0AF]">Loading referral report…</p>
                ) : refUsers.length === 0 ? (
                  <p className="text-sm text-center text-[#8FA0AF]">
                    No users have signed up with your referral code yet.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-[#4A5C6E] bg-[#0b1220]/60">
                    <div className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wide bg-[#162235] text-[#E0C9A0] border-b border-[#4A5C6E]">
                      <div className="col-span-6 px-3 py-2">Referred User</div>
                      <div className="col-span-3 px-3 py-2">UID</div>
                      <div className="col-span-3 px-3 py-2">Joined</div>
                    </div>
                    {refUsers.map((u) => {
                      const ts = u.createdAt?.toDate?.() as Date | undefined;
                      const joined = ts ? ts.toLocaleDateString() : '—';
                      return (
                        <div
                          key={u.id}
                          className="grid grid-cols-12 text-sm border-b border-[#243041] last:border-none text-[#E5E7EB]"
                        >
                          <div className="col-span-6 px-3 py-2">{u.displayName || u.email || u.id}</div>
                          <div className="col-span-3 px-3 py-2">{u.id}</div>
                          <div className="col-span-3 px-3 py-2">{joined}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="mt-3 text-xs text-center text-[#9AA6B2]">
                  Referral commissions appear when your backend writes referral transactions (e.g., to{' '}
                  <code>users/&lt;you&gt;/transactions</code> with fields like <code>referrerUid</code> and{' '}
                  <code>commissionCredits</code>).
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* ---------- Edit Drawer ---------- */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="w-full md:max-w-2xl bg-[#0b1220] text-[#E0C9A0] border border-[#4A5C6E] rounded-t-2xl md:rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#243041]">
              <h3 className="text-xl font-bold">Edit Profile</h3>
              <button
                className="px-3 py-1 rounded-md bg-[#233446] hover:bg-[#2b3e52]"
                onClick={() => setEditOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="p-5 grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-semibold">Display Name</span>
                <input
                  type="text"
                  className="px-3 py-2 rounded-md bg-[#0f172a] border border-[#243041] outline-none"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Your public name"
                />
                <span className="text-xs text-slate-400">Email and creation date are not editable here.</span>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-semibold">Bio</span>
                <textarea
                  className="px-3 py-2 rounded-md bg-[#0f172a] border border-[#243041] outline-none"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell readers about you"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="grid gap-1">
                  <span className="text-sm font-semibold">Location</span>
                  <input
                    type="text"
                    className="px-3 py-2 rounded-md bg-[#0f172a] border border-[#243041] outline-none"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-semibold">Website</span>
                  <input
                    type="text"
                    className="px-3 py-2 rounded-md bg-[#0f172a] border border-[#243041] outline-none"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="example.com"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="grid gap-1">
                  <span className="text-sm font-semibold">Twitter / X</span>
                  <input
                    type="text"
                    className="px-3 py-2 rounded-md bg-[#0f172a] border border-[#243041] outline-none"
                    value={socials.twitter || ''}
                    onChange={(e) => setSocials((s) => ({ ...s, twitter: e.target.value }))}
                    placeholder="@handle"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-semibold">Instagram</span>
                  <input
                    type="text"
                    className="px-3 py-2 rounded-md bg-[#0f172a] border border-[#243041] outline-none"
                    value={socials.instagram || ''}
                    onChange={(e) => setSocials((s) => ({ ...s, instagram: e.target.value }))}
                    placeholder="@handle"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-semibold">Discord</span>
                  <input
                    type="text"
                    className="px-3 py-2 rounded-md bg-[#0f172a] border border-[#243041] outline-none"
                    value={socials.discord || ''}
                    onChange={(e) => setSocials((s) => ({ ...s, discord: e.target.value }))}
                    placeholder="username#1234"
                  />
                </label>
              </div>

              <div className="mt-2 text-xs text-slate-400">
                Plan, subscription tier, and credits are displayed and managed by billing. Contact support to change them.
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#243041]">
              <button className="px-4 py-2 rounded-md bg-[#233446] hover:bg-[#2b3e52]" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-[#BFA071] text-[#1A2533] font-bold hover:bg-[#E0C9A0] disabled:opacity-60"
                disabled={savingProfile}
                onClick={saveProfile}
              >
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
