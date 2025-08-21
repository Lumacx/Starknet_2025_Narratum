'use client';

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  useRef,
  DragEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCreateStory } from '@firebasegen/default-connector/react';
import type { CreateStoryData } from '@firebasegen/default-connector';
import { getUserProfile } from '@/lib/userUtils';
import GenreMultiSelect from '@/components/GenreMultiSelect';

// === Firebase Storage ===
// Ensure you have your Firebase app initialized in /lib/firebase (exported as default app)
import app from '@/lib/firebase';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  updateMetadata,
  listAll,
  getMetadata,
} from 'firebase/storage';

const storage = getStorage(app);

// ============== Small UI helpers ==============
const InfoIcon = ({
  className = 'w-4 h-4 text-gray-500 cursor-pointer',
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className={className}
    onClick={onClick}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const FeatherIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    className={className}
    fill="currentColor"
  >
    <path d="M495.9 32.1c-1.2-1.2-2.8-2.3-4.4-3.1C443.5 1.7 416.5 0 384 0c-48.4 0-89.2 26.2-128 57.6C234.3 35.8 211.3 22.3 186.3 14.1 174.6 10.1 162.1 8 149.2 8 96.6 8 48 35.1 48 84.8c0 23.3 10.3 53.6 33.9 87.2-23.2 25.1-50.5 45.4-81.8 58.4-2.2.9-4.3 2.1-6.2 3.6-5.3 4.1-8 11.1-7.1 18.2.9 7.1 5.4 13.2 12.4 16.1 29.3 12.1 61.3 19.1 94.6 19.1 33.4 0 65.6-7.1 94.9-19.4 6.9-2.9 11.4-8.9 12.4-16.1.9-7.1-1.9-14.2-7.1-18.2-3.4-2.6-7.4-4.6-11.6-6.2-27.1-10.4-53.4-26.1-78.3-46.7 23.3-32.2 34.6-61.9 34.6-84.5 0-23.7-18-42.8-48-42.8-13.2 0-26.1 3.1-39.7 9.4-15.3 7-29.4 17.4-42.3 30.5 3.3 3.5 6.5 7.1 9.5 10.8 17.4 21.2 31.2 46.2 39.5 73.7 2.2 7.3 8.3 12.6 16 13.5 7.7.9 15-2.9 19-9.2 18.1-28.7 30.2-61.9 30.2-93.5 0-2.3-.2-4.6-.5-6.9 38.3-29 76.5-52.9 120.5-52.9 29.5 0 53.4 10.1 71.1 20.3-1.2 1.9-2.3 3.8-3.4 5.8-11.6 20.9-23.9 42.4-36.8 64.6-3.8 6.5-2.6 14.6 2.9 19.9 5.5 5.3 13.6 6.5 20.1 2.8 14.3-8.2 29.4-16.3 45.4-24.3 1.8-.9 3.6-1.8 5.4-2.7zM144 320c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm64-160c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm160 32c0-17.7-14.3-32-32-32s-32 14.3-32 32 14.3 32 32 32 32-14.3 32-32z" />
  </svg>
);

// ============== Types ==============
interface NewStoryData {
  title: string;
  description: string;
  genres: string[];
}
type Tab = 'characterCreation' | 'locationGeneration' | 'proTips';

const GENRE_OPTIONS = [
  'Fantasy',
  'Sci-Fi',
  'Mystery',
  'Horror',
  'Romance',
  'Adventure',
  "Children's",
  'Comedy',
  'Drama',
  'Action',
  'Other',
];

// ============== Modal to show Markdown ==============
const Modal: React.FC<{
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}> = ({ open, title, children, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[min(900px,92vw)] max-h-[80vh] overflow-hidden rounded-xl bg-[#FAF7F2] border-2 border-[#3D4F60] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 bg-[#FFF] border-b">
          <h3 className="text-lg font-bold text-[#3D4F60]">{title}</h3>
          <button
            className="px-3 py-1 rounded bg-[#E97451] text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-5 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Simple Markdown renderer (minimal: headings, bullets, bold/italics, code)
const renderMarkdown = (md: string) => {
  // Keep it simple—convert newlines and basic formatting
  const withBreaks = md
    .replace(/^### (.*$)/gim, '<h3 class="font-bold text-lg mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="font-bold text-xl mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="font-bold text-2xl mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 px-1 rounded">$1</code>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
  // wrap any loose <li> with <ul>
  const wrapped = withBreaks.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="list-disc pl-5">$1</ul>');
  return <div dangerouslySetInnerHTML={{ __html: wrapped }} />;
};

// ============== Storage helpers ==============
type GalleryItem = {
  id: string;         // storage object name
  url: string;
  displayName: string; // from custom metadata (or filename)
};

async function uploadImageToStorage(
  file: File,
  uid: string,
  displayName: string
): Promise<GalleryItem> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const ext = file.name.split('.').pop() || 'bin';
  const objectRef = storageRef(storage, `users/${uid}/assets/${id}.${ext}`);

  // Upload
  await uploadBytes(objectRef, file, {
    contentType: file.type,
    customMetadata: { displayName },
  });

  // URL + metadata
  const url = await getDownloadURL(objectRef);
  const meta = await getMetadata(objectRef);
  const name =
    meta.customMetadata?.displayName || file.name.replace(/\.[^/.]+$/, '');

  return { id: objectRef.name, url, displayName: name };
}

async function listGallery(uid: string): Promise<GalleryItem[]> {
  const folder = storageRef(storage, `users/${uid}/assets/`);
  const res = await listAll(folder);
  const out: GalleryItem[] = [];
  for (const item of res.items) {
    const [url, meta] = await Promise.all([
      getDownloadURL(item),
      getMetadata(item),
    ]);
    out.push({
      id: item.name,
      url,
      displayName:
        meta.customMetadata?.displayName ||
        item.name.replace(/\.[^/.]+$/, ''),
    });
  }
  // most recent first
  return out.sort((a, b) => (a.id < b.id ? 1 : -1));
}

async function renameGalleryItem(
  uid: string,
  objectName: string,
  newDisplayName: string
) {
  const objRef = storageRef(storage, `users/${uid}/assets/${objectName}`);
  await updateMetadata(objRef, {
    customMetadata: { displayName: newDisplayName },
  });
}

// ============== Page ==============
const CreateStoryPage: React.FC = () => {
  const { user, starknetAddress, loading } = useAuth();
  const router = useRouter();
  const {
    mutate: createStory,
    isPending,
    error: createStoryError,
    reset,
  } = useCreateStory();
  const isLoggedIn = !!user || !!starknetAddress;

  const [uiError, setUiError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('characterCreation');

  // markdown modal
  const [mdOpen, setMdOpen] = useState(false);
  const [mdTitle, setMdTitle] = useState('');
  const [mdHtml, setMdHtml] = useState<React.ReactNode>(null);

  const [formData, setFormData] = useState<NewStoryData>({
    title: '',
    description: '',
    genres: [],
  });

  // Upload state (shared pattern for character & location)
  const [characterFile, setCharacterFile] = useState<File | null>(null);
  const [characterPreview, setCharacterPreview] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState<string>('');
  const [characterSuggested, setCharacterSuggested] = useState('');

  const [locationFile, setLocationFile] = useState<File | null>(null);
  const [locationPreview, setLocationPreview] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [locationSuggested, setLocationSuggested] = useState('');

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Load gallery when auth ready
  useEffect(() => {
    (async () => {
      if (user) {
        try {
          const items = await listGallery(user.uid);
          setGallery(items);
        } catch {
          // ignore missing folder
        }
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, loading, router]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const pollForUserProfile = async (uid: string) => {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 1000;
    for (let i = 0; i < MAX_RETRIES; i++) {
      const userProfile = await getUserProfile(uid);
      if (userProfile) return userProfile;
      await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
    }
    throw new Error(
      'User profile not available after multiple attempts. Please try again in a moment.'
    );
  };

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
      const userProfile = await pollForUserProfile(user.uid);
      if (!userProfile) return;

      createStory(
        {
          creatorId: user.uid,
          title: formData.title || 'Untitled Story',
          description: formData.description || 'No description provided.',
          genres: formData.genres.length > 0 ? formData.genres : ['Other'],
        },
        {
          onSuccess: (data: CreateStoryData) => {
            const newStoryId = data.story_insert?.id;
            if (newStoryId) {
              router.push(`/story/edit/${newStoryId}`);
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
      setUiError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // ===== Markdown fetcher =====
  async function openMarkdownModal(title: string, publicPath: string) {
    try {
      // Example: publicPath = "/Location Generation Template.md"
      const res = await fetch(encodeURI(publicPath));
      if (!res.ok) {
        throw new Error(
          `Couldn't load ${publicPath}. Make sure this file exists in /public`
        );
      }
      const text = await res.text();
      setMdTitle(title);
      setMdHtml(renderMarkdown(text));
      setMdOpen(true);
    } catch (err: any) {
      setMdTitle(title);
      setMdHtml(
        <div className="text-[#7a2e2e]">
          {`Couldn't load ${publicPath}. Make sure this file is placed under /public with that exact name.`}
        </div>
      );
      setMdOpen(true);
    }
  }

  // ===== Upload handling (preview + state) =====
  function fileToPreview(file: File, setPreview: (s: string) => void) {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function onPickFile(
    e: ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
    setName: (s: string) => void
  ) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      fileToPreview(f, setPreview);
      setName(f.name.replace(/\.[^/.]+$/, ''));
    }
  }

  function onDropFile(
    e: DragEvent<HTMLDivElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
    setName: (s: string) => void
  ) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      fileToPreview(f, setPreview);
      setName(f.name.replace(/\.[^/.]+$/, ''));
    }
  }

  // ===== Save uploads to Storage =====
  async function saveCurrentUpload(kind: 'character' | 'location') {
    if (!user) {
      setUiError('Please log in to save uploads.');
      return;
    }
    const file = kind === 'character' ? characterFile : locationFile;
    const name = kind === 'character' ? characterName : locationName;
    if (!file) return;

    setSaving(true);
    try {
      const saved = await uploadImageToStorage(file, user.uid, name || 'Asset');
      const items = await listGallery(user.uid);
      setGallery(items);

      // optional: set suggested prompt via your API
      const setSuggested =
        kind === 'character' ? setCharacterSuggested : setLocationSuggested;

      try {
        // If you add an API route, return { text: string }
        const resp = await fetch('/api/vision/describe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: saved.url }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.text) setSuggested(data.text);
        }
      } catch {
        // silently ignore if route not implemented
      }
    } catch (err: any) {
      setUiError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(item: GalleryItem, newName: string) {
    if (!user) return;
    try {
      await renameGalleryItem(user.uid, item.id, newName);
      const items = await listGallery(user.uid);
      setGallery(items);
    } catch (err: any) {
      setUiError(err.message);
    }
  }

  // ====== Tabs ======
  const renderCharacterCreationTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <div>
        <label
          htmlFor="characterDescription"
          className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide flex items-center"
        >
          Character Description
          <InfoIcon
            className="ml-2 w-5 h-5 text-[#E97451]"
            onClick={() =>
              openMarkdownModal(
                'Character Creation Template',
                '/Character Creation template.md'
              )
            }
          />
        </label>
        <textarea
          id="characterDescription"
          name="characterDescription"
          rows={7}
          className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
          placeholder="**[Character_Race] [Character_Class]**, [Character_Gender], [Age_Description], [Physical_Description_and_Key_Features], [Clothing_and_Armor_Description], [Weapon_or_Equipment_Description], **in an epic, dynamic position**, **split screen composition**, **left half: highly detailed close-up portrait of the face**, **right half: full body action shot of the character**, on a **clean white background**, intricate details, fantasy art, cinematic lighting --ar 16:9 [--no [Negative_Elements]] [--c [Chaos_Value]] [--p [Personalization_Style]]"
        ></textarea>

        <h4 className="font-bold text-[#3D4F60] mt-6 mb-3 uppercase tracking-wide">
          Upload Image Reference
        </h4>
        <div
          className="border-2 border-dashed border-[#B0C4DE] rounded-md p-4 text-center hover:bg-[#F0D1B0]/20 transition-all"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) =>
            onDropFile(e, setCharacterFile, setCharacterPreview, setCharacterName)
          }
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="uploadCharacterImage"
            onChange={(e) =>
              onPickFile(e, setCharacterFile, setCharacterPreview, setCharacterName)
            }
          />
          <label
            htmlFor="uploadCharacterImage"
            className="cursor-pointer text-[#E97451] font-semibold"
          >
            Click to Upload Image
          </label>
          <p className="text-sm text-[#3D4F60]/70 mt-1">or drag and drop</p>

          {characterPreview && (
            <div className="mt-3">
              <img
                src={characterPreview}
                alt="Character preview"
                className="mx-auto max-h-48 rounded-md border"
              />
            </div>
          )}

          {characterFile && (
            <div className="mt-3 text-sm">
              Selected: <span className="font-medium">{characterFile.name}</span>
            </div>
          )}
        </div>

        {characterFile && (
          <div className="mt-3">
            <label className="block text-xs font-bold text-[#3D4F60] mb-1 uppercase tracking-wide">
              Name to save
            </label>
            <input
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="w-full p-2 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
              placeholder="e.g., Knight Closeup Pose"
            />
            <button
              type="button"
              onClick={() => saveCurrentUpload('character')}
              disabled={saving}
              className="mt-3 w-full px-6 py-2 bg-[#3D4F60] text-white font-semibold rounded-md shadow hover:bg-[#2c3a47] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save to My Gallery'}
            </button>
          </div>
        )}

        <div className="mt-4">
          <label
            htmlFor="suggestedPromptChar"
            className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide"
          >
            Suggested Prompt Description (from AI)
          </label>
          <textarea
            id="suggestedPromptChar"
            name="suggestedPromptChar"
            rows={3}
            className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
            placeholder="Upload an image and click Save to My Gallery to get an AI description (if /api/vision/describe is implemented)."
            value={characterSuggested}
            onChange={(e) => setCharacterSuggested(e.target.value)}
          ></textarea>
        </div>

        <button
          type="button" // IMPORTANT: do not submit main form
          className="mt-4 w-full px-6 py-3 bg-[#3D4F60] text-white font-semibold rounded-md shadow-lg hover:bg-[#2c3a47] transition-transform transform hover:scale-105"
          onClick={() => {
            // hook up your image generation logic here
            // uses form fields / characterSuggested etc.
          }}
        >
          Generate Character Image (AI)
        </button>
      </div>

      {/* Right Side: Gallery */}
      <div className="bg-[#E0C9A0]/20 border-2 border-[#B0C4DE] rounded-md p-4 min-h-[300px]">
        <p className="text-[#3D4F60]/70 mb-3">My Gallery (click name to rename)</p>
        <div className="grid grid-cols-2 gap-3">
          {gallery.map((g) => (
            <div key={g.id} className="rounded border bg-white p-2">
              <img
                src={g.url}
                alt={g.displayName}
                className="w-full h-32 object-cover rounded"
              />
              <input
                className="mt-2 w-full text-sm border rounded px-2 py-1"
                defaultValue={g.displayName}
                onBlur={(e) => handleRename(g, e.target.value)}
                title="Click to rename, blur to save"
              />
            </div>
          ))}
          {gallery.length === 0 && (
            <div className="col-span-2 text-sm text-[#3D4F60]/70">
              Nothing here yet — upload and save an image to see it here.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderLocationGenerationTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <div>
        <label
          htmlFor="locationDescription"
          className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide flex items-center"
        >
          Location Description
          <InfoIcon
            className="ml-2 w-5 h-5 text-[#E97451]"
            onClick={() =>
              openMarkdownModal(
                'Location Generation Template',
                '/Location Generation Template.md'
              )
            }
          />
        </label>
        <textarea
          id="locationDescription"
          name="locationDescription"
          rows={7}
          className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
          placeholder="**[Location_Type]** in [Time_of_Day/Weather_Description], [Overall_Mood_or_Atmosphere], **[Key_Architectural_or_Environmental_Features]**, [Specific_Details_like_Flora_Fauna_Objects], [Lighting_Description], **epic wide shot**, **cinematic view**, intricate details, fantasy art, photorealistic --ar 16:9 [--no [Negative_Elements]] [--c [Chaos_Value]] [--p [Personalization_Style]]"
        ></textarea>

        <h4 className="font-bold text-[#3D4F60] mt-6 mb-3 uppercase tracking-wide">
          Upload Image Reference
        </h4>
        <div
          className="border-2 border-dashed border-[#B0C4DE] rounded-md p-4 text-center hover:bg-[#F0D1B0]/20 transition-all"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => onDropFile(e, setLocationFile, setLocationPreview, setLocationName)}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="uploadLocationImage"
            onChange={(e) =>
              onPickFile(e, setLocationFile, setLocationPreview, setLocationName)
            }
          />
          <label
            htmlFor="uploadLocationImage"
            className="cursor-pointer text-[#E97451] font-semibold"
          >
            Click to Upload Image
          </label>
          <p className="text-sm text-[#3D4F60]/70 mt-1">or drag and drop</p>

          {locationPreview && (
            <div className="mt-3">
              <img
                src={locationPreview}
                alt="Location preview"
                className="mx-auto max-h-48 rounded-md border"
              />
            </div>
          )}

          {locationFile && (
            <div className="mt-3 text-sm">
              Selected: <span className="font-medium">{locationFile.name}</span>
            </div>
          )}
        </div>

        {locationFile && (
          <div className="mt-3">
            <label className="block text-xs font-bold text-[#3D4F60] mb-1 uppercase tracking-wide">
              Name to save
            </label>
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full p-2 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
              placeholder="e.g., Desert City Dusk"
            />
            <button
              type="button"
              onClick={() => saveCurrentUpload('location')}
              disabled={saving}
              className="mt-3 w-full px-6 py-2 bg-[#3D4F60] text-white font-semibold rounded-md shadow hover:bg-[#2c3a47] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save to My Gallery'}
            </button>
          </div>
        )}

        <div className="mt-4">
          <label
            htmlFor="suggestedPromptLoc"
            className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide"
          >
            Suggested Prompt Description (from AI)
          </label>
          <textarea
            id="suggestedPromptLoc"
            name="suggestedPromptLoc"
            rows={3}
            className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
            placeholder="Upload an image and click Save to My Gallery to get an AI description (if /api/vision/describe is implemented)."
            value={locationSuggested}
            onChange={(e) => setLocationSuggested(e.target.value)}
          ></textarea>
        </div>

        <button
          type="button"
          className="mt-4 w-full px-6 py-3 bg-[#3D4F60] text-white font-semibold rounded-md shadow-lg hover:bg-[#2c3a47] transition-transform transform hover:scale-105"
        >
          Generate Location Image (AI)
        </button>
      </div>

      <div className="bg-[#E0C9A0]/20 border-2 border-[#B0C4DE] rounded-md p-4 min-h-[300px]">
        <p className="text-[#3D4F60]/70 mb-3">Location Image Gallery (same as left)</p>
        <div className="grid grid-cols-2 gap-3">
          {gallery.map((g) => (
            <div key={g.id} className="rounded border bg-white p-2">
              <img
                src={g.url}
                alt={g.displayName}
                className="w-full h-32 object-cover rounded"
              />
              <input
                className="mt-2 w-full text-sm border rounded px-2 py-1"
                defaultValue={g.displayName}
                onBlur={(e) => handleRename(g, e.target.value)}
                title="Click to rename, blur to save"
              />
            </div>
          ))}
          {gallery.length === 0 && (
            <div className="col-span-2 text-sm text-[#3D4F60]/70">
              Nothing here yet — upload and save an image to see it here.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProTipsTab = () => (
    <div className="p-4">
      <h3 className="text-xl font-bold text-[#3D4F60] mb-4 flex items-center">
        <InfoIcon className="mr-2 w-6 h-6 text-[#E97451]" />
        Pro Tips for Prompting Images
      </h3>
      <div className="bg-[#E0C9A0]/20 border-2 border-[#B0C4DE] rounded-md p-4">
        <p className="text-[#3D4F60]/80 mb-4">
          Here you will find advanced tips and tricks to craft effective prompts for AI
          image generation. Refer to <code>/Pro Tips for Prompting Images.md</code> in
          your public folder for detailed guidance.
        </p>
        <div className="mb-4">
          <h4 className="font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">
            Master Prompt Structure Guidance
          </h4>
          <img
            src="/master_prompt_guidance.PNG"
            alt="Master Prompt Guidance"
            className="w-full h-auto rounded-md shadow-md"
          />
          <p className="text-sm text-[#3D4F60]/70 mt-2">
            Use this structure as a guideline for crafting comprehensive image prompts.
          </p>
        </div>

        <label
          htmlFor="promptSandbox"
          className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide"
        >
          Prompt Sandbox
        </label>
        <textarea
          id="promptSandbox"
          name="promptSandbox"
          rows={5}
          className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
          placeholder="Experiment with your prompts here. E.g., 'A lone knight on a quest, mystical forest, dawn light, epic fantasy art --ar 16:9'"
        ></textarea>
        <button
          type="button"
          className="mt-4 w-full px-6 py-3 bg-[#3D4F60] text-white font-semibold rounded-md shadow-lg hover:bg-[#2c3a47] transition-transform transform hover:scale-105"
        >
          Test Prompt (AI Generation Preview)
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4
      bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
      text-[#3A4B5C] dark:text-[#E0C9A0] font-sans"
    >
      <div className="fixed top-7 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-3 bg-[#3D4F60] text-white font-semibold rounded-full shadow-lg hover:bg-[#2c3a47] transition-transform transform hover:scale-105"
        >
          Back to Landing
        </Link>
      </div>

      <div className="w-full max-w-4xl mx-auto pb-20">
        <div className="bg-[#F9F6F0] border-2 border-[#3D4F60] rounded-xl shadow-2xl p-8 relative z-10">
          <FeatherIcon className="pointer-events-none absolute top-8 right-8 text-5xl text-[#3D4F60] opacity-10" />

          <div className="text-center mb-10">
            <h1
              className="font-serif text-5xl font-bold text-[#3D4F60] tracking-wider"
              style={{ fontFamily: '"Cinzel", serif' }}
            >
              Begin a New Tale
            </h1>
            <p className="text-[#3D4F60] mt-2 text-lg">
              First, let's establish the foundation of your world.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
                  placeholder="The Rise of the Shadow Dragon"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">
                  Genres
                </label>
                <GenreMultiSelect
                  genresList={GENRE_OPTIONS}
                  selectedGenres={formData.genres}
                  onSelectedGenresChange={(selected) =>
                    setFormData((prev) => ({ ...prev, genres: selected }))
                  }
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide"
              >
                Brief Synopsis
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#B0C4DE] rounded-md bg-white text-[#3D4F60] focus:outline-none focus:ring-2 focus:ring-[#E97451]"
                placeholder="A young mage discovers a hidden power that could save or shatter the kingdom..."
                rows={3}
                required
              />
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#3D4F60] mb-3 uppercase tracking-wide">
                Build References and Writer's AI Support
              </h3>

              <div className="flex justify-center mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('characterCreation')}
                  className={`px-6 py-2 rounded-l-lg transition-colors duration-200 
                    ${
                      activeTab === 'characterCreation'
                        ? 'bg-[#E97451] text-white'
                        : 'bg-[#D4E1EE] text-[#3D4F60] hover:bg-[#B0C4DE]'
                    }`}
                >
                  Character Creation
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('locationGeneration')}
                  className={`px-6 py-2 transition-colors duration-200 
                    ${
                      activeTab === 'locationGeneration'
                        ? 'bg-[#E97451] text-white'
                        : 'bg-[#D4E1EE] text-[#3D4F60] hover:bg-[#B0C4DE]'
                    }`}
                >
                  Location Generations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('proTips')}
                  className={`px-6 py-2 rounded-r-lg transition-colors duration-200 
                    ${
                      activeTab === 'proTips'
                        ? 'bg-[#E97451] text-white'
                        : 'bg-[#D4E1EE] text-[#3D4F60] hover:bg-[#B0C4DE]'
                    }`}
                >
                  Pro Tips for Prompting
                </button>
              </div>

              <div>
                {activeTab === 'characterCreation' && renderCharacterCreationTab()}
                {activeTab === 'locationGeneration' && renderLocationGenerationTab()}
                {activeTab === 'proTips' && renderProTipsTab()}
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
                {isVerifying ? 'Verifying...' : isPending ? 'Creating...' : 'Start Writing'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Markdown modal */}
      <Modal open={mdOpen} title={mdTitle} onClose={() => setMdOpen(false)}>
        {mdHtml}
      </Modal>
    </div>
  );
};

export default CreateStoryPage;
