'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Trash2, Loader2, Info } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  ref,
  uploadString,
  getDownloadURL,
  listAll,
  deleteObject,
} from 'firebase/storage';
import { useRouter } from 'next/navigation';

// --- Helper Functions (copied from UploadImageReference.tsx) ---
const KB = 1024;
const MB = 1024 * KB;
const LIMITS: Record<string, { min: number; max: number }> = {
  'image/png': { min: 100 * KB, max: 5 * MB },
  'audio/mpeg': { min: 100 * KB, max: 5 * MB }, // mp3
  'video/mp4': { min: 1 * MB, max: 50 * MB },  // mp4
};
function fmt(bytes: number) {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / KB)} KB`;
}
function validate(file: File) {
  const l = LIMITS[file.type];
  if (!l) return { ok: false, msg: `Unsupported type: ${file.type}. Use PNG/MP3/MP4.` };
  if (file.size < l.min) return { ok: false, msg: `File too small. Min ${fmt(l.min)}.` };
  if (file.size > l.max) return { ok: false, msg: `File too large. Max ${fmt(l.max)}.` };
  return { ok: true };
}
function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
// --- End Helper Functions ---

type GalleryItem = { name: string; url: string; fullPath: string };

type Tab = 'my-gallery' | 'ai-generate' | 'new-upload';

interface CoverImageManagerProps {
  onCoverImageSaved: (url: string) => void;
  initialCoverUrl?: string; // To load an existing cover image
}

export default function CoverImageManager({ onCoverImageSaved, initialCoverUrl }: CoverImageManagerProps) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('my-gallery');
  const [selectedImageForCover, setSelectedImageForCover] = useState<string | null>(initialCoverUrl || null);
  const [selectedFileName, setSelectedFileName] = useState<string>(''); // For uploaded or generated image name

  // --- New Upload State ---
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadNameToSave, setUploadNameToSave] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // --- AI Generate State ---
  const [aiPrompt, setAiPrompt] = useState('');
  const [suggestedPrompt, setSuggestedPrompt] = useState(''); // From AI describe if an image is uploaded
  const [isDescribing, setIsDescribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [aiNameToSave, setAiNameToSave] = useState('');

  // --- My Gallery State ---
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  const assetCategory: 'covers' = 'covers'; // This component is specifically for covers

  // Load gallery for user
  const loadGallery = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingGallery(true);
    try {
      const base = ref(storage, `users/${currentUser.uid}/assets/${assetCategory}`);
      const res = await listAll(base);
      const items = await Promise.all(
        res.items.map(async (i) => ({
          name: i.name,
          fullPath: i.fullPath,
          url: await getDownloadURL(i),
        }))
      );
      setGallery(items.sort((a, b) => (a.name < b.name ? 1 : -1)));
    } catch (e) {
      console.error('Failed to load gallery:', e);
      // Optionally show an error to the user
    } finally {
      setIsLoadingGallery(false);
    }
  }, [currentUser, assetCategory]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // Handle selecting an image from the gallery
  const handleSelectFromGallery = (item: GalleryItem) => {
    setSelectedImageForCover(item.url);
    setSelectedFileName(item.name.replace(/\.[^.]+$/, ''));
  };

  // Handle file chosen for new upload
  async function onChooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const check = validate(f);
    if (!check.ok) {
      setUploadError(check.msg!);
      setUploadedFile(null);
      setUploadedPreviewUrl('');
      return;
    }
    setUploadError('');
    setUploadedFile(f);
    setUploadedPreviewUrl(URL.createObjectURL(f));
    setUploadNameToSave(f.name.replace(/\.[^.]+$/, ''));
    setSelectedImageForCover(URL.createObjectURL(f)); // Display in main box
    setSelectedFileName(f.name.replace(/\.[^.]+$/, ''));
  }

  // Handle AI Describe for an uploaded image (for prompt suggestion)
  async function handleDescribeImage() {
    try {
      if (!uploadedFile) return alert('Upload an image first to describe.');
      setIsDescribing(true);
      const dataUrl = await fileToDataUrl(uploadedFile);
      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI describe failed');
      setSuggestedPrompt(json.description);
      setAiPrompt(json.description); // Auto-fill AI prompt with suggested
    } catch (e: any) {
      alert(e?.message || 'AI error');
    } finally {
      setIsDescribing(false);
    }
  }

  // Handle AI Generate image
  async function handleGenerateImage() {
    try {
      if (!aiPrompt.trim()) return alert('Please enter a prompt for AI image generation.');
      setIsGenerating(true);
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI image generation failed');
      setGeneratedImageUrl(json.dataUrl);
      setSelectedImageForCover(json.dataUrl); // Display in main box
      setSelectedFileName(aiNameToSave || 'generated-cover');
    } catch (e: any) {
      alert(e?.message || 'Image generation error');
    } finally {
      setIsGenerating(false);
    }
  }

  // Handle saving the currently displayed image (uploaded or generated)
  async function handleSaveCoverImage() {
    try {
      if (!currentUser) {
        alert('You must be signed in to save an image.');
        router.push('/login'); // Redirect to login
        return;
      }
      if (!selectedImageForCover) {
        alert('No image selected to save.');
        return;
      }
      if (!selectedFileName.trim()) {
        alert('Please enter a name for the cover image.');
        return;
      }

      const isGenerated = generatedImageUrl === selectedImageForCover;
      const isUploaded = uploadedPreviewUrl === selectedImageForCover;
      const isFromGallery = gallery.some(item => item.url === selectedImageForCover);

      let dataUrlToSave = selectedImageForCover;
      let source = 'unknown';

      if (isGenerated) {
        // Already a data URL
        source = 'generated';
      } else if (isUploaded && uploadedFile) {
        // Need to convert file to data URL
        dataUrlToSave = await fileToDataUrl(uploadedFile);
        source = 'uploaded';
      } else if (isFromGallery) {
        // If from gallery, it's already in Firebase, just pass the URL.
        // The parent component (begin/page.tsx) will handle updating its state.
        onCoverImageSaved(selectedImageForCover);
        alert('Cover image updated successfully!');
        return; // Exit early as it's already in storage
      } else {
          // This case should ideally not happen if logic is tight
          throw new Error("Could not determine source of image to save.");
      }

      const path = `users/${currentUser.uid}/assets/${assetCategory}/${selectedFileName}.png`;
      const o = ref(storage, path);
      await uploadString(o, dataUrlToSave, 'data_url', {
        customMetadata: { displayName: selectedFileName, category: assetCategory, source: source, createdAt: String(Date.now()) },
      });
      const downloadUrl = await getDownloadURL(o);

      const newItem: GalleryItem = { name: `${selectedFileName}.png`, url: downloadUrl, fullPath: path };
      setGallery((g) => [newItem, ...g]); // Add to gallery
      onCoverImageSaved(downloadUrl); // Notify parent component

      alert('Cover image saved successfully!');
    } catch (e: any) {
      console.error('Save Cover Image Error:', e);
      alert(e?.message || 'Failed to save cover image.');
    } finally {
      setIsUploading(false);
    }
  }

  // Delete image from gallery
  async function handleDeleteFromGallery(item: GalleryItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteObject(ref(storage, item.fullPath));
      setGallery((g) => g.filter((x) => x.fullPath !== item.fullPath));
      if (selectedImageForCover === item.url) {
        setSelectedImageForCover(null); // Clear if deleted image was active
        setSelectedFileName('');
      }
      alert('Image deleted.');
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  }

  // Determine guidance message
  const getGuidanceMessage = () => {
    switch (activeTab) {
      case 'my-gallery':
        return selectedImageForCover ? "Click 'Save as Book Cover' to confirm this selection." : "Select an image from your gallery to set as Book Cover.";
      case 'ai-generate':
        return generatedImageUrl ? "Click 'Save as Book Cover' to use this AI-generated image." : "Describe the design you want AI to generate as your Book Cover.";
      case 'new-upload':
        return uploadedPreviewUrl ? "Click 'Save as Book Cover' to use this uploaded image." : "Select an image from your drive to set as Book Cover.";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* LEFT: Unified Image Display Box + Save Control */}
      <div className="lg:w-1/2 space-y-4 flex flex-col items-center">
        <h3 className="text-xl font-bold text-[#3D4F60]">Image Display Box</h3>
        <div className="w-full max-w-md h-80 border-2 border-[#B0C4DE] rounded-lg flex items-center justify-center bg-gray-100 overflow-hidden">
          {selectedImageForCover ? (
            <Image
              src={selectedImageForCover}
              alt="Selected Cover"
              width={500}
              height={500}
              className="object-contain w-full h-full"
            />
          ) : (
            <span className="text-gray-500">No image selected</span>
          )}
        </div>
        <input
            className="w-full max-w-md p-2 border-2 border-[#B0C4DE] rounded-md"
            placeholder="Name for image (e.g., 'Fantasy Cover Art')"
            value={selectedFileName}
            onChange={(e) => setSelectedFileName(e.target.value)}
        />
        <button
          onClick={handleSaveCoverImage}
          disabled={!selectedImageForCover || !selectedFileName.trim() || isUploading}
          className="w-full max-w-md py-3 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 transition-colors hover:bg-[#D46342]"
        >
          {isUploading ? <Loader2 className="animate-spin inline mr-2" size={20} /> : null}
          Save as Book Cover
        </button>
        <p className="text-sm text-gray-600 italic mt-2">{getGuidanceMessage()}</p>
      </div>

      {/* RIGHT: Selection Control + Conditional Content */}
      <div className="lg:w-1/2 space-y-4">
        <h3 className="text-xl font-bold text-[#3D4F60] mb-4">Select Image for Cover</h3>
        
        {/* Choices Chips */}
        <div className="flex space-x-2 p-1 bg-white rounded-lg shadow-sm border border-[#B0C4DE]">
          {(['my-gallery', 'ai-generate', 'new-upload'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setUploadError(''); // Clear errors on tab switch
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors
                ${activeTab === tab
                  ? 'bg-[#E97451] text-white shadow-md'
                  : 'bg-transparent text-[#3D4F60] hover:bg-[#D4E1EE]'
                }`}
            >
              {tab === 'my-gallery' ? 'My Gallery' : tab === 'ai-generate' ? 'AI Generate' : 'New Upload'}
            </button>
          ))}
        </div>

        {/* Conditional Content Panels */}
        <div className="mt-6 p-4 border-2 border-[#B0C4DE] rounded-xl bg-white shadow">
          {activeTab === 'my-gallery' && (
            <div>
              <h4 className="font-semibold mb-3 text-[#3D4F60]">My Gallery</h4>
              {isLoadingGallery ? (
                <p className="text-gray-500 flex items-center justify-center"><Loader2 className="animate-spin mr-2" size={18} /> Loading gallery...</p>
              ) : gallery.length === 0 ? (
                <p className="text-sm text-neutral-500">No images in your gallery yet. Try "AI Generate" or "New Upload".</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map((it: GalleryItem) => (
                    <div
                      key={it.fullPath}
                      onClick={() => handleSelectFromGallery(it)}
                      className={`relative group border-2 rounded-md overflow-hidden cursor-pointer
                        ${selectedImageForCover === it.url ? 'border-[#E97451] shadow-lg' : 'border-[#B0C4DE]'}
                        hover:border-[#E97451] transition-all duration-200`}
                    >
                      <Image src={it.url} alt={it.name} width={150} height={100} className="w-full h-32 object-cover" />
                      <button
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteFromGallery(it); }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/90 rounded-full p-1 shadow"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                      <div className="px-2 py-1 text-xs truncate text-[#3D4F60]">{it.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai-generate' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-[#3D4F60]">AI Image Generation</h4>
              <p className="text-sm text-gray-700">Describe the cover image you want to generate.</p>
              
              <textarea
                className="w-full min-h-[120px] border rounded-md p-2 border-[#B0C4DE] text-[#3D4F60] bg-white"
                placeholder="e.g., A fantastical forest with ancient trees and glowing flora at twilight..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              
              <button
                onClick={handleGenerateImage}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full py-3 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 transition-colors hover:bg-[#D46342] flex items-center justify-center gap-2"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={20} /> : null}
                Generate Cover Image (AI)
              </button>
            </div>
          )}

          {activeTab === 'new-upload' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-[#3D4F60]">Upload New Image</h4>
              <p className="text-sm text-gray-700">Upload a PNG image (100KB - 1MB).</p>
              
              <div className="border-2 border-dashed border-[#B0C4DE] rounded-md p-4 text-center bg-white">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={onChooseFile}
                />
                <button
                  className="cursor-pointer text-[#E97451] font-semibold hover:underline"
                  onClick={() => inputRef.current?.click()}
                >
                  Click to Upload Image
                </button>
                <p className="text-sm text-[#3D4F60]/70 mt-1">or drag and drop</p>
                {uploadedFile && (
                  <div className="mt-3 text-sm text-[#3D4F60]">
                    Selected: <span className="font-medium">{uploadedFile.name}</span>
                  </div>
                )}
              </div>
              {uploadError && <div className="text-red-600 text-sm mt-2">{uploadError}</div>}
              {uploadedPreviewUrl && (
                <div className="mt-3 border rounded-xl p-3 bg-gray-50">
                  <p className="text-sm mb-2 text-[#3D4F60]">Preview of Uploaded Image</p>
                  <Image
                    src={uploadedPreviewUrl}
                    alt="uploaded preview"
                    width={200}
                    height={150}
                    className="max-w-full rounded-md object-contain mx-auto"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
