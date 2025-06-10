'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
// Fix 1: Correctly separate the hook and type imports
import { useGetStoryWithContent, useCreateStoryContent } from '../../../../../dataconnect-generated/js/default-connector/react';
import type { GetStoryWithContentData } from '../../../../../dataconnect-generated/js/default-connector';
import { generateWritingPrompts } from '@/ai/flows/generate-writing-prompts';
import { Progress } from "@/components/ui/progress";

// SVG Icon Components
const FaBook = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 2.687c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388 1.879 1.168 1.768 1.093 3.854.08 5.632-.501.88-.99 1.71-1.465 2.554C13.254 13.132 12.035 14 10.5 14c-.98 0-1.793-.34-2.456-.884-.395-.315-.812-.682-1.25-1.125C6.35 11.534 5.774 11 5 11c-.61 0-1.165.277-1.65.625-.494.358-.993.746-1.464 1.175C1.35 13.312 1.002 14 0 14V2.687c.306-.928 1.023-1.687 1.89-2.071C2.825.228 3.94 0 5 0c1.554 0 2.986.826 3.5 2.687zM5 1c-1.036 0-2.024.3-2.847.68-1.054.468-1.653 1.442-1.653 2.51v9.043c.234-.14.49-.313.75-.518.522-.413 1.13-1.03 1.666-1.54C3.604 10.26 4.256 10 5 10c.85 0 1.58.464 2.212 1.031.61.549 1.144 1.133 1.634 1.724.49.59 1.077 1.238 1.654 1.238.63 0 1.18-.328 1.642-.85.51-.57 1-1.275 1.432-2.115.88-1.59 1.03-3.21-.432-4.63C12.392 4.962 11.325 4.5 10.5 4.5c-1.218 0-2.28.54-3.086 1.126-.616.452-1.228.93-1.914 1.452V2.19c-.026-.15-.05-.294-.083-.432C5.352 1.272 5.104 1 5 1z"></path></svg>;
const FaPlus = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"></path></svg>;
const FaLightbulb = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M4.603 12.634a.5.5 0 0 1 .491.592l-.5 2a.5.5 0 0 1-.982-.196l.5-2a.5.5 0 0 1 .491-.396Zm-.002-4.591a.5.5 0 0 1 .49.592l-.25 1a.5.5 0 0 1-.982-.196l.25-1a.5.5 0 0 1 .492-.396ZM12.012 8.625a.5.5 0 0 1 .49.592l-.25 1a.5.5 0 0 1-.982-.196l.25-1a.5.5 0 0 1 .492-.396ZM11.397 12.634a.5.5 0 0 1 .49.592l-.5 2a.5.5 0 0 1-.982-.196l.5-2a.5.5 0 0 1 .492-.396ZM8 2a4 4 0 0 0-4 4c0 .64.12 1.244.333 1.815.234.621.574 1.223.973 1.778l.028.038C6.38 11.48 7.38 12 8 12s1.62-.52 2.664-1.37a4.475 4.475 0 0 0 1.002-1.815C11.88 7.244 12 6.64 12 6a4 4 0 0 0-4-4Zm0 1a3 3 0 0 1 3 3c0 .495-.094.965-.262 1.401-.18.483-.43.935-.733 1.345l-.027.037c-.782.975-1.517 1.62-2 1.62-.482 0-1.218-.645-2-1.62l-.027-.037a3.52 3.52 0 0 1-.733-1.345A3.99 3.99 0 0 1 5 6a3 3 0 0 1 3-3Z"></path><path d="M8 15a1 1 0 0 0 1-1H7a1 1 0 0 0 1 1Zm0-12a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5Z"></path></svg>;
const FaImage = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"></path><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"></path></svg>;

// Correctly define the types based on the actual data structure
type Story = NonNullable<GetStoryWithContentData['story']>[number];
type StoryPage = NonNullable<Story['story_content']>[number];

const StoryEditorPage: React.FC = () => {
  const params = useParams();
  const storyId = params.storyId as string;
  
  const { data: storyData, loading: isLoadingStory, error } = useGetStoryWithContent({ storyId });
  const { mutate: updateStoryContent } = useCreateStoryContent();

  const [activePage, setActivePage] = useState<StoryPage | null>(null);
  const [currentPageContent, setCurrentPageContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  const story = storyData?.story?.[0];
  
  // Fix 2: Add a type guard to ensure we only work with valid page objects.
  const validPages = (story?.story_content ?? []).filter((p): p is StoryPage => !!p);

  useEffect(() => {
    if (validPages.length > 0 && !activePage) {
      setActivePage(validPages[0]);
      setCurrentPageContent(validPages[0].text_content || '');
    }
  }, [validPages, activePage]);
  
  const debouncedSave = useCallback(() => {
      if (saveStatus !== 'unsaved' || !activePage) return;

      updateStoryContent({
        id: activePage.id,
        story_id: storyId,
        text_content: currentPageContent,
        page_number: activePage.page_number
      }, {
        onSuccess: () => setSaveStatus('saved'),
        onError: (e: Error) => {
          console.error("Failed to save content:", e);
          setSaveStatus('unsaved');
        }
      });
  }, [saveStatus, activePage, currentPageContent, storyId, updateStoryContent]);

  useEffect(() => {
      const handler = setTimeout(() => {
        debouncedSave();
      }, 1500);
      return () => clearTimeout(handler);
  }, [currentPageContent, debouncedSave]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentPageContent(e.target.value);
    setSaveStatus('unsaved');
  };
  
  const selectPage = (page: StoryPage) => {
    setActivePage(page);
    setCurrentPageContent(page.text_content || '');
    setSaveStatus('saved');
  };
  
  const handleGeneratePrompt = async () => {
    if (!story) return;
    setIsGeneratingPrompt(true);
    setAiPrompt('');
    try {
      const result = await generateWritingPrompts({
        templateTitle: story.template?.title || 'General',
        userInput: currentPageContent,
      });
      
      if (result.writingPrompts && result.writingPrompts.length > 0) {
        setAiPrompt(result.writingPrompts[0]);
      } else {
        setAiPrompt('No prompts were generated. Try adding more to your story!');
      }
    } catch (e: any) {
      console.error('Error generating prompt:', e);
      setAiPrompt('Sorry, an error occurred while generating a prompt.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt) {
      setImageGenerationError('Please enter a prompt for the image.');
      return;
    }
    
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setImageGenerationError(null);
    setGenerationProgress(0);

    const progressInterval = setInterval(() => {
        setGenerationProgress(prev => (prev < 90 ? prev + 10 : prev));
    }, 500);

    try {
      const response = await fetch('/api/generate-image-via-python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      
      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'An unknown error occurred.');
      }

      const { imageUrl } = await response.json();
      setGeneratedImageUrl(imageUrl);

    } catch (e: any) {
      setImageGenerationError(e.message);
    } finally {
      setIsGeneratingImage(false);
      setTimeout(() => setGenerationProgress(0), 1000);
    }
  };

  if (isLoadingStory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0D1B0]">
        <p className="text-xl font-semibold text-[#3D4F60]">Loading your story editor...</p>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0D1B0]">
        <p className="text-xl font-semibold text-red-600">
          Error loading story: {error?.message || 'Story not found.'}
        </p>
        <Link href="/dashboard">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#3D4F60] flex flex-col">
      <header className="flex items-center justify-between p-3 bg-white border-b-2 border-[#D4E1EE] shadow-sm">
        <h1 className="text-xl font-bold font-serif">{story.title}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm italic">{saveStatus === 'saved' ? 'All changes saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}</span>
          <Link href="/dashboard" className="px-4 py-2 bg-[#3D4F60] text-white font-semibold rounded-lg shadow hover:bg-[#2c3a47] transition-colors">
            Exit Editor
          </Link>
        </div>
      </header>

      <div className="flex-grow grid grid-cols-12 gap-4 p-4">
        <aside className="col-span-3 bg-white border border-[#D4E1EE] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Manuscript</h2>
            <button className="p-2 rounded-full hover:bg-[#F0D1B0]/50" title="Add New Page"><FaPlus /></button>
          </div>
          <ul className="space-y-2">
            {validPages.map(page => (
              <li key={page.id}>
                <button
                  onClick={() => selectPage(page)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 ${activePage?.id === page.id ? 'bg-[#E97451] text-white font-bold' : 'hover:bg-[#F0D1B0]/50'}`}
                >
                  <FaBook /> {`Page ${page.page_number}`}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="col-span-6 flex flex-col">
          <textarea
            value={currentPageContent}
            onChange={handleContentChange}
            className="w-full h-full p-6 text-lg leading-relaxed bg-white border border-[#D4E1EE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E97451] resize-none"
            placeholder="Let your story unfold..."
            disabled={!activePage}
          />
        </main>

        <aside className="col-span-3 bg-white border border-[#D4E1EE] rounded-lg p-4 space-y-6">
          <h2 className="font-bold text-lg">The Muse</h2>
          <div>
            <h3 className="font-semibold mb-2">AI Writing Prompts</h3>
            <button 
              onClick={handleGeneratePrompt}
              disabled={isGeneratingPrompt}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#F0D1B0] text-[#3D4F60] font-semibold rounded-lg hover:bg-[#E0C9A0] transition-colors disabled:opacity-50"
            >
              <FaLightbulb /> {isGeneratingPrompt ? 'Generating...' : 'Get a Prompt'}
            </button>
            {aiPrompt && <p className="mt-3 p-3 bg-yellow-100/50 border-l-4 border-yellow-400 text-sm italic rounded">{aiPrompt}</p>}
          </div>
          <div>
            <h3 className="font-semibold mb-2">AI Image Generation</h3>
            <div className="space-y-3">
               <input 
                  type="text" 
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="A dragon soaring over a castle..." 
                  className="w-full p-2 border border-[#D4E1EE] rounded-md focus:outline-none focus:ring-2 focus:ring-[#E97451]"
                />
               <button 
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#D4E1EE] text-[#3D4F60] font-semibold rounded-lg hover:bg-[#B0C4DE] transition-colors disabled:opacity-50"
                >
                <FaImage /> {isGeneratingImage ? 'Generating...' : 'Generate Image'}
               </button>
               {isGeneratingImage && <Progress value={generationProgress} className="w-full" />}
               {imageGenerationError && <p className="text-sm text-red-600">{imageGenerationError}</p>}
               {generatedImageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border-2 border-[#E97451]">
                    <img src={generatedImageUrl} alt="AI generated image" className="w-full"/>
                  </div>
                )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default StoryEditorPage;
