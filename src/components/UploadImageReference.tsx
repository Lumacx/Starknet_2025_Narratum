'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Info, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { storage } from '@/lib/firebase'; // requires storage export
import { useAuth } from '@/context/AuthContext';
import {
  ref,
  uploadString,
  getDownloadURL,
  listAll,
  deleteObject,
} from 'firebase/storage';

// Put this near the top, above Props:
type GalleryItem = { name: string; url: string; fullPath: string };

/** Props let us reuse this for Character and Location tabs and Cover */
type AssetCategory =
  | 'covers' | 'avatars' | 'characters' | 'locations' | 'backgrounds'
  | 'audioNarrations' | 'audioEffects' | 'videos' | 'others';

type Props = {
  variant: 'character' | 'location' | 'cover';
  nounOverride?: string;
  onOpenTemplate?: () => void;
  onSaved?: (item: GalleryItem) => void;
  mainPromptLabel?: string;
  assetCategory: AssetCategory;                 // ⬅️ NEW
};

/* ---------- file-size limits (as requested) ---------- */
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

export default function UploadImageReference({
  variant, nounOverride, onOpenTemplate, onSaved, mainPromptLabel, assetCategory
  }: Props) {
  const { user: currentUser } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const noun = variant === 'character' ? 'Character' : 'Location';
  const generateCta =
    variant === 'character' ? 'Generate Character Image (AI)' : 'Generate Location Image (AI)';

  // Upload/AI state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [nameToSave, setNameToSave] = useState('');
  const [suggestedPrompt, setSuggestedPrompt] = useState('');
  const [mainPrompt, setMainPrompt] = useState('');           // used for generation
  const [isDescribing, setIsDescribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDataUrl, setGeneratedDataUrl] = useState('');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [err, setErr] = useState('');

  // load gallery for user (scoped to a single category)
useEffect(() => {
  if (!currentUser) return;
  const base = ref(storage, `users/${currentUser.uid}/assets/${assetCategory}`);
  listAll(base)
    .then(async (res) => {
      const items = await Promise.all(
        res.items.map(async (i) => ({
          name: i.name,
          fullPath: i.fullPath,
          url: await getDownloadURL(i),
        }))
      );
      // newest-ish first by filename
      setGallery(items.sort((a, b) => (a.name < b.name ? 1 : -1)));
    })
    .catch(() => {});
}, [currentUser, assetCategory]);


  // choose file
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

  // 1) AI Describe
  async function handleDescribe() {
    try {
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

  // Save original uploaded file
  async function handleSaveOriginal() {
    try {
      if (!currentUser) return alert('Sign in first.');
      if (!selectedFile) return alert('No file selected');
      if (!nameToSave.trim()) return alert('Enter a name to save.');

      const dataUrl = await fileToDataUrl(selectedFile);
      const ext = selectedFile.type === 'image/png' ? 'png'
                : selectedFile.type === 'audio/mpeg' ? 'mp3'
                : selectedFile.type === 'video/mp4' ? 'mp4' : 'dat';
      const path = `users/${currentUser.uid}/assets/${assetCategory}/${nameToSave}.${ext}`;
      const o = ref(storage, path);
      await uploadString(o, dataUrl, 'data_url', {
        customMetadata: { displayName: nameToSave, category: assetCategory, source: 'uploaded', createdAt: String(Date.now()) }
      });
      const url = await getDownloadURL(o);


      // ⬇️ replace the two lines that push directly into state with this:
      const item: GalleryItem = { name: `${nameToSave}.${ext}`, url, fullPath: path };
        setGallery((g) => [item, ...g]);
        onSaved?.(item);

      alert('Saved to your gallery ✅');
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    }
  }

  // 2) Generate image using the Main Description text
  async function handleGenerate() {
    try {
      if (!mainPrompt.trim()) return alert(`Write a ${noun.toLowerCase()} description first.`);
      setIsGenerating(true);
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: mainPrompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      setGeneratedDataUrl(json.dataUrl);
    } catch (e: any) {
      alert(e?.message || 'Generation error');
    } finally {
      setIsGenerating(false);
    }
  }

  // Save generated
  async function handleSaveGenerated() {
    try {
      if (!currentUser) return alert('Sign in first.');
      if (!generatedDataUrl) return;
      if (!nameToSave.trim()) return alert('Enter a name to save.');
      const path = `users/${currentUser.uid}/assets/${assetCategory}/${nameToSave}.png`;
      const o = ref(storage, path);
      await uploadString(o, generatedDataUrl, 'data_url', {
      customMetadata: { displayName: nameToSave, category: assetCategory, source: 'generated', createdAt: String(Date.now()) }
      });
      const url = await getDownloadURL(o);

      // ⬇️ same pattern here:
        const item: GalleryItem = { name: `${nameToSave}.png`, url, fullPath: path };
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

  // delete
  async function handleDelete(item: GalleryItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteObject(ref(storage, item.fullPath));
      setGallery((g) => g.filter((x) => x.fullPath !== item.fullPath));
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      {/* LEFT: uploader + AI */}
      <div className="space-y-4">
        <label className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">
          Upload Image Reference
        </label>

        <div className="border-2 border-dashed border-[#B0C4DE] rounded-md p-4 text-center">
          <input
            ref={inputRef}
            type="file"
            accept="image/png"
            className="hidden"
            onChange={onChoose}
          />
          <button className="cursor-pointer text-[#E97451] font-semibold" onClick={() => inputRef.current?.click()}>
            Click to Upload Image
          </button>
          <p className="text-sm text-[#3D4F60]/70 mt-1">or drag and drop</p>

          {previewUrl && (
            <div className="mt-3">
              <Image
                src={previewUrl}
                alt="preview"
                width={240}
                height={240}
                className="mx-auto max-h-48 rounded-md border object-contain"
              />
            </div>
          )}

          {selectedFile && (
            <div className="mt-3 text-sm">
              Selected: <span className="font-medium">{selectedFile.name}</span>
            </div>
          )}
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

        {/* Suggested prompt with AI Describe */}
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

        {/* Main Description used for generation (moved below suggested) */}
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

        {/* Generated image preview (hidden if none) */}
        {generatedDataUrl && (
          <div className="mt-3 border rounded-xl p-3">
            <p className="text-sm mb-2">Generated Image</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedDataUrl} alt="generated" className="max-w-full rounded-md" />
          </div>
        )}
      </div>

      {/* RIGHT: gallery with delete */}
      <div className="border rounded-xl p-3">
        <h4 className="font-semibold mb-3">My Gallery</h4>
        {gallery.length === 0 ? (
          <p className="text-sm text-neutral-500">No images yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.map((it: GalleryItem) => (   // 👈 add : GalleryItem
              <div key={it.fullPath} className="relative group border rounded-md overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt={it.name} className="w-full h-32 object-cover" />
                <button
                  title="Delete"
                  onClick={() => handleDelete(it)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/90 rounded-full p-1 shadow"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
                <div className="px-2 py-1 text-xs truncate">{it.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
