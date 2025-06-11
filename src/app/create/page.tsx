'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCreateStory } from '../../../dataconnect-generated/js/default-connector/react';
import type { CreateStoryData } from '../../../dataconnect-generated/js/default-connector';
import { getUserProfile } from '@/lib/userUtils';

// Feather Icon SVG Component
const FeatherIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    className={className}
    fill="currentColor"
  >
    <path d="M495.9 32.1c-1.2-1.2-2.8-2.3-4.4-3.1C443.5 1.7 416.5 0 384 0c-48.4 0-89.2 26.2-128 57.6C234.3 35.8 211.3 22.3 186.3 14.1 174.6 10.1 162.1 8 149.2 8 96.6 8 48 35.1 48 84.8c0 23.3 10.3 53.6 33.9 87.2-23.2 25.1-50.5 45.4-81.8 58.4-2.2.9-4.3 2.1-6.2 3.6-5.3 4.1-8 11.1-7.1 18.2.9 7.1 5.4 13.2 12.4 16.1 29.3 12.1 61.3 19.1 94.6 19.1 33.4 0 65.6-7.1 94.9-19.4 6.9-2.9 11.4-8.9 12.4-16.1.9-7.1-1.9-14.2-7.1-18.2-3.4-2.6-7.4-4.6-11.6-6.2-27.1-10.4-53.4-26.1-78.3-46.7 23.3-32.2 34.6-61.9 34.6-84.5 0-23.7-18-42.8-48-42.8-13.2 0-26.1 3.1-39.7 9.4-15.3 7-29.4 17.4-42.3 30.5 3.3 3.5 6.5 7.1 9.5 10.8 17.4 21.2 31.2 46.2 39.5 73.7 2.2 7.3 8.3 12.6 16 13.5 7.7.9 15-2.9 19-9.2 18.1-28.7 30.2-61.9 30.2-93.5 0-2.3-.2-4.6-.5-6.9 38.3-29 76.5-52.9 120.5-52.9 29.5 0 53.4 10.1 71.1 20.3-1.2 1.9-2.3 3.8-3.4 5.8-11.6 20.9-23.9 42.4-36.8 64.6-3.8 6.5-2.6 14.6 2.9 19.9 5.5 5.3 13.6 6.5 20.1 2.8 14.3-8.2 29.4-16.3 45.4-24.3 1.8-.9 3.6-1.8 5.4-2.7zM144 320c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm64-160c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm160 32c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.3 32-32z"/>
  </svg>
);

interface Template {
  id: string;
  title: string;
  description: string;
}

interface NewStoryData {
  title: string;
  description: string;
  genre: string;
  templateId: string;
}

const mockTemplates: Template[] = [
    { id: 'three-act', title: 'Three-Act Structure', description: 'A classic model dividing a story into Setup, Confrontation, and Resolution.' },
    { id: 'heros-journey', title: "The Hero's Journey", description: 'A common narrative archetype involving a hero who goes on an adventure.' },
    { id: 'frettags-pyramid', title: "Freytag's Pyramid", description: 'A five-part structure focusing on Exposition, Rising Action, Climax, Falling Action, and Dénouement.' },
  ];

const CreateStoryPage: React.FC = () => {
  const { user, starknetAddress, loading } = useAuth();
  const router = useRouter();
  const { mutate: createStory, isPending, error: createStoryError, reset } = useCreateStory();
  const isLoggedIn = !!user || !!starknetAddress;

  const [uiError, setUiError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [formData, setFormData] = useState<NewStoryData>({
    title: '',
    description: '',
    genre: 'Fantasy',
    templateId: mockTemplates[0].id,
  });
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const genreSelectRef = useRef<HTMLSelectElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, loading, router]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  
  const handleTemplateSelect = (templateId: string) => {
    setFormData(prev => ({ ...prev, templateId }));
  };

  const pollForUserProfile = async (uid: string) => {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 1000;
  
    for (let i = 0; i < MAX_RETRIES; i++) {
      const userProfile = await getUserProfile(uid);
      if (userProfile) {
        return userProfile; // Profile found, return it.
      }
      // If profile not found, wait before retrying.
      await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
    }
  
    // If the loop finishes without finding a profile, throw an error.
    throw new Error("User profile not available after multiple attempts. Please try again in a moment.");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
        setUiError("You must be logged in to create a story.");
        return;
    };

    setUiError(null);
    reset(); // Reset any previous `createStory` errors.
    setIsVerifying(true);

    try {
      // This function will now poll for the user profile.
      const userProfile = await pollForUserProfile(user.uid);
      if (!userProfile) {
        // This case should now be handled by the error thrown in pollForUserProfile.
        return;
      }

      // Once the profile is confirmed, proceed to create the story.
      createStory({
        creatorId: user.uid,
        title: formData.title || 'Untitled Story',
        description: formData.description || 'No description provided.',
        genre: formData.genre || 'General',
      }, {
        onSuccess: (data: CreateStoryData) => {
          const newStoryId = data.story_insert?.id;
          if (newStoryId) {
            router.push(`/story/edit/${newStoryId}`);
          } else {
            setUiError("Story creation succeeded but no ID was returned.");
          }
        },
        onError: (err: Error) => {
          // This will catch errors from the `createStory` mutation itself.
          setUiError(`Failed to create story: ${err.message}`);
        }
      });
    } catch (err: any) {
      // This will catch the error from `pollForUserProfile` if it fails.
      setUiError(err.message);
    } finally {
        setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0D1B0]">
        <p className="text-xl font-semibold text-[#3D4F60]">Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] font-sans">
      <div className="fixed top-4 right-4 z-50">
        <Link href="/" className="px-5 py-2 bg-[#3D4F60] text-white font-semibold rounded-full shadow-lg hover:bg-[#2c3a47] transition-transform transform hover:scale-105">
          Back to Landing
        </Link>
      </div>

      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-[#F9F6F0] border-2 border-[#3D4F60] rounded-xl shadow-2xl p-8 relative">
          <FeatherIcon className="absolute top-8 right-8 text-5xl text-[#3D4F60] opacity-10" />
          
          <div className="text-center mb-10">
            <h1 className="font-serif text-5xl font-bold text-[#3D4F60] tracking-wider" style={{ fontFamily: '"Cinzel", serif' }}>
              Begin a New Tale
            </h1>
            <p className="text-[#3D4F60] mt-2 text-lg">First, let's establish the foundation of your world.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="cursor-pointer" onClick={() => titleInputRef.current?.focus()}>
                <label htmlFor="title" className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">Title</label>
                <input
                  ref={titleInputRef}
                  type="text" id="title" name="title" value={formData.title} onChange={handleInputChange}
                  className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451] cursor-pointer"
                  placeholder="The Rise of the Shadow Dragon" required
                />
              </div>
              <div className="cursor-pointer" onClick={() => genreSelectRef.current?.focus()}>
                <label htmlFor="genre" className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">Genre</label>
                <select
                  ref={genreSelectRef}
                  id="genre" name="genre" value={formData.genre} onChange={handleInputChange}
                  className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451] cursor-pointer"
                >
                  <option>Fantasy</option><option>Science Fiction</option><option>Mystery</option><option>Romance</option><option>Thriller</option>
                </select>
              </div>
            </div>

            <div className="cursor-pointer" onClick={() => descriptionTextareaRef.current?.focus()}>
              <label htmlFor="description" className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">Brief Synopsis</label>
              <textarea
                ref={descriptionTextareaRef}
                id="description" name="description" value={formData.description} onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451] cursor-pointer"
                placeholder="A young mage discovers a hidden power that could save or shatter the kingdom..." rows={3} required
              />
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-[#3D4F60] mb-3 uppercase tracking-wide">Choose a Narrative Structure</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {mockTemplates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${formData.templateId === template.id ? 'border-[#E97451] bg-[#F0D1B0]/30 scale-105' : 'border-[#B0C4DE] hover:border-[#D4E1EE]'}`}
                  >
                    <h4 className="font-bold text-[#3D4F60]">{template.title}</h4>
                    <p className="text-sm text-[#3D4F60]/80 mt-1">{template.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {(uiError || createStoryError) && (
              <div className="mt-4 p-3 rounded-md text-sm text-center bg-red-100 text-red-800">
                {uiError || `An unexpected error occurred: ${createStoryError?.message}`}
              </div>
            )}
            
            <div className="text-center pt-4">
              <button
                type="submit"
                disabled={isPending || isVerifying}
                className="px-12 py-3 bg-[#E97451] text-white font-bold text-lg rounded-full shadow-lg hover:bg-[#d8633f] transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#F0D1B0] disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : (isPending ? 'Creating...' : 'Start Writing')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryPage;
