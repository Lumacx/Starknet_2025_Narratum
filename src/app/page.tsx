// src/app/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const LandingPage: React.FC = () => {
  const { user, starknetAddress, loading } = useAuth();
  const isLoggedIn = !!user || !!starknetAddress;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <div
      className={`
        min-h-screen relative flex flex-col items-center justify-center p-5 md:p-10
        bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
        text-[#3A4B5C] dark:text-[#E0C9A0] font-sans
      `}
    >
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Video Modal */}
      {videoUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="relative bg-black rounded-2xl shadow-lg w-full max-w-4xl aspect-video">
            <iframe
              src={videoUrl}
              title="YouTube video"
              className="w-full h-full rounded-2xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            <button
              onClick={() => setVideoUrl(null)}
              className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-red-700"
              aria-label="Close video"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl w-full text-center pt-10 md:pt-16 pb-28">
        <header className="mb-10 md:mb-16">
          <p className="font-['Lato'] text-xl md:text-2xl font-light tracking-widest mb-1">WELCOME TO</p>
          <h1 className="font-['Georgia'] text-6xl md:text-7xl lg:text-8xl font-bold m-0">NARRATUM</h1>
        </header>

        {/* Action Cards */}
        <nav className="flex flex-wrap justify-center gap-6 md:gap-8 mb-12 md:mb-16">
          {/* Discover */}
          <Link
            href="/discover"
            className={`
              flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72
              bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C]
              transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]
            `}
          >
            <i className="fas fa-book-open text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8" />
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase">DISCOVER</span>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase">STORIES</span>
          </Link>

          {/* Create */}
          <Link
            href={isLoggedIn ? '/create/begin' : '/login'}
            className={`
              flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72
              bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C]
              transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]
              ${!isLoggedIn ? 'opacity-70' : ''}
            `}
            aria-disabled={!isLoggedIn}
            tabIndex={!isLoggedIn ? -1 : undefined}
          >
            <i className="fas fa-feather-alt text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8" />
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase">CREATE</span>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase">STORY</span>
          </Link>

          {/* Profile */}
          {isLoggedIn ? (
            <Link
              href="/profile"
              className={`
                flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72
                bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C]
                transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]
              `}
            >
              <i className="fas fa-user-circle text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8" />
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase">MY</span>
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase">PROFILE</span>
            </Link>
          ) : (
            <div
              title="Please log in to view your profile"
              aria-disabled="true"
              className={`
                flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72
                bg-[#E0E0E0] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#A0A0A0]
                opacity-70 cursor-not-allowed
              `}
            >
              <i className="fas fa-user-circle text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8" />
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase">MY</span>
              <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase">PROFILE</span>
            </div>
          )}
        </nav>

        {/* Teasers and Tutorials */}
        <div className="flex flex-col md:flex-row gap-6 justify-center mb-12">
          <button
            onClick={() => setVideoUrl('https://www.youtube.com/embed/utV8LROR3f4')}
            className={`
              px-6 py-3 bg-purple-600 text-white font-semibold rounded-full shadow-md hover:bg-purple-700
              transition transform hover:scale-105 animate-pulse-slow
            `}
          >
            🎬 Watch Teaser
          </button>
          <button
            onClick={() => setVideoUrl('https://www.youtube.com/embed/ATOhy6NASL0')}
            className={`
              px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700
              transition transform hover:scale-105 animate-pulse-slow
            `}
          >
            📘 Watch Tutorial
          </button>
        </div>

        <footer className="font-['Georgia'] italic text-xl md:text-2xl mt-8">
          <p>Where your words come to life</p>
        </footer>
      </div>

      {/* Feedback Button */}
      <a
        href="https://docs.google.com/forms/d/16mfeP7iiuWYU3vSThm-mt3ZygQRGPf3WbcP2yDLPiek/edit?pli=1"
        target="_blank"
        rel="noopener noreferrer"
        className={`
          fixed bottom-25 right-6 px-5 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold
          rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition z-50 animate-pulse-slow
        `}
      >
        💡 Provide Feedback
      </a>

      {/* Subtle glow keyframes (applied to teaser, tutorial, feedback buttons) */}
      <style jsx global>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(255, 255, 255, 0.25); }
          50% { box-shadow: 0 0 16px rgba(255, 255, 255, 0.6); }
        }
        .animate-pulse-slow {
          animation: pulseGlow 2.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
