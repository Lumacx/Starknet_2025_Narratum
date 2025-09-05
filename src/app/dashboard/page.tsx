'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useGetAllStories } from '@firebasegen/default-connector/react/esm/index.esm.js';
import { Story } from '@/lib/types';
import ThemeToggle from '../../components/ThemeToggle'; // <--- CORRECTED PATH

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const { data: storiesData, isLoading: storiesLoading, error } = useGetAllStories();

  const userStories = React.useMemo(() => {
    if (!user || !storiesData?.items) return [];
    return storiesData.items.filter((s: Story) => s.creator?.id === user.uid);
  }, [user, storiesData]);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || storiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2533] text-[#E0C9A0]">
        <p className="text-xl font-semibold">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-700">
        <p className="text-xl font-semibold">
          Error loading stories: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] 
      text-[#3A4B5C] dark:text-[#E0C9A0] font-sans relative px-4 pt-20 pb-10">

      {/* Back to Landing */}
      <div className="fixed top-7 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Back to Landing
        </Link>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4">My Stories</h1>
        <Link
          href="/create"
          className="inline-block px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition duration-300"
        >
          Create New Story
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {userStories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {userStories.map((story: Story) => (
              <div
                key={story.id}
                className="bg-[#233446] text-[#E0C9A0] rounded-lg border-2 border-[#4A5C6E] shadow-md hover:shadow-xl transition-shadow duration-300"
              >
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-2">{story.title}</h2>
                  <p className="text-sm mb-1">
                    <strong>Genre:</strong> {story.genres}
                  </p>
                  <p className="text-sm mb-4">
                    <strong>Status:</strong>{' '}
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        story.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {story.status}
                    </span>
                  </p>
                  <Link
                    href={`/story/edit/${story.id}`}
                    className="font-medium text-[#BFA071] hover:text-[#E0C9A0]"
                  >
                    Edit Story →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">No Stories Yet</h2>
            <p className="mb-4">You haven't created any stories. Get started now!</p>
            <Link
              href="/create"
              className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 transition duration-300"
            >
              Create Your First Story
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
