'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import { useState } from 'react';
import { useLocale } from '@/context/LocaleContext';

const Header: FC = () => {
  const { user, starknetAddress, logout, loading, credits } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const isLoggedIn = !!user || !!starknetAddress;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      console.log('User logged out');
      setIsDropdownOpen(false); // Close dropdown on logout
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleLanguage = () => {
    setLocale((prevLocale) => (prevLocale === 'en' ? 'es' : 'en'));
  };

  const blueButtonClasses = "px-6 py-3 bg-[#1877F2] text-white font-semibold rounded-full shadow-md hover:bg-[#166FE5] transition duration-300 flex items-center justify-center text-sm";
  const purpleButtonClasses = "px-6 py-3 bg-purple-600 text-white font-semibold rounded-full shadow-md hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 text-sm";
  const creditDisplayClasses = "px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold rounded-lg";
  const dropdownItemClasses = "block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700";

  let loginLogoutContent;
  let dropdownLogoutContent;
  let buttonText = t('login'); // Default to translated Login

  if (loading) {
    loginLogoutContent = <p className="text-white text-sm">{t('loading')}</p>;
    dropdownLogoutContent = <p className={dropdownItemClasses}>{t('loading')}</p>;
  } else if (isLoggedIn) {
    if (starknetAddress) {
      buttonText = `${starknetAddress.substring(0, 6)}...${starknetAddress.substring(starknetAddress.length - 4)}`;
    } else if (user && user.email) {
      buttonText = user.email.substring(0, user.email.indexOf('@'));
    } else if (user && user.displayName) {
      buttonText = user.displayName;
    }
    
    loginLogoutContent = (
      <>
        {credits !== null && (
          <span className={creditDisplayClasses}>
            {t('credits')} {credits}
          </span>
        )}
        <Link href="/buy-credits" className={purpleButtonClasses}>
          {t('buyCredits')}
        </Link>
        <button onClick={handleLogout} className={blueButtonClasses}>
          {buttonText} {t('logoutSuffix')}
        </button>
      </>
    );
    dropdownLogoutContent = (
      <>
        {credits !== null && (
          <span className={`${dropdownItemClasses} flex justify-between items-center`}>
            <span>{t('credits')}</span> <span className="font-bold">{credits}</span>
          </span>
        )}
        <Link href="/buy-credits" className={dropdownItemClasses} onClick={() => setIsDropdownOpen(false)}>
          {t('buyCredits')}
        </Link>
        <button onClick={handleLogout} className={`${dropdownItemClasses} w-full text-left`}>
          {buttonText} {t('logoutSuffix')}
        </button>
      </>
    );
  } else {
    loginLogoutContent = (
      <Link href="/login" className={blueButtonClasses}>
        {t('login')}
      </Link>
    );
    dropdownLogoutContent = (
      <Link href="/login" className={dropdownItemClasses} onClick={() => setIsDropdownOpen(false)}>
        {t('login')}
      </Link>
    );
  }

  return (
    <header className="py-4 px-4 md:px-8 bg-gray-800 text-white shadow-md"> 
      <div className="container mx-auto flex items-center justify-start space-x-4">
        {/* Left side: Language Toggle, Theme Toggle, and Hamburger Menu on small screens */}
        <button 
          onClick={toggleLanguage} 
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label="Toggle language"
        >
          {locale === 'en' ? 'EN' : 'ES'}
        </button>

        <ThemeToggle />

        {/* Hamburger menu for small screens */}
        <div className="md:hidden relative">
          <button 
            onClick={toggleDropdown} 
            className="flex items-center space-x-2 text-white hover:text-gray-300 focus:outline-none"
            aria-label="Toggle navigation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
            <span className="text-sm">{t('details')}</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20">
              <div className="py-1">
                <Link href="/subscription" className={dropdownItemClasses} onClick={() => setIsDropdownOpen(false)}>
                  {t('subscriptions')}
                </Link>
                {dropdownLogoutContent}
              </div>
            </div>
          )}
        </div>

        {/* Regular buttons for medium and larger screens */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/subscription" className={purpleButtonClasses}>
            {t('subscriptions')}
          </Link>
          {loginLogoutContent}
        </div>
      </div>
    </header>
  );
};

export default Header;