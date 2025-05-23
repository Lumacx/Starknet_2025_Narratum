'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const LegalDisclaimerPage: React.FC = () => {
  const [isChecked, setIsChecked] = useState(false);
  const [message, setMessage] = useState('');

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked);
    setMessage('');
  };

  const handleAccept = () => {
    if (isChecked) {
      console.log("Agreement accepted. User ID (placeholder): USER_ID_HERE");
      setMessage("Thank you for accepting the terms and conditions.");
      // Optionally navigate away: router.push('/');
    } else {
      setMessage("Please accept the terms and conditions to proceed.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5EFE3] text-[#4A3B31] font-['Georgia'] p-5 md:p-10 box-border text-center">
      <div className="disclaimer-container w-full max-w-xl">
        <header className="page-title mb-10 md:mb-12">
          <h1 className="font-['Merriweather'] text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-[#3E5062] leading-tight m-0">
            LEGAL<br />DISCLAIMER
          </h1>
        </header>

        <section className="disclaimer-content mb-8">
          <div className="text-box bg-[#FAF6EE] border-2 border-[#C1A98A] rounded-xl p-6 md:p-8 inline-block max-w-[90%] shadow-md">
            <p className="font-['Georgia'] text-lg md:text-xl leading-relaxed text-[#4A3B31] m-0">
              By accessing or using this website, you agree to our <a href="#" onClick={(e) => {e.preventDefault(); setMessage('Terms and Conditions link clicked! (Content not implemented)')}} className="text-[#3E5062] underline font-bold hover:text-[#2C3E50]">Terms and Conditions</a>.
            </p>
          </div>
        </section>

        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm ${message.includes('Error') || message.includes('Please') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <section className="acceptance-section mb-8 flex justify-center items-center">
          <input
            type="checkbox"
            id="accept-checkbox"
            name="accept-terms"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="appearance-none w-5 h-5 border-2 border-[#A88F72] rounded-sm bg-[#FDFBF5] mr-2 cursor-pointer checked:bg-[#A88F72] checked:border-[#8B6F4E] focus:outline-none focus:ring-2 focus:ring-[#A88F72]"
          />
          <label htmlFor="accept-checkbox" className="font-['Georgia'] text-base text-[#5C4B3E] cursor-pointer">
            I accept the terms and conditions
          </label>
        </section>

        <section className="action-section">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!isChecked}
            className={`font-['Merriweather'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-xl py-3 px-10 text-lg font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 shadow-md
              ${!isChecked ? 'opacity-50 cursor-not-allowed bg-[#85929E] text-[#CDD3D8] shadow-none' : 'hover:bg-[#4E5C6A]'}`}
          >
            ACCEPT
          </button>
        </section>
        <Link href="/" className="mt-12 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</Link>
      </div>
    </div>
  );
};

export default LegalDisclaimerPage;
