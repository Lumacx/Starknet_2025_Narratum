"use client";

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Story, StoryContent } from '../../../lib/types';
import StoryReader from '../../../components/StoryReader';
import Footer from '../../../components/layout/Footer';
import Header from '../../../components/header';
import Community from '../../../components/Community';
import { getStoryWithContent } from '../../../utils/story-queries';

type FullStory = Story & {
  storyContent: StoryContent[];
};

export default function StoryPage() {
  const params = useParams();
  const storyId = params.storyId as string;
  const [story, setStory] = useState<FullStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storyId) return;

    const fetchStory = async () => {
      try {
        setLoading(true);
        const data = await getStoryWithContent({ storyId });

        if (!data) {
          setError('Story not found.');
          return notFound();
        }

        setStory(data as FullStory);
      } catch (err) {
        console.error("Error fetching story:", err);
        setError('Failed to load the story. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [storyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading Story...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  if (!story) {
    return <div className="text-center p-8">Story not found.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4">
        <StoryReader story={story} />
        <Community story={story} />
      </main>
      <Footer />
    </div>
  );
}
