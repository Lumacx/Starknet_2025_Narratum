'use client';

import React from 'react';
import Link from 'next/link';

const AboutUsPage: React.FC = () => {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#F5EFE3] text-[#4A3B31] font-['Georgia'] p-5 md:p-10 box-border text-center">
      <div className="fixed top-4 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Back to Landing
        </Link>
      </div>
      {/* Added pt-16 to about-container to avoid overlap */}
      <div className="about-container w-full max-w-3xl pt-16">
        <header className="page-title mb-10 md:mb-12">
          <h1 className="font-['Merriweather'] text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-[#5D4037] m-0">ABOUT US</h1>
        </header>

        <section className="quote-section mb-12 md:mb-16">
          <div className="quote-box bg-[#FAF6EE] border-2 border-[#C1A98A] rounded-xl p-6 md:p-8 inline-block max-w-[80%] shadow-md mx-auto">
            <p className="font-['Georgia'] text-xl md:text-2xl leading-relaxed text-[#4A3B31] m-0">
              Narratum is a gateway between worlds, where every voice finds its story.
            </p>
          </div>
        </section>

        <section className="image-section">
          <img
            src="https://placehold.co/350x250/C1A98A/FFFFFF?text=Book+Tree"
            alt="Narratum - Book of Worlds"
            className="main-image max-w-xs md:max-w-md w-full h-auto block mx-auto filter drop-shadow-lg"
          />
        </section>
        {/* Removed old Back to Landing button */}
      </div>
    </div>
  );
};

export default AboutUsPage;
