'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle'; // <--- CORRECTED PATH

const Header: FC = () => {
  const { user, starknetAddress, logout, loading, credits } = useAuth(); // Destructure credits
  const isLoggedIn = !!user || !!starknetAddress;

  const handleLogout = async () => {
    try {
      await logout();
      console.log('User logged out');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const blueButtonClasses = "px-6 py-3 bg-[#1877F2] text-white font-semibold rounded-full shadow-md hover:bg-[#166FE5] transition duration-300 flex items-center justify-center text-sm";
  const purpleButtonClasses = "px-6 py-3 bg-purple-600 text-white font-semibold rounded-full shadow-md hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 text-sm";
  const creditDisplayClasses = "px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold rounded-lg";

  let loginLogoutContent;
  if (loading) {
    loginLogoutContent = <p className="text-white text-sm">Loading...</p>;
  } else if (isLoggedIn) {
    let buttonText = 'Logout'; 
    if (starknetAddress) {
      buttonText = `${starknetAddress.substring(0, 6)}...${starknetAddress.substring(starknetAddress.length - 4)}`;
    } else if (user && user.email) {
      buttonText = user.email.substring(0, user.email.indexOf('@'));
    } else if (user && user.displayName) {
      buttonText = user.displayName;
    }
    
    loginLogoutContent = (
      <div className="flex items-center space-x-2">
        {credits !== null && (
          <span className={creditDisplayClasses}>
            Credits: {credits}
          </span>
        )}
        <Link href="/buy-credits" className={purpleButtonClasses}>
          Buy Credits
        </Link>
        <button onClick={handleLogout} className={blueButtonClasses}>
          {buttonText} (Logout)
        </button>
      </div>
    );
  } else {
    loginLogoutContent = (
      <Link href="/login" className={blueButtonClasses}>
        Login
      </Link>
    );
  }

  return (
    <header className="py-4 px-4 md:px-8 bg-gray-800 text-white shadow-md"> 
      <div className="container mx-auto flex items-center justify-start">
        <div className="flex items-center space-x-4" >
          {/* 🌙 Theme Toggle to the left */}
          <ThemeToggle />
          <Link href="/subscription" className={purpleButtonClasses}>
            Subscriptions
          </Link>
          {loginLogoutContent}
        </div>
      </div>
    </header>
  );
};

export default Header;