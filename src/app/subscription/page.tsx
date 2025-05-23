'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const SubscriptionPage: React.FC = () => {
  const [message, setMessage] = useState('');

  const handleSubscribe = (planName: string) => {
    setMessage(`You clicked to subscribe to the ${planName} plan! (Functionality not yet implemented)`);
    // In a real app, this would likely redirect to a payment provider or an internal checkout flow.
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 md:p-10 bg-gradient-to-br from-[#D4E1EE] via-[#F3E4D7] to-[#F0D1B0] text-[#4A3B31] font-sans">
      <div className="subscription-container w-full max-w-5xl text-center">
        <header className="page-header mb-12 md:mb-16">
          <h1 className="font-['Georgia'] text-5xl md:text-6xl font-bold text-[#2C3E50] mb-6 filter drop-shadow-md">NARRATUM</h1>
          <h1 className="font-['Merriweather'] text-3xl md:text-4xl font-bold uppercase tracking-wide text-[#2C3E50] mb-1">CHOOSE YOUR PATH</h1>
          <h2 className="font-['Merriweather'] text-2xl md:text-3xl font-normal uppercase tracking-wide text-[#2C3E50]">IN NARRATUM</h2>
        </header>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-blue-100 text-blue-700">
            {message}
          </div>
        )}

        <main className="pricing-plans flex justify-center gap-8 md:gap-10 flex-wrap">
          {/* Free Plan Card */}
          <div className="plan-card bg-[#F9F6F0] border-2 border-[#C1A98A] rounded-xl p-8 md:p-10 w-64 flex flex-col items-center shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
            <i className="fas fa-feather-alt text-6xl text-[#A9834F] mb-6"></i>
            <h3 className="font-['Merriweather'] text-2xl font-extrabold uppercase text-[#4A3B31] mb-2">FREE</h3>
            <p className="font-['Merriweather'] text-3xl font-bold text-[#3D2B1F] mb-6">Free</p>
            <button
              onClick={() => handleSubscribe('Free')}
              className="font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-6 text-base font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 ease-in-out w-4/5 shadow-md hover:bg-[#4E5C6A] hover:translate-y-[-2px]"
            >
              SUBSCRIBE
            </button>
          </div>

          {/* Plus Plan Card (Featured) */}
          <div className="plan-card featured-plan bg-[#F9F6F0] border-2 border-[#A9834F] rounded-xl p-8 md:p-10 w-64 flex flex-col items-center shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
            <i className="fas fa-star text-6xl text-[#A9834F] mb-6"></i>
            <h3 className="font-['Merriweather'] text-2xl font-extrabold uppercase text-[#4A3B31] mb-2">PLUS</h3>
            <p className="font-['Merriweather'] text-3xl font-bold text-[#3D2B1F] mb-6">$10 <span className="text-base font-normal block leading-none mt-0.5 text-[#5C4B3E]">month</span></p>
            <button
              onClick={() => handleSubscribe('Plus')}
              className="font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-6 text-base font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 ease-in-out w-4/5 shadow-md hover:bg-[#4E5C6A] hover:translate-y-[-2px]"
            >
              SUBSCRIBE
            </button>
          </div>

          {/* Master Plan Card */}
          <div className="plan-card bg-[#F9F6F0] border-2 border-[#C1A98A] rounded-xl p-8 md:p-10 w-64 flex flex-col items-center shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
            <i className="fas fa-dragon text-6xl text-[#A9834F] mb-6"></i>
            <h3 className="font-['Merriweather'] text-2xl font-extrabold uppercase text-[#4A3B31] mb-2">MASTER</h3>
            <p className="font-['Merriweather'] text-3xl font-bold text-[#3D2B1F] mb-6">$25 <span className="text-base font-normal block leading-none mt-0.5 text-[#5C4B3E]">month</span></p>
            <button
              onClick={() => handleSubscribe('Master')}
              className="font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-6 text-base font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 ease-in-out w-4/5 shadow-md hover:bg-[#4E5C6A] hover:translate-y-[-2px]"
            >
              SUBSCRIBE
            </button>
          </div>
        </main>

        <Link href="/" className="mt-12 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</Link>
      </div>
    </div>
  );
};

export default SubscriptionPage;
