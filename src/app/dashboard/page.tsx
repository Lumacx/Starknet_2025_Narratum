'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [activeUsers, setActiveUsers] = useState(0);
  const [storiesCreated, setStoriesCreated] = useState(0);
  const [paidUsers, setPaidUsers] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user /* && !user.isAdmin */) {
      // Add admin role check here later, e.g. from a custom claim or Firestore user doc
      // For now, any logged-in user can see it. If not admin, redirect:
      // router.push('/'); 
      // setMessage('Access denied. Admin only.');
    }
  }, [user, loading, router]);

  const animateValue = (setter: React.Dispatch<React.SetStateAction<number>>, start: number, end: number, duration: number) => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp!) / duration, 1);
      setter(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  useEffect(() => {
    if (user) { // Only animate if user is loaded and authorized
      const targetActiveUsers = 1200;
      const targetStoriesCreated = 3500;
      const targetPaidUsers = 120;
      animateValue(setActiveUsers, 0, targetActiveUsers, 1500);
      animateValue(setStoriesCreated, 0, targetStoriesCreated, 1500);
      animateValue(setPaidUsers, 0, targetPaidUsers, 1500);
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl font-semibold">{loading ? 'Loading dashboard...' : 'Redirecting...'}</p>
      </div>
    );
  }
  
  // Optional: Add message display for non-admin access if you implement that logic
  // if (message.includes('Access denied')) return <div className="min-h-screen flex items-center justify-center"><p>{message}</p><Link href="/">Go Home</Link></div>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F5EFE3] text-[#3E5062] font-sans">
      <aside className="sidebar bg-[#3E5062] w-full md:w-20 pt-8 flex flex-row md:flex-col items-center justify-around md:justify-start flex-shrink-0 p-4 md:p-0">
        <nav className="sidebar-nav flex flex-row md:flex-col gap-4 md:gap-6">
          <button onClick={() => setMessage('Analytics clicked! (Not implemented)')} className="nav-item text-[#D4DDE4] text-2xl md:text-3xl p-2 md:p-3 rounded-md transition-colors duration-200 hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none">
            <i className="fas fa-chart-bar"></i>
          </button>
          {/* Add other sidebar buttons */}
          <button onClick={() => setMessage('Manage Stories clicked!')} className="nav-item text-[#D4DDE4] text-2xl md:text-3xl p-2 md:p-3 rounded-md transition-colors duration-200 hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none"><i className="fas fa-pencil-alt"></i></button>
          <button onClick={() => setMessage('User Reports clicked!')} className="nav-item text-[#D4DDE4] text-2xl md:text-3xl p-2 md:p-3 rounded-md transition-colors duration-200 hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none"><i className="fas fa-file-alt"></i></button>
          <button onClick={() => setMessage('Settings clicked!')} className="nav-item text-[#D4DDE4] text-2xl md:text-3xl p-2 md:p-3 rounded-md transition-colors duration-200 hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none"><i className="fas fa-cog"></i></button>
        </nav>
      </aside>

      <main className="main-content flex-grow p-8 md:p-12 flex flex-col items-center">
        <header className="dashboard-header text-center mb-12 w-full max-w-3xl">
          <div className="logo-title flex items-center justify-center mb-1">
            <i className="fas fa-book-open text-5xl text-[#B08D57] mr-4"></i>
            <span className="font-['Merriweather'] text-5xl font-extrabold text-[#3E5062] tracking-wide">NARRATUM</span>
          </div>
          <h1 className="font-['Lato'] text-xl md:text-2xl font-bold uppercase tracking-wide text-[#5D7081] m-0">ADMIN DASHBOARD</h1>
        </header>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-blue-100 text-blue-700">
            {message}
          </div>
        )}

        <section className="stats-overview w-full max-w-3xl mb-10">
          <div className="stats-box bg-[#FAF6EE] border-2 border-[#C1A98A] rounded-xl p-8 flex flex-wrap justify-around gap-5 shadow-md">
            <div className="stat-item text-center flex-grow basis-1/2 min-w-[150px] md:basis-auto">
              <div className="font-['Georgia'] text-6xl font-bold text-[#3E5062] leading-tight mb-1">{activeUsers}</div>
              <div className="font-['Lato'] text-sm font-bold uppercase tracking-wide text-[#5D7081]">ACTIVE USERS</div>
            </div>
            <div className="stat-item text-center flex-grow basis-1/2 min-w-[150px] md:basis-auto">
              <div className="font-['Georgia'] text-6xl font-bold text-[#3E5062] leading-tight mb-1">{storiesCreated}</div>
              <div className="font-['Lato'] text-sm font-bold uppercase tracking-wide text-[#5D7081]">STORIES CREATED</div>
            </div>
            <div className="stat-item text-center flex-grow basis-full md:basis-auto mt-5 md:mt-0">
              <div className="font-['Georgia'] text-6xl font-bold text-[#3E5062] leading-tight mb-1">{paidUsers}</div>
              <div className="font-['Lato'] text-sm font-bold uppercase tracking-wide text-[#5D7081]">PAID USERS</div>
            </div>
          </div>
        </section>

        <section className="action-area mt-8">
          {/* This button seems out of place, what was its original purpose? For now, a generic message */}
          <button type="button" onClick={() => setMessage('Main dashboard action clicked!')} className="font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-10 text-lg font-bold uppercase tracking-wide cursor-pointer transition-colors duration-300 shadow-md hover:bg-[#4E5C6A]">
            MAIN ACTION
          </button>
        </section>
        <Link href="/" className="mt-12 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</Link>
      </main>
    </div>
  );
};

export default DashboardPage;
