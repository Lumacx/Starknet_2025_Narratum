'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Info, Trash2, Music, Film, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  ref,
  uploadString,
  getDownloadURL,
  listAll,
  deleteObject,
} from 'firebase/storage';

/* ---------- Types ---------- */
type GalleryItem = { name: string; url: string; fullPath: string; contentType?: string };

type AssetCategory =
  | 'covers' | 'avatars' | 'characters' | 'locations' | 'backgrounds'
  | 'audioNarrations' | 'audioEffects'
  | 'videos' | 'others';

type Props = {
  variant: 'character' | 'location' | 'cover';
  nounOverride?: string;
  onOpenTemplate?: () => void;
  onSaved?: (item: GalleryItem) => void;
  mainPromptLabel?: string;
  assetCategory: AssetCategory;
};

/* ---------- Helpers: categories ---------- */
const imageCats = new Set<AssetCategory>(['covers','avatars','characters','locations','backgrounds']);
const audioCats = new Set<AssetCategory>(['audioNarrations','audioEffects']);
const videoCats = new Set<AssetCategory>(['videos']);
const isImageCategory = (c: AssetCategory) => imageCats.has(c);
const isAudioCategory = (c: AssetCategory) => audioCats.has(c);
const isVideoCategory = (c: AssetCategory) => videoCats.has(c);

/* ---------- Limits aligned to Storage.rules ---------- */
// Images: PNG/JPG 50 KB – 10 MB
// Audio: MP3 50 KB – 15 MB
// Video: MP4 1 MB – 50 MB
const KB = 1024;
const MB = 1024 * KB;
const LIMITS: Record<string, { min: number; max: number }> = {
  'image/png':  { min: 50 * KB, max: 10 * MB },
  'image/jpeg': { min: 50 * KB, max: 10 * MB },
  'audio/mpeg': { min: 50 * KB, max: 15 * MB },
  'audio/mp3':  { min: 50 * KB, max: 15 * MB },
  'video/mp4':  { min: 1 * MB,  max: 50 * MB },
};
function fmt(bytes: number) {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / KB)} KB`;
}
function validate(file: File) {
  const l = LIMITS[file.type];
  if (!l) return { ok: false, msg: `Unsupported type: ${file.type}. Use PNG/JPG, MP3, or MP4.` };
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

/* ---------- Component ---------- */
export default function UploadImageReference({
  variant, nounOverride, onOpenTemplate, onSaved, mainPromptLabel, assetCategory
}: Props) {
  const { user: currentUser } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const noun = nounOverride ?? (variant === 'character' ? 'Character' : variant === 'location' ? 'Location' : 'Cover');
  const generateCta = variant === 'character'
    ? 'Generate Character Image (AI)'
    : variant === 'location'
      ? 'Generate Location Image (AI)'
      : 'Generate Cover Image (AI)';

  // Upload/AI state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [nameToSave, setNameToSave] = useState('');
  const [suggestedPrompt, setSuggestedPrompt] = useState('');
  const [mainPrompt, setMainPrompt] = useState('');
  const [isDescribing, setIsDescribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDataUrl, setGeneratedDataUrl] = useState(''); // PNG data URL
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [err, setErr] = useState('');

  /* ---------- Load gallery (only after user exists) ---------- */
  useEffect(() => {
    if (!currentUser) {
      console.warn('UploadImageReference: No current user, skipping gallery load.');
      return;
    }

    console.log('UploadImageReference: Attempting to load gallery for UID:', currentUser.uid, 'and category:', assetCategory);

    const base = ref(storage, `users/${currentUser.uid}/assets/${assetCategory}/`); // trailing slash
    listAll(base)
      .then(async (res) => {
        console.log('UploadImageReference: Gallery loaded successfully for UID:', currentUser.uid, 'items:', res.items.length);
        const items = await Promise.all(
          res.items.map(async (i) => ({
            name: i.name,
            fullPath: i.fullPath,
            url: await getDownloadURL(i),
          }))
        );
        setGallery(items.sort((a, b) => (a.name < b.name ? 1 : -1)));
        setErr(''); // Clear any previous errors
      })
      .catch((e: any) => {
        console.error('UploadImageReference: Error loading gallery:', e); // Log the full error object
        if (e?.code === 'storage/unauthorized') {
          setErr('Not authorized to read this folder. Ensure you are signed in and rules allow read.');
        } else {
          setErr(e?.message ?? 'Failed to load gallery.');
        }
      });
  }, [currentUser, assetCategory]);

  /* ---------- Accept string per category ---------- */
  const acceptForCategory =
    isImageCategory(assetCategory)
      ? 'image/png,image/jpeg'
      : isAudioCategory(assetCategory)
        ? 'audio/mpeg,audio/mp3'
        : isVideoCategory(assetCategory)
          ? 'video/mp4'
          : 'image/png,image/jpeg,audio/mpeg,audio/mp3,video/mp4'; // "others"

  /* ---------- Choose file ---------- */
  async function onChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const check = validate(f);
    if (!check.ok) { setErr(check.msg!); return; }
    setErr('');
    setSelectedFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setNameToSave(f.name.replace(/\.[^.]+$/, ''));
  }

  /* ---------- AI Describe (images only) ---------- */
  async function handleDescribe() {
    try {
      if (!isImageCategory(assetCategory)) return alert('AI Describe is available for images only.');
      if (!selectedFile) return alert('Upload an image first.');
      setIsDescribing(true);
      const dataUrl = await fileToDataUrl(selectedFile);
      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI describe failed');
      setSuggestedPrompt(json.description);
    } catch (e: any) {
      alert(e?.message || 'AI error');
    } finally {
      setIsDescribing(false);
    }
  }

  /* ---------- Save original upload ---------- */
  async function handleSaveOriginal() {
    try {
      if (!currentUser) return alert('Sign in first.');
      if (!selectedFile) return alert('No file selected');
      if (!nameToSave.trim()) return alert('Enter a name to save.');
      const check = validate(selectedFile);
      if (!check.ok) return alert(check.msg);

      // Extension by content type
      const ext =
        selectedFile.type === 'image/png'  ? 'png' :
        selectedFile.type === 'image/jpeg' ? 'jpg' :
        (selectedFile.type === 'audio/mpeg' || selectedFile.type === 'audio/mp3') ? 'mp3' :
        selectedFile.type === 'video/mp4'  ? 'mp4' : 'dat';

      const path = `users/${currentUser.uid}/assets/${assetCategory}/${nameToSave}.${ext}`;
      const o = ref(storage, path);

      // Upload as data_url for simplicity (works for img/audio/video)
      const dataUrl = await fileToDataUrl(selectedFile);
      await uploadString(o, dataUrl, 'data_url', {
        customMetadata: {
          displayName: nameToSave,
          category: assetCategory,
          source: 'uploaded',
          createdAt: String(Date.now()),
        },
      });

      const url = await getDownloadURL(o);
      const item: GalleryItem = { name: `${nameToSave}.${ext}`, url, fullPath: path, contentType: selectedFile.type };
      setGallery((g) => [item, ...g]);
      onSaved?.(item);
      alert('Saved to your gallery ✅');
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    }
  }

  /* ---------- Generate via prompt (images only) ---------- */
  async function handleGenerate() {
    try {
      if (!isImageCategory(assetCategory)) return alert('Generation is available for images only.');
      if (!mainPrompt.trim()) return alert(`Write a ${noun.toLowerCase()} description first.`);
      setIsGenerating(true);
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: mainPrompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      setGeneratedDataUrl(json.dataUrl); // should be PNG data URL
    } catch (e: any) {
      alert(e?.message || 'Generation error');
    } finally {
      setIsGenerating(false);
    }
  }

  /* ---------- Save generated (images only) ---------- */
  async function handleSaveGenerated() {
    try {
      if (!currentUser) return alert('Sign in first.');
      if (!generatedDataUrl) return;
      if (!nameToSave.trim()) return alert('Enter a name to save.');
      if (!isImageCategory(assetCategory)) return alert('Can only save generated images into image categories.');

      const path = `users/${currentUser.uid}/assets/${assetCategory}/${nameToSave}.png`;
      const o = ref(storage, path);
      await uploadString(o, generatedDataUrl, 'data_url', {
        customMetadata: {
          displayName: nameToSave,
          category: assetCategory,
          source: 'generated',
          createdAt: String(Date.now()),
        },
      });
      const url = await getDownloadURL(o);
      const item: GalleryItem = { name: `${nameToSave}.png`, url, fullPath: path, contentType: 'image/png' };
      setGallery((g) => [item, ...g]);
      onSaved?.(item);
      alert('Generated image saved ✅');
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    }
  }

  function handleRegenerate() {
    setGeneratedDataUrl('');
  }

  /* ---------- Delete ---------- */
  async function handleDelete(item: GalleryItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteObject(ref(storage, item.fullPath));
      setGallery((g) => g.filter((x) => x.fullPath !== item.fullPath));
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  }

  /* ---------- Render preview based on type ---------- */
  function PreviewBlock() {
    if (!previewUrl || !selectedFile) return null;
    if (selectedFile.type.startsWith('image/')) {
      return (
        <div className="mt-3">
          <Image
            src={previewUrl}
            alt="preview"
            width={240}
            height={240}
            className="mx-auto max-h-48 rounded-md border object-contain"
          />
        </div>
      );
    }
    if (selectedFile.type.startsWith('audio/')) {
      return (
        <div className="mt-3">
          <audio controls src={previewUrl} className="w-full" />
        </div>
      );
    }
    if (selectedFile.type.startsWith('video/')) {
      return (
        <div className="mt-3">
          <video controls src={previewUrl} className="w-full max-h-48 rounded-md border" />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      {/* LEFT: uploader + AI */}
      <div className="space-y-4">
        <label className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">
          {isImageCategory(assetCategory) ? 'Upload Image' : isAudioCategory(assetCategory) ? 'Upload Audio (MP3)' : isVideoCategory(assetCategory) ? 'Upload Video (MP4)' : 'Upload File'}
        </label>

        <div className="border-2 border-dashed border-[#B0C4DE] rounded-md p-4 text-center">
          <input
            ref={inputRef}
            type="file"
            accept={acceptForCategory}
            className="hidden"
            onChange={onChoose}
          />
          <button
            className="cursor-pointer text-[#E97451] font-semibold"
            onClick={() => inputRef.current?.click()}
          >
            Click to Upload {isImageCategory(assetCategory) ? 'Image' : isAudioCategory(assetCategory) ? 'MP3' : isVideoCategory(assetCategory) ? 'MP4' : 'File'}
          </button>
          <p className="text-sm text-[#3D4F60]/70 mt-1">or drag and drop</p>

          {selectedFile && (
            <div className="mt-3 text-sm">
              Selected: <span className="font-medium">{selectedFile.name}</span>
            </div>
          )}

          <PreviewBlock />
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        {/* Name + save original */}
        <div className="flex gap-2">
          <input
            className="flex-1 p-2 border-2 border-[#B0C4DE] rounded-md"
            placeholder="Name to save"
            value={nameToSave}
            onChange={(e) => setNameToSave(e.target.value)}
          />
          <button onClick={handleSaveOriginal} className="px-4 py-2 rounded-md bg-[#3D4F60] text-white">
            Save to My Gallery
          </button>
        </div>

        {/* AI tools only for image categories */}
        {isImageCategory(assetCategory) && (
          <>
            {/* Suggested prompt */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">Suggested Prompt Description (from AI)</h4>
                <button type="button" onClick={onOpenTemplate} title={`${noun} template`}>
                  <Info size={16} className="text-neutral-500" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDescribe}
                  disabled={!selectedFile || isDescribing}
                  className="px-3 py-2 rounded-md border bg-white hover:bg-neutral-50 disabled:opacity-50"
                >
                  {isDescribing ? 'Describing…' : 'AI Describe'}
                </button>
                <textarea
                  className="flex-1 min-h-[90px] border rounded-md p-2"
                  placeholder="AI will place the description here…"
                  value={suggestedPrompt}
                  onChange={(e) => setSuggestedPrompt(e.target.value)}
                />
              </div>
            </div>

            {/* Main Description used for generation */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{mainPromptLabel ?? `${noun} Description`}</h4>
                <Info size={16} className="text-neutral-500" />
              </div>
              <textarea
                className="w-full min-h-[120px] border rounded-md p-2"
                placeholder={`Describe the ${noun.toLowerCase()} you want the AI to generate…`}
                value={mainPrompt}
                onChange={(e) => setMainPrompt(e.target.value)}
              />
            </div>

            {/* Generate OR post-generate controls */}
            {!generatedDataUrl ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !mainPrompt.trim()}
                className="w-full py-3 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50"
              >
                {isGenerating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin inline-block h-5 w-5 rounded-full border-2 border-white border-t-transparent" />
                    Generating…
                  </span>
                ) : (
                  generateCta
                )}
              </button>
            ) : (
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  className="flex-1 border rounded-md px-3 py-2"
                  placeholder="Name to save"
                  value={nameToSave}
                  onChange={(e) => setNameToSave(e.target.value)}
                />
                <button className="px-4 py-2 rounded-md bg-[#3D4F60] text-white" onClick={handleSaveGenerated}>
                  Save to My Gallery
                </button>
                <button className="px-4 py-2 rounded-md border" onClick={handleRegenerate}>
                  Regenerate
                </button>
              </div>
            )}

            {/* Generated image preview */}
            {generatedDataUrl && (
              <div className="mt-3 border rounded-xl p-3">
                <p className="text-sm mb-2">Generated Image</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={generatedDataUrl} alt="generated" className="max-w-full rounded-md" />
              </div>
            )}
          </>
        )}
      </div>

      {/* RIGHT: gallery with delete & lightweight type hints */}
      <div className="border rounded-xl p-3">
        <h4 className="font-semibold mb-3">My Gallery</h4>
        {gallery.length === 0 ? (
          <p className="text-sm text-neutral-500">No files yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.map((it) => {
              const ext = it.name.split('.').pop()?.toLowerCase();
              const isImg = ext && ['png','jpg','jpeg','gif','webp'].includes(ext);
              const isAud = ext === 'mp3';
              const isVid = ext === 'mp4';
              return (
                <div key={it.fullPath} className="relative group border rounded-md overflow-hidden p-1">
                  {isImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.url} alt={it.name} className="w-full h-32 object-cover rounded" />
                  ) : isAud ? (
                    <div className="flex flex-col items-center justify-center h-32 bg-neutral-100 rounded">
                      <Music className="mb-2" />
                      <audio controls src={it.url} className="w-full" />
                    </div>
                  ) : isVid ? (
                    <div className="flex flex-col items-center justify-center bg-black rounded">
                      <video controls src={it.url} className="w-full h-32 object-cover rounded" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 bg-neutral-100 rounded">
                      <ImageIcon />
                    </div>
                  )}

                  <button
                    title="Delete"
                    onClick={() => handleDelete(it)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/90 rounded-full p-1 shadow"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                  <div className="px-2 py-1 text-xs truncate">{it.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
