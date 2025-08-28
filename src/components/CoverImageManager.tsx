'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Trash2, Loader2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  ref,
  uploadString,
  getDownloadURL,
  listAll,
  deleteObject,
  uploadBytes,
  getMetadata,
} from 'firebase/storage';
import { useRouter } from 'next/navigation';

/* ------------------------ Helpers ------------------------ */
const KB = 1024;
const MB = 1024 * KB;
const LIMITS: Record<string, { min: number; max: number }> = {
  'image/png':   { min: 100 * KB, max: 5 * MB },
  'audio/mpeg':  { min: 100 * KB, max: 5 * MB },
  'video/mp4':   { min: 1 * MB,  max: 50 * MB },
};
const fmt = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / KB)} KB`);
function validate(file: File) {
  const l = LIMITS[file.type];
  if (!l) return { ok: false, msg: `Unsupported type: ${file.type}. Use PNG/MP3/MP4.` };
  if (file.size < l.min) return { ok: false, msg: `File too small. Min ${fmt(l.min)}.` };
  if (file.size > l.max) return { ok: false, msg: `File too large. Max ${fmt(l.max)}.` };
  return { ok: true as const };
}
const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

/** Normalize /api/generate-image outputs into {dataUrl, modelUsed}. */
function extractImageAndModel(json: any): { dataUrl?: string; modelUsed?: string; provider?: string; location?: string; prompt?: string } {
  if (Array.isArray(json?.images) && json.images.length) {
    const first = json.images[0];
    const dataUrl =
      typeof first === 'string'
        ? (first.startsWith('data:') ? first : `data:image/png;base64,${first}`)
        : undefined;
    return {
      dataUrl,
      modelUsed: json.modelUsed || json.model || json.modelName,
      provider: json.provider,
      location: json.modelLocation,
      prompt: json.prompt,
    };
  }
  if (typeof json?.imageBase64 === 'string') {
    return {
      dataUrl: `data:image/png;base64,${json.imageBase64}`,
      modelUsed: json.modelUsed || json.model,
      provider: json.provider,
      location: json.location,
      prompt: json.prompt,
    };
  }
  if (typeof json?.dataUrl === 'string') {
    return { dataUrl: json.dataUrl, modelUsed: json.modelUsed || json.model, provider: json.provider, location: json.location, prompt: json.prompt };
  }
  if (typeof json?.image === 'string') {
    return {
      dataUrl: json.image.startsWith('data:') ? json.image : `data:image/png;base64,${json.image}`,
      modelUsed: json.modelUsed || json.model,
      provider: json.provider,
      location: json.location,
      prompt: json.prompt,
    };
  }
  return {};
}

/* ------------------------ Types ------------------------ */
type GalleryMeta = {
  modelUsed?: string | null;
  provider?: string | null;
  location?: string | null;
  prompt?: string | null;
  source?: string | null;
  displayName?: string | null;
  category?: string | null;
  createdAt?: string | null;
  storyId?: string | null;
  role?: string | null;
};
type GalleryItem = { name: string; url: string; fullPath: string; meta?: GalleryMeta };
type Tab = 'my-gallery' | 'ai-generate' | 'new-upload';

interface CoverImageManagerProps {
  onCoverImageSaved: (url: string) => void;
  initialCoverUrl?: string;

  /** Optional: tag files so Support/Scenes can filter */
  storyId?: string;
  assetRole?: 'cover' | 'reference' | 'character' | 'location' | 'scene' | string;
}

/* ======================== Component ======================== */
export default function CoverImageManager({
  onCoverImageSaved,
  initialCoverUrl,
  storyId,
  assetRole = 'cover',
}: CoverImageManagerProps) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Tabs / selection
  const [activeTab, setActiveTab] = useState<Tab>('my-gallery');
  const [selectedImageForCover, setSelectedImageForCover] = useState<string | null>(initialCoverUrl ?? null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadNameToSave, setUploadNameToSave] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // AI
  const [aiPrompt, setAiPrompt] = useState('');
  const [suggestedPrompt, setSuggestedPrompt] = useState('');
  const [isDescribing, setIsDescribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [aiNameToSave, setAiNameToSave] = useState('');
  const [aiModelUsed, setAiModelUsed] = useState<string | null>(null); // persists via metadata

  // Gallery
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  const assetCategory: 'covers' = 'covers';

  /* ------------------------ Gallery load ------------------------ */
  const loadGallery = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingGallery(true);
    try {
      const base = ref(storage, `users/${currentUser.uid}/assets/${assetCategory}`);
      const res = await listAll(base);
      const items = await Promise.all(
        res.items.map(async (i) => {
          const [url, meta] = await Promise.all([
            getDownloadURL(i),
            getMetadata(i).catch(() => null),
          ]);
          const cm = meta?.customMetadata || {};
          const obj: GalleryItem = {
            name: i.name,
            fullPath: i.fullPath,
            url,
            meta: {
              modelUsed: (cm['narratum:model'] || cm['modelUsed'] || cm['model'] || null) as string | null,
              provider: (cm['narratum:provider'] || cm['provider'] || null) as string | null,
              location: (cm['narratum:location'] || cm['location'] || null) as string | null,
              prompt: (cm['narratum:prompt'] || cm['prompt'] || null) as string | null,
              source: (cm['source'] || null) as string | null,
              displayName: (cm['displayName'] || null) as string | null,
              category: (cm['category'] || null) as string | null,
              createdAt: (cm['createdAt'] || null) as string | null,
              storyId: (cm['narratum:storyId'] || cm['storyId'] || null) as string | null,
              role: (cm['narratum:role'] || cm['role'] || null) as string | null,
            },
          };
          return obj;
        })
      );
      setGallery(items.sort((a, b) => (a.name < b.name ? 1 : -1)));
    } catch (e) {
      console.error('Failed to load gallery:', e);
    } finally {
      setIsLoadingGallery(false);
    }
  }, [currentUser, assetCategory]);

  useEffect(() => {
    loadGallery();
    if (initialCoverUrl) {
      const fileNameMatch = initialCoverUrl.match(/%2F([^%2F]+)\?/);
      if (fileNameMatch?.[1]) {
        setSelectedFileName(decodeURIComponent(fileNameMatch[1].replace(/\.[^.]+$/, '')));
      }
    }
  }, [loadGallery, initialCoverUrl]);

  /* ------------------------ Handlers ------------------------ */
  const handleSelectFromGallery = (item: GalleryItem) => {
    setSelectedImageForCover(item.url);
    setSelectedFileName(item.name.replace(/\.[^.]+$/, ''));
    setAiPrompt('');
    setSuggestedPrompt('');
    setAiModelUsed(item.meta?.modelUsed ?? null);
  };

  async function onChooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const check = validate(f);
    if (!check.ok) {
      setUploadError(check.msg || 'Invalid file.');
      setUploadedFile(null);
      setUploadedPreviewUrl('');
      setSelectedImageForCover(null);
      setSelectedFileName('');
      return;
    }
    setUploadError('');
    setUploadedFile(f);
    const dataUrl = await fileToDataUrl(f);
    setUploadedPreviewUrl(dataUrl);
    setUploadNameToSave(f.name.replace(/\.[^.]+$/, ''));
    setSelectedImageForCover(dataUrl);
    setSelectedFileName(f.name.replace(/\.[^.]+$/, ''));
    setAiPrompt('');
    setSuggestedPrompt('');
    setAiModelUsed(null);
  }

  async function handleDescribeImage(imageSource: File | string) {
    try {
      setIsDescribing(true);
      let payload: { dataUrl?: string; imageUrl?: string };
      if (typeof imageSource !== 'string') {
        payload = { dataUrl: await fileToDataUrl(imageSource) };
      } else if (imageSource.startsWith('data:')) {
        payload = { dataUrl: imageSource };
      } else {
        payload = { imageUrl: imageSource };
      }

      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'AI describe failed');
      setSuggestedPrompt(json.description || '');
      if (activeTab === 'ai-generate') setAiPrompt(json.description || '');
    } catch (e: any) {
      alert(e?.message || 'AI error');
    } finally {
      setIsDescribing(false);
    }
  }

  async function handleGenerateImage() {
    try {
      if (!aiPrompt.trim()) {
        alert('Please enter a prompt for AI image generation.');
        return;
      }
      setIsGenerating(true);
      setAiModelUsed(null);

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, count: 1, promptEcho: aiPrompt }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'AI image generation failed');

      const { dataUrl, modelUsed, provider, location, prompt } = extractImageAndModel(json);
      if (!dataUrl) throw new Error('No image returned by generator.');

      setGeneratedImageUrl(dataUrl);
      setSelectedImageForCover(dataUrl);
      setSelectedFileName(aiNameToSave || 'generated-cover');
      setSuggestedPrompt('');
      setAiModelUsed(modelUsed || null);

      // Stash prompt/provider/location in memory too (we’ll save it in Storage metadata if user saves to gallery)
      _lastGenMeta = {
        modelUsed: modelUsed || 'unknown',
        provider: provider || 'vertex-ai',
        location: location || 'us-central1',
        prompt: prompt || aiPrompt,
      };
    } catch (e: any) {
      alert(e?.message || 'Image generation error');
    } finally {
      setIsGenerating(false);
    }
  }

  // Keep last generation meta until user saves to gallery
  let _lastGenMeta: Required<Pick<GalleryMeta, 'modelUsed' | 'provider' | 'location' | 'prompt'>> | null = null;

  async function handleUploadNewFileToGallery() {
    try {
      if (!currentUser) {
        alert('You must be signed in to upload an image.');
        router.push('/login');
        return;
      }
      if (!uploadedFile) return alert('No file selected for upload.');
      if (!uploadNameToSave.trim()) return alert('Please enter a name for the image before saving to gallery.');

      setIsUploading(true);
      const path = `users/${currentUser.uid}/assets/${assetCategory}/${uploadNameToSave}.png`;
      const storageRef = ref(storage, path);

      await uploadString(storageRef, uploadedPreviewUrl, 'data_url', {
        customMetadata: {
          displayName: uploadNameToSave,
          category: assetCategory,
          source: 'uploaded',
          createdAt: String(Date.now()),
          'narratum:storyId': storyId || '',
          'narratum:role': assetRole,
        },
      });
      const downloadUrl = await getDownloadURL(storageRef);

      // Optimistic add
      setGallery(g => [{ name: `${uploadNameToSave}.png`, url: downloadUrl, fullPath: path }, ...g]);

      setActiveTab('my-gallery');
      setSelectedImageForCover(downloadUrl);
      setSelectedFileName(uploadNameToSave);
      setUploadedFile(null);
      setUploadedPreviewUrl('');
      setUploadNameToSave('');
      setAiModelUsed(null);

      alert('Image uploaded and saved to gallery!');
    } catch (e: any) {
      console.error('Upload to Gallery Error:', e);
      alert(e?.message || 'Failed to upload image to gallery.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSaveGeneratedToGallery() {
    try {
      if (!currentUser) {
        alert('You must be signed in to save an image.');
        router.push('/login');
        return;
      }
      if (!generatedImageUrl) return alert('No AI image generated to save.');
      if (!aiNameToSave.trim()) return alert('Please enter a name for the AI generated image before saving to gallery.');

      setIsUploading(true);
      const path = `users/${currentUser.uid}/assets/${assetCategory}/${aiNameToSave}.png`;
      const storageRef = ref(storage, path);

      const blob = dataURLtoBlob(generatedImageUrl);
      await uploadBytes(storageRef, blob, {
        customMetadata: {
          displayName: aiNameToSave,
          category: assetCategory,
          source: 'ai-generated',
          createdAt: String(Date.now()),
          'narratum:model': aiModelUsed || 'unknown',
          'narratum:provider': _lastGenMeta?.provider || 'vertex-ai',
          'narratum:location': _lastGenMeta?.location || 'us-central1',
          'narratum:prompt': _lastGenMeta?.prompt || aiPrompt,
          'narratum:storyId': storyId || '',
          'narratum:role': assetRole,
        },
      });
      const downloadUrl = await getDownloadURL(storageRef);

      setGallery((g) => [{ name: `${aiNameToSave}.png`, url: downloadUrl, fullPath: path }, ...g]);

      setActiveTab('my-gallery');
      setSelectedImageForCover(downloadUrl);
      setSelectedFileName(aiNameToSave);
      setGeneratedImageUrl('');
      setAiNameToSave('');
      // keep aiModelUsed; it will be reloaded from metadata next mount/refresh
      alert('AI Generated image saved to gallery!');
    } catch (e: any) {
      console.error('Save Generated to Gallery Error:', e);
      alert(e?.message || 'Failed to save generated image to gallery.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleSaveCoverImage() {
    if (!selectedImageForCover) {
      alert('No image selected to set as cover.');
      return;
    }
    onCoverImageSaved(selectedImageForCover);
    alert('Book Cover image updated successfully!');
  }

  async function handleDeleteFromGallery(item: GalleryItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteObject(ref(storage, item.fullPath));
      setGallery((g) => g.filter((x) => x.fullPath !== item.fullPath));
      if (selectedImageForCover === item.url) {
        setSelectedImageForCover(null);
        setSelectedFileName('');
        setAiModelUsed(null);
      }
      alert('Image deleted.');
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  }

  const hasSelected = !!selectedImageForCover;
  const isCurrentCover = hasSelected && initialCoverUrl === selectedImageForCover;
  const guidance = !hasSelected
    ? 'Select or generate an image to set as your Book Cover.'
    : isCurrentCover
    ? 'This is your current Book Cover. No changes needed unless you select a new one.'
    : "Click 'Set as Book Cover' to save this image as your story's cover.";

  /* ------------------------ UI ------------------------ */
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* LEFT: Display */}
      <div className="lg:w-1/2 space-y-4 flex flex-col items-center">
        <h3 className="text-xl font-bold text-[#3D4F60]">Current Cover Candidate</h3>

        <div className="w-full max-w-md h-80 border-2 border-[#B0C4DE] rounded-lg flex items-center justify-center bg-gray-100 overflow-hidden relative">
          {selectedImageForCover ? (
            <>
              <Image
                src={selectedImageForCover}
                alt="Selected Cover"
                width={500}
                height={500}
                className="object-contain w-full h-full"
                unoptimized
              />
              {isCurrentCover && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  CURRENT COVER
                </div>
              )}
              {aiModelUsed && (
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                  AI • {aiModelUsed}
                </div>
              )}
            </>
          ) : (
            <span className="text-gray-500">No image selected</span>
          )}
        </div>

        {hasSelected && (
          <input
            className="w-full max-w-md p-2 border-2 border-[#B0C4DE] rounded-md"
            placeholder="Name for image"
            value={selectedFileName}
            onChange={(e) => setSelectedFileName(e.target.value)}
            disabled={true}
          />
        )}

        <button
          onClick={handleSaveCoverImage}
          disabled={Boolean(!hasSelected || isCurrentCover)}
          className="w-full max-w-md py-3 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 transition-colors hover:bg-[#D46342]"
        >
          Set as Book Cover
        </button>
        <p className="text-sm text-gray-600 italic mt-2">{guidance}</p>
      </div>

      {/* RIGHT: Controls */}
      <div className="lg:w-1/2 space-y-4">
        <h3 className="text-xl font-bold text-[#3D4F60] mb-4">Select Image for Cover</h3>

        {/* Choice chips */}
        <div className="flex space-x-2 p-1 bg-white rounded-lg shadow-sm border border-[#B0C4DE]">
          {(['my-gallery', 'ai-generate', 'new-upload'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); setUploadError(''); setSuggestedPrompt(''); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === t ? 'bg-[#E97451] text-white shadow-md' : 'bg-transparent text-[#3D4F60] hover:bg-[#D4E1EE]'
              }`}
            >
              {t === 'my-gallery' ? 'My Gallery' : t === 'ai-generate' ? 'AI Generate' : 'New Upload'}
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 border-2 border-[#B0C4DE] rounded-xl bg-white shadow">
          {/* MY GALLERY */}
          {activeTab === 'my-gallery' && (
            <div>
              <h4 className="font-semibold mb-3 text-[#3D4F60]">My Gallery</h4>
              {isLoadingGallery ? (
                <p className="text-gray-500 flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2" size={18} /> Loading gallery...
                </p>
              ) : gallery.length === 0 ? (
                <p className="text-sm text-neutral-500">No images in your gallery yet. Try "AI Generate" or "New Upload".</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.map((it) => (
                      <div
                        key={it.fullPath}
                        onClick={() => handleSelectFromGallery(it)}
                        className={`relative group border-2 rounded-md overflow-hidden cursor-pointer
                          ${selectedImageForCover === it.url ? 'border-[#E97451] shadow-lg' : 'border-[#B0C4DE]'}
                          ${initialCoverUrl === it.url ? 'ring-2 ring-blue-500' : ''} hover:border-[#E97451] transition-all duration-200`}
                      >
                        <Image src={it.url} alt={it.name} width={150} height={100} className="w-full h-32 object-cover" />
                        {initialCoverUrl === it.url && (
                          <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full z-10">Current</div>
                        )}
                        {/* Badge if asset has model metadata */}
                        {it.meta?.modelUsed && (
                          <div className="absolute top-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                            AI • {it.meta.modelUsed}
                          </div>
                        )}

                        <button
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); handleDeleteFromGallery(it); }}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/90 rounded-full p-1 shadow z-10 translate-y-6"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                        <div className="px-2 py-1 text-xs truncate text-[#3D4F60]">{it.name}</div>

                        {selectedImageForCover === it.url && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDescribeImage(it.url); }}
                            disabled={Boolean(isDescribing)}
                            className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition bg-blue-500/90 text-white text-xs px-2 py-0.5 rounded-md shadow z-10"
                          >
                            {isDescribing ? <Loader2 className="animate-spin inline mr-1" size={12} /> : null}
                            AI Describe
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {activeTab === 'my-gallery' && suggestedPrompt && selectedImageForCover && (
                    <div className="w-full mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                      <p className="font-semibold">AI Suggestion:</p>
                      <p className="mt-1">{suggestedPrompt}</p>
                      <button
                        onClick={() => { setActiveTab('ai-generate'); setAiPrompt(suggestedPrompt); }}
                        className="mt-2 px-3 py-1 text-xs bg-blue-200 text-blue-900 rounded-md hover:bg-blue-300"
                      >
                        Use as AI Prompt
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* AI GENERATE */}
          {activeTab === 'ai-generate' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-[#3D4F60]">AI Image Generation</h4>
              <p className="text-sm text-gray-700">Describe the cover image you want to generate. Use "AI Describe" on an existing image to get ideas.</p>

              <div className="flex items-center gap-2">
                <textarea
                  className="w-full min-h-[120px] border rounded-md p-2 border-[#B0C4DE] text-[#3D4F60] bg-white"
                  placeholder="e.g., A fantastical forest with ancient trees and glowing flora at twilight..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                {suggestedPrompt && aiPrompt !== suggestedPrompt && (
                  <button
                    onClick={() => setAiPrompt(suggestedPrompt)}
                    className="shrink-0 px-3 py-2 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                    title="Use suggested prompt"
                  >
                    Use Suggestion
                  </button>
                )}
              </div>

              <input
                className="w-full p-2 border-2 border-[#B0C4DE] rounded-md"
                placeholder="Name for generated image"
                value={aiNameToSave}
                onChange={(e) => setAiNameToSave(e.target.value)}
              />

              <button
                onClick={handleGenerateImage}
                disabled={Boolean(isGenerating || !aiPrompt.trim())}
                className="w-full py-3 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 transition-colors hover:bg-[#D46342] flex items-center justify-center gap-2"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={20} /> : null}
                Generate Cover Image (AI)
              </button>

              {generatedImageUrl && (
                <button
                  onClick={handleSaveGeneratedToGallery}
                  disabled={Boolean(isUploading || !aiNameToSave.trim())}
                  className="w-full py-3 rounded-md bg-green-600 text-white font-semibold disabled:opacity-50 transition-colors hover:bg-green-700 flex items-center justify-center gap-2 mt-2"
                >
                  {isUploading ? <Loader2 className="animate-spin inline mr-2" size={20} /> : null}
                  Save Generated to Gallery
                </button>
              )}
            </div>
          )}

          {/* NEW UPLOAD */}
          {activeTab === 'new-upload' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-[#3D4F60]">Upload New Image</h4>
              <p className="text-sm text-gray-700">Upload a PNG image (100KB - 5MB).</p>

              <div className="border-2 border-dashed border-[#B0C4DE] rounded-md p-4 text-center bg-white">
                <input ref={inputRef} type="file" accept="image/png" className="hidden" onChange={onChooseFile} />
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
                <div className="mt-3 border rounded-xl p-3 bg-gray-50 flex flex-col items-center gap-2">
                  <p className="text-sm mb-2 text-[#3D4F60]">Preview of Uploaded Image</p>
                  <Image src={uploadedPreviewUrl} alt="uploaded preview" width={200} height={150} className="max-w-full rounded-md object-contain mx-auto" />
                  <input
                    className="w-full p-2 border-2 border-[#B0C4DE] rounded-md mt-2"
                    placeholder="Name for uploaded image"
                    value={uploadNameToSave}
                    onChange={(e) => setUploadNameToSave(e.target.value)}
                  />
                  <button
                    onClick={() => uploadedFile && handleDescribeImage(uploadedFile)}
                    disabled={Boolean(isDescribing || !uploadedFile)}
                    className="w-full py-2 rounded-md bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors hover:bg-blue-600 flex items-center justify-center gap-2 mt-2"
                  >
                    {isDescribing ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                    AI Describe Uploaded Image
                  </button>
                  {suggestedPrompt && (
                    <div className="w-full mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                      <p className="font-semibold">AI Suggestion:</p>
                      <p>{suggestedPrompt}</p>
                      <button
                        onClick={() => { setActiveTab('ai-generate'); setAiPrompt(suggestedPrompt); }}
                        className="mt-2 px-3 py-1 text-xs bg-blue-200 text-blue-900 rounded-md hover:bg-blue-300"
                      >
                        Use as AI Prompt
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handleUploadNewFileToGallery}
                    disabled={Boolean(isUploading || !uploadedFile || !uploadNameToSave.trim())}
                    className="w-full py-3 rounded-md bg-green-600 text-white font-semibold disabled:opacity-50 transition-colors hover:bg-green-700 flex items-center justify-center gap-2 mt-2"
                  >
                    {isUploading ? <Loader2 className="animate-spin inline mr-2" size={20} /> : null}
                    Upload and Save to Gallery
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
