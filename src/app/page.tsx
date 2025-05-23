'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const LandingPage: React.FC = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const isLoggedIn = !!user;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold">Loading...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-5 md:p-10 bg-gradient-to-br from-[#D4E1EE] via-[#F3E4D7] to-[#F0D1B0] text-[#3A4B5C] font-sans">
      {/* Container for top-corner buttons */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        {/* Top-left buttons */}
        <div className="flex items-center space-x-4">
          <Link
            href="/subscription"
            className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-full shadow-md hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
          >
            Subscriptions
          </Link>
        </div>
        
        {/* Top-right Login/Logout button */}
        <div>
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-500 text-white font-semibold rounded-full shadow-md hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              Logout ({user?.displayName || user?.email || 'User'})
            </button>
          ) : (
            <Link
              href="/login"
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              Login
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-4xl w-full text-center pt-24 pb-24"> {/* Added pt-24 to make space for top buttons */}
        <header className="mb-10 md:mb-16">
          <p className="font-['Lato'] text-xl md:text-2xl font-light tracking-widest mb-1 text-shadow-sm">WELCOME TO</p>
          <h1 className="font-['Georgia'] text-6xl md:text-7xl lg:text-8xl font-bold m-0 text-shadow-md">NARRATUM</h1>
        </header>
        <nav className="flex flex-wrap justify-center gap-6 md:gap-8 mb-12 md:mb-16">
          <Link
            href="/discover"
            className="flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]"
          >
            <i className="fas fa-book-open text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">DISCOVER</span>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">STORIES</span>
          </Link>
          <Link
              href={isLoggedIn ? "/create" : "/login"} 
              className={`flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0] ${!isLoggedIn ? 'opacity-70' : ''}`}
              onClick={(e) => {
                if (!isLoggedIn) {
                  // router.push('/login'); 
                }
              }}
              aria-disabled={!isLoggedIn}
              tabIndex={!isLoggedIn ? -1 : undefined}
            >
              <i className="fas fa-feather-alt text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">CREATE</span>
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">STORY</span>
          </Link>
          {isLoggedIn ? (
            <Link
              href="/profile"
              className="flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]"
            >
              <i className="fas fa-user-circle text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">MY</span>
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">PROFILE</span>
            </Link>
          ) : (
            <div 
              className="flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#E0E0E0] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#A0A0A0] opacity-70 cursor-not-allowed"
              title="Please log in to view your profile"
              aria-disabled="true"
            >
              <i className="fas fa-user-circle text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">MY</span>
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">PROFILE</span>
            </div>
          )}
        </nav>
        <footer className="font-['Georgia'] italic text-xl md:text-2xl text-[#3A4B5C] text-shadow-sm mt-8">
          <p>Where your words come to life</p>
        </footer>
        {/* View Subscriptions button removed from here as it was moved to the top */}
      </div>
    </div>
  );
};

export default LandingPage;
