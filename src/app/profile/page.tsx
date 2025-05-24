'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, starknetAddress, loading } = useAuth(); // Added starknetAddress
  const router = useRouter();
  const [message, setMessage] = useState('');
  const isLoggedIn = !!user || !!starknetAddress; // Combined login check

  useEffect(() => {
    if (!loading && !isLoggedIn) { // Use combined isLoggedIn check
      router.push('/login');
    }
  }, [isLoggedIn, loading, router]); // Added isLoggedIn to dependencies

  const contentImages = [
    'https://placehold.co/160x160/A88F72/FFFFFF?text=Story+1',
    'https://placehold.co/160x160/8B6F4E/FFFFFF?text=Story+2',
    'https://placehold.co/160x160/CBBBA0/FFFFFF?text=Story+3',
    'https://placehold.co/160x160/F0E6D2/4A3B31?text=Story+4',
    'https://placehold.co/160x160/D4E1EE/4A3B31?text=Story+5',
    'https://placehold.co/160x160/F3E4D7/4A3B31?text=Story+6',
  ];

  if (loading || !isLoggedIn) { // Use combined isLoggedIn check
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl font-semibold">{loading ? 'Loading profile...' : 'Redirecting to login...'}</p>
      </div>
    );
  }
  
  // Determine display name: Firebase user displayName, then email, then Starknet address, then fallback
  let displayName = 'Narratum User';
  if (user?.displayName) {
    displayName = user.displayName;
  } else if (user?.email) {
    displayName = user.email;
  } else if (starknetAddress) {
    displayName = `${starknetAddress.substring(0, 6)}...${starknetAddress.substring(starknetAddress.length - 4)}`;
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start bg-[#F5EFE3] text-[#4A3B31] font-['Georgia'] p-5 md:p-10 box-border">
      <div className="fixed top-4 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Back to Landing
        </Link>
      </div>
      <div className="profile-container w-full max-w-3xl text-center pt-16">
        <header className="profile-header mb-8">
          <div className="avatar-section relative inline-block mb-4">
            <div className="avatar-frame w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-[#8B6F4E] p-1.5 bg-[#F5EFE3] flex justify-center items-center shadow-md">
              <img
                src={user?.photoURL || 'https://placehold.co/160x160/A88F72/FFFFFF?text=User'} // Firebase photoURL if available
                alt={displayName}
                className="avatar-image w-full h-full rounded-full border-3 border-[#A88F72] object-cover"
              />
            </div>
          </div>
          <h1 className="user-name text-4xl md:text-5xl font-bold text-[#3D2B1F] m-0">
            {displayName}
          </h1>
        </header>

        <hr className="separator border-0 h-0.5 bg-[#B09A7A] my-8" />

        <nav className="profile-navigation flex justify-around items-center mb-8 px-2 md:px-4 flex-wrap gap-y-4">
          <button onClick={() => setMessage('My Stories section clicked! (Not implemented)')} className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#5C4B3E] transition-colors duration-300 hover:text-[#8B6F4E] focus:outline-none">MY STORIES</button>
          <button onClick={() => setMessage('Drafts section clicked! (Not implemented)')} className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#5C4B3E] transition-colors duration-300 hover:text-[#8B6F4E] focus:outline-none">DRAFTS</button>
          <button onClick={() => setMessage('Favorites section clicked! (Not implemented)')} className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#5C4B3E] transition-colors duration-300 hover:text-[#8B6F4E] focus:outline-none">FAVORITES</button>
        </nav>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-blue-100 text-blue-700">
            {message}
          </div>
        )}

        <main className="content-grid flex justify-center gap-5 flex-wrap">
          {contentImages.map((src, index) => (
            <a key={index} href={`#story${index + 1}`} onClick={(e) => {e.preventDefault(); setMessage('Story link clicked! (Not implemented)')}} className="content-card w-40 bg-[#F0E6D2] border-3 border-[#A88F72] rounded-lg p-1.5 block shadow-sm transition-transform duration-200 ease-in-out hover:translate-y-[-4px] hover:shadow-md">
              <img src={src} alt={`Story ${index + 1}`} className="w-full h-auto block rounded-sm" />
            </a>
          ))}
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
