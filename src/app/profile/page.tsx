// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut, signInAnonymously, updateProfile, reload } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import AvatarUploader from '@/components/AvatarUploader';

const ProfilePage: React.FC = () => {
  const { user, starknetAddress, loading, logout } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const isLoggedIn = !!user || !!starknetAddress;

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

  const contentImages = [
    'https://placehold.co/160x160/A88F72/FFFFFF?text=Story+1',
    'https://placehold.co/160x160/8B6F4E/FFFFFF?text=Story+2',
    'https://placehold.co/160x160/CBBBA0/FFFFFF?text=Story+3',
    'https://placehold.co/160x160/F0E6D2/4A3B31?text=Story+4',
    'https://placehold.co/160x160/D4E1EE/4A3B31?text=Story+5',
    'https://placehold.co/160x160/F3E4D7/4A3B31?text=Story+6',
  ];

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
          <button onClick={() => setMessage('My Stories clicked!')} className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#3A4B5C] dark:text-[#E0C9A0] hover:text-[#8B6F4E] dark:hover:text-[#3A4B5C]">MY STORIES</button>
          <button onClick={() => setMessage('Drafts clicked!')} className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#3A4B5C] dark:text-[#E0C9A0] hover:text-[#8B6F4E] dark:hover:text-[#3A4B5C]">DRAFTS</button>
          <button onClick={() => setMessage('Favorites clicked!')} className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#3A4B5C] dark:text-[#E0C9A0] hover:text-[#8B6F4E] dark:hover:text-[#3A4B5C]">FAVORITES</button>
        </nav>

        <main className="content-grid flex justify-center gap-5 flex-wrap">
          {contentImages.map((src, index) => (
            <a key={index} href={`#story${index + 1}`} onClick={(e) => { e.preventDefault(); setMessage('Story clicked!'); }} className="content-card w-40 bg-[#F0E6D2] border-3 border-[#A88F72] rounded-lg p-1.5 block shadow-sm transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md">
              <img src={src} alt={`Story ${index + 1}`} className="w-full h-auto block rounded-sm" />
            </a>
          ))}
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
