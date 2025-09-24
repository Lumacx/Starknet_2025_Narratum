'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';

const AboutUsPage: React.FC = () => {
  const { t } = useLocale();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center 
    bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] 
    text-[#3A4B5C] dark:text-[#E0C9A0] font-['Georgia'] p-5 md:p-10 box-border text-center">
      
      {/* --- Back to Landing Button --- */}
      <div className="fixed top-7 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          {t('backToLanding')}
        </Link>
      </div>
      
      {/* Using padding-top to avoid overlap with the fixed button */}
      <div className="about-container w-full max-w-3xl pt-16">
        <header className="page-title mb-10 md:mb-12">
          <h1 className="font-['Merriweather'] text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-[#3A4B5C] dark:text-[#E0C9A0] m-0">
            {t('aboutUsTitle')}
          </h1>
        </header>

        {/* --- Quote Section --- */}
        <section className="quote-section mb-12 md:mb-16">
          <div className="quote-box bg-[#FAF6EE] border-2 border-[#C1A98A] rounded-xl p-6 md:p-8 inline-block max-w-[80%] shadow-md mx-auto">
            <p className="font-['Georgia'] text-xl md:text-2xl leading-relaxed text-[#3A4B5C] m-0">
              {t('aboutUsQuote')}
            </p>
          </div>
        </section>

        {/* --- "Click image" prompt --- */}
        <p className="mb-4 text-lg text-[#3A4B5C] dark:text-[#E0C9A0]">
          {t('clickImageToVisit')}
        </p>

        {/* --- Image Section --- */}
        <section className="image-section">
          <a 
            href="https://narratum.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block group"
          >
            <img
              src="/Narratum Portal Door.png"
              alt={t('aboutUsImageAlt')}
              className="main-image max-w-xs md:max-w-md w-full h-auto block mx-auto filter drop-shadow-lg transition-transform duration-300 ease-in-out group-hover:scale-105"
            />
          </a>
        </section>
      </div>
    </div>
  );
};

export default AboutUsPage;
