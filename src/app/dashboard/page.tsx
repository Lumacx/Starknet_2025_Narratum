'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useListStoriesByUser } from '../../../dataconnect-generated/js/default-connector/react';

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Fetch stories using the generated hook, only if the user exists.
  const { data: storiesData, isLoading: storiesLoading, error } = useListStoriesByUser(
    user ? { userId: user.uid } : undefined,
    { enabled: !!user } // React Query option: only run the query if the user is available
  );

  // Redirect to login if not authenticated.
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || storiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl font-semibold text-gray-700">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
            <p className="text-xl font-semibold text-red-700">Error loading stories: {error.message}</p>
        </div>
    );
  }

  const stories = storiesData?.stories || [];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            My Stories
          </h1>
          <Link href="/create" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition duration-300">
            Create New Story
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {stories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map(story => (
                <div key={story.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{story.title}</h2>
                    <p className="text-gray-600 mb-1"><strong>Genre:</strong> {story.genre}</p>
                    <p className="text-gray-600 mb-4"><strong>Status:</strong> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${story.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{story.status}</span></p>
                    <Link href={`/story/edit/${story.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                      Edit Story &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Stories Yet</h2>
              <p className="text-gray-500 mb-4">You haven't created any stories. Get started now!</p>
              <Link href="/create" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 transition duration-300">
                Create Your First Story
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
