'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCreateStory } from '@firebasegen/default-connector/react';
import type { CreateStoryData } from '@firebasegen/default-connector';
import { getUserProfile } from '@/lib/userUtils';
import GenreMultiSelect from '@/components/GenreMultiSelect';
import { ensureUserProfile } from '@/lib/ensureUserProfile';
// ✅ reuse component for both tabs
import UploadImageReference from '@/components/UploadImageReference';

/* ---------- Small UI helpers ---------- */
const InfoIcon = ({
  className = 'w-4 h-4 text-gray-500 cursor-pointer',
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
    stroke="currentColor" className={className} onClick={onClick}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FeatherIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className} fill="currentColor">
    <path d="M495.9 32.1c-1.2-1.2-2.8-2.3-4.4-3.1C443.5 1.7 416.5 0 384 0c-48.4 0-89.2 26.2-128 57.6C234.3 35.8 211.3 22.3 186.3 14.1 174.6 10.1 162.1 8 149.2 8 96.6 8 48 35.1 48 84.8c0 23.3 10.3 53.6 33.9 87.2-23.2 25.1-50.5 45.4-81.8 58.4-2.2.9-4.3 2.1-6.2 3.6-5.3 4.1-8 11.1-7.1 18.2.9 7.1 5.4 13.2 12.4 16.1 29.3 12.1 61.3 19.1 94.6 19.1 33.4 0 65.6-7.1 94.9-19.4 6.9-2.9 11.4-8.9 12.4-16.1.9-7.1-1.9-14.2-7.1-18.2-3.4-2.6-7.4-4.6-11.6-6.2-27.1-10.4-53.4-26.1-78.3-46.7 23.3-32.2 34.6-61.9 34.6-84.5 0-23.7-18-42.8-48-42.8-13.2 0-26.1 3.1-39.7 9.4-15.3 7-29.4 17.4-42.3 30.5 3.3 3.5 6.5 7.1 9.5 10.8 17.4 21.2 31.2 46.2 39.5 73.7 2.2 7.3 8.3 12.6 16 13.5 7.7.9 15-2.9 19-9.2 18.1-28.7 30.2-61.9 30.2-93.5 0-2.3-.2-4.6-.5-6.9 38.3-29 76.5-52.9 120.5-52.9 29.5 0 53.4 10.1 71.1 20.3-1.2 1.9-2.3 3.8-3.4 5.8-11.6 20.9-23.9 42.4-36.8 64.6-3.8 6.5-2.6 14.6 2.9 19.9 5.5 5.3 13.6 6.5 20.1 2.8 14.3-8.2 29.4-16.3 45.4-24.3 1.8-.9 3.6-1.8 5.4-2.7zM144 320c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm64-160c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm160 32c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.3 32-32z" />
  </svg>
);

/* ---------- Types ---------- */
interface NewStoryData { title: string; description: string; genres: string[]; }
type Tab = 'characterCreation' | 'locationGeneration' | 'proTips';
const GENRE_OPTIONS = ['Fantasy','Sci-Fi','Mystery','Horror','Romance','Adventure',"Children's",'Comedy','Drama','Action','Other'];

/* ---------- Modal + markdown helpers ---------- */
const Modal: React.FC<{ open: boolean; title: string; children: React.ReactNode; onClose: () => void; }> = ({ open, title, children, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[min(900px,92vw)] max-h-[80vh] overflow-hidden rounded-xl bg-[#FAF7F2] border-2 border-[#3D4F60] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 bg-[#FFF] border-b">
          <h3 className="text-lg font-bold text-[#3D4F60]">{title}</h3>
          <button className="px-3 py-1 rounded bg-[#E97451] text-white" onClick={onClose}>Close</button>
        </div>
        <div className="p-5 overflow-auto">{children}</div>
      </div>
    </div>
  );
};

const renderMarkdown = (md: string) => {
  const withBreaks = md
    .replace(/^### (.*$)/gim, '<h3 class="font-bold text-lg mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="font-bold text-xl mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="font-bold text-2xl mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 px-1 rounded">$1</code>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
  const wrapped = withBreaks.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="list-disc pl-5">$1</ul>');
  return <div dangerouslySetInnerHTML={{ __html: wrapped }} />;
};

/* ---------- Page ---------- */
const CreateStoryPage: React.FC = () => {
  const { user, starknetAddress, loading } = useAuth();
  const router = useRouter();
  const { mutate: createStory, isPending, error: createStoryError, reset } = useCreateStory();
  const isLoggedIn = !!user || !!starknetAddress;

  const [uiError, setUiError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('characterCreation');

  // modal
  const [mdOpen, setMdOpen] = useState(false);
  const [mdTitle, setMdTitle] = useState('');
  const [mdHtml, setMdHtml] = useState<React.ReactNode>(null);

  const [formData, setFormData] = useState<NewStoryData>({ title: '', description: '', genres: [] });

  useEffect(() => { if (!loading && !isLoggedIn) router.push('/login'); }, [isLoggedIn, loading, router]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  async function openMarkdownModal(title: string, publicPath: string) {
    try {
      const res = await fetch(encodeURI(publicPath));
      if (!res.ok) throw new Error(`Couldn't load ${publicPath}. Place it under /public.`);
      const text = await res.text();
      setMdTitle(title);
      setMdHtml(renderMarkdown(text));
      setMdOpen(true);
    } catch (err: any) {
      setMdTitle(title);
      setMdHtml(<div className="text-[#7a2e2e]">{`Couldn't load ${publicPath}. Make sure it exists in /public.`}</div>);
      setMdOpen(true);
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
  
    if (!user) {
      setUiError('You must be logged in to create a story.');
      return;
    }
  
    setUiError(null);
    reset();
    setIsVerifying(true);
  
    try {
      // Ensure the user profile doc exists (create minimal one if missing)
      await ensureUserProfile(user.uid, {
        displayName: user.displayName ?? null,
        email: user.email ?? null,
        lastSeen: new Date().toISOString(),
      });
  
      // Proceed with story creation immediately (no polling)
      createStory(
        {
          creatorId: user.uid,
          title: (formData.title || '').trim() || 'Untitled Story',
          description: (formData.description || '').trim() || 'No description provided.',
          genres: formData.genres.length ? formData.genres : ['Other'],
        },
        {
          onSuccess: (data: CreateStoryData) => {
            const id = data.story_insert?.id;
            if (id) {
              router.push(`/story/edit/${id}`);
            } else {
              setUiError('Story creation succeeded but no ID was returned.');
            }
          },
          onError: (err: Error) => {
            setUiError(`Failed to create story: ${err.message}`);
          },
        }
      );
    } catch (err: any) {
      setUiError(err?.message || 'Something went wrong while creating your story.');
    } finally {
      setIsVerifying(false);
    }
  };

  /* ---------- Tabs ---------- */
  const renderCharacterTab = () => (
    <UploadImageReference
      variant="character"
      assetCategory="characters"
      onOpenTemplate={() => openMarkdownModal('Character Creation Template', '/Character Creation template.md')}
    />
  );

  const renderLocationTab = () => (
    <UploadImageReference
      variant="location"
      assetCategory="locations"
      onOpenTemplate={() => openMarkdownModal('Location Generation Template', '/Location Generation Template.md')}
    />
  );

  const renderProTipsTab = () => (
    <div className="p-4">
      <h3 className="text-xl font-bold text-[#3D4F60] mb-4 flex items-center">
        <InfoIcon className="mr-2 w-6 h-6 text-[#E97451]" />
        Pro Tips for Prompting Images
      </h3>
      <div className="bg-[#E0C9A0]/20 border-2 border-[#B0C4DE] rounded-md p-4">
        <p className="text-[#3D4F60]/80 mb-4">
          Use clear subjects, style cues, lighting, mood, and composition ratios.
        </p>
        <img src="/master_prompt_guidance.PNG" alt="Master Prompt Guidance" className="w-full h-auto rounded-md shadow-md" />
      </div>
    </div>
  );

  /* ---------- Render ---------- */
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4
      bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
      text-[#3A4B5C] dark:text-[#E0C9A0] font-sans"
    >
      <div className="fixed top-7 right-4 z-50">
        <Link href="/" className="px-6 py-3 bg-[#3D4F60] text-white font-semibold rounded-full shadow-lg hover:bg-[#2c3a47]">
          Back to Landing
        </Link>
      </div>

      <div className="w-full max-w-4xl mx-auto pb-20">
        <div className="bg-[#F9F6F0] border-2 border-[#3D4F60] rounded-xl shadow-2xl p-8 relative z-10">
          <FeatherIcon className="pointer-events-none absolute top-8 right-8 text-5xl text-[#3D4F60] opacity-10" />

          <div className="text-center mb-10">
            <h1 className="font-serif text-5xl font-bold text-[#3D4F60] tracking-wider" style={{ fontFamily: '"Cinzel", serif' }}>
              Begin a New Tale
            </h1>
            <p className="text-[#3D4F60] mt-2 text-lg">First, let's establish the foundation of your world.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">Title</label>
                <input
                  type="text" id="title" name="title" value={formData.title} onChange={handleInputChange}
                  className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
                  placeholder="The Rise of the Shadow Dragon" required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">Genres</label>
                <GenreMultiSelect
                  genresList={GENRE_OPTIONS}
                  selectedGenres={formData.genres}
                  onSelectedGenresChange={(selected) => setFormData((prev) => ({ ...prev, genres: selected }))}
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">Brief Synopsis</label>
              <textarea
                id="description" name="description" value={formData.description} onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
                placeholder="A young mage discovers a hidden power that could save or shatter the kingdom..." rows={3} required
              />
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#3D4F60] mb-3 uppercase tracking-wide">Build References and Writer's AI Support</h3>

              <div className="flex justify-center mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('characterCreation')}
                  className={`px-6 py-2 rounded-l-lg ${activeTab === 'characterCreation' ? 'bg-[#E97451] text-white' : 'bg-[#D4E1EE] text-[#3D4F60] hover:bg-[#B0C4DE]'}`}
                >
                  Character Creation
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('locationGeneration')}
                  className={`px-6 py-2 ${activeTab === 'locationGeneration' ? 'bg-[#E97451] text-white' : 'bg-[#D4E1EE] text-[#3D4F60] hover:bg-[#B0C4DE]'}`}
                >
                  Location Generations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('proTips')}
                  className={`px-6 py-2 rounded-r-lg ${activeTab === 'proTips' ? 'bg-[#E97451] text-white' : 'bg-[#D4E1EE] text-[#3D4F60] hover:bg-[#B0C4DE]'}`}
                >
                  Pro Tips for Prompting
                </button>
              </div>

              {activeTab === 'characterCreation' && renderCharacterTab()}
              {activeTab === 'locationGeneration' && renderLocationTab()}
              {activeTab === 'proTips' && renderProTipsTab()}
            </div>

            {(uiError || createStoryError) && (
              <div className="mt-4 p-3 rounded-md text-sm text-center bg-red-100 text-red-800">
                {uiError || `An unexpected error occurred: ${createStoryError?.message}`}
              </div>
            )}

            <div className="text-center pt-4">
              <button
                type="submit" disabled={isPending || isVerifying}
                className="px-12 py-3 bg-[#E97451] text-white font-bold text-lg rounded-full shadow-lg hover:bg-[#d8633f] disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : isPending ? 'Creating...' : 'Start Writing'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Modal open={mdOpen} title={mdTitle} onClose={() => setMdOpen(false)}>
        {mdHtml}
      </Modal>
    </div>
  );
};

export default CreateStoryPage;
