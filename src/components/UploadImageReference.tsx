'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Copy, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  ref as sref,
  uploadString,
  getDownloadURL,
  listAll,
  deleteObject,
} from 'firebase/storage';
import { doc as fsDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import InfoPopover from '@/components/InfoPopover';

/* ---------- Types ---------- */
type LangCode =
  | 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh' | 'hi' | 'ar';

type GalleryItem = { name: string; url: string; fullPath: string; contentType?: string };
type AssetCategory =
  | 'covers'
  | 'avatars'
  | 'characters'
  | 'locations'
  | 'backgrounds'
  | 'audioNarrations'
  | 'audioEffects'
  | 'videos'
  | 'generatedImages'
  | 'others';

type Mode = 'full' | 'uploaderOnly' | 'galleryOnly';

type Props = {
  variant: 'character' | 'location' | 'cover';
  onSaved?: (item: GalleryItem) => void;
  assetCategory: AssetCategory;
  mode?: Mode;
  onGenerateRequest?: (prompt: string) => void;
  isGenerating?: boolean;
  generatedImageUrl?: string;
  selection?: string[];
  onSelectionChange?: (newSelection: string[]) => void;
  maxSelection?: number;
  nounOverride?: string;
  onOpenTemplate?: () => void;
  mainPromptLabel?: string;
  accept?: string;
  showInnerDescribe?: boolean;
  preferredLanguage?: LangCode;
  storyId?: string; // story-scoped when defined; otherwise uncategorized
  disableSaveButtons?: boolean;
};

/* ---------- Helpers ---------- */
const isImageCategory = (c: AssetCategory) =>
  ['covers', 'avatars', 'characters', 'locations', 'backgrounds', 'generatedImages'].includes(c);

const KB = 1024;
const MB = 1024 * KB;

// Align limits with Storage rules (images 10KB–12MB, MP3/WAV ≤16MB, MP4 1–64MB)
const LIMITS: Record<string, { min: number; max: number }> = {
  'image/png':  { min: 10 * KB, max: 12 * MB },
  'image/jpeg': { min: 10 * KB, max: 12 * MB },
  'image/jpg':  { min: 10 * KB, max: 12 * MB },
  'image/gif':  { min: 10 * KB, max: 12 * MB },
  'image/webp': { min: 10 * KB, max: 12 * MB },
  'audio/mpeg': { min: 50 * KB, max: 16 * MB },
  'audio/mp3':  { min: 50 * KB, max: 16 * MB },
  'audio/wav':  { min: 50 * KB, max: 16 * MB },
  'video/mp4':  { min: 1 * MB,  max: 64 * MB },
};
const fmt = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / KB)} KB`);

function validate(file: File) {
  const l = LIMITS[file.type];
  if (!l) return { ok: false, msg: `Unsupported type: ${file.type}. Use PNG/JPG/GIF/WebP/MP3/WAV/MP4.` };
  if (file.size < l.min) return { ok: false, msg: `File too small. Min ${fmt(l.min)}.` };
  if (file.size > l.max) return { ok: false, msg: `File too large. Max ${fmt(l.max)}.` };
  return { ok: true as const };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function sanitizeId(name: string) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 120) || 'asset';
}

function extFromMime(mime: string) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'audio/mpeg') return 'mp3';
  const parts = mime.split('/');
  return parts[1] || 'bin';
}

// Firestore index path
function buildIndexTarget(params: { uid: string; storyId?: string; category: string; docId: string }) {
  const base = params.storyId
    ? `users/${params.uid}/assetIndex/stories/${params.storyId}/${params.category}`
    : `users/${params.uid}/assetIndex/uncategorized/${params.category}`;
  return { path: `${base}/${params.docId}` };
}

/* ---------- Component ---------- */
export default function UploadImageReference({
  variant,
  nounOverride,
  onSaved,
  mainPromptLabel,
  assetCategory,
  accept: propAccept,
  mode = 'full',
  showInnerDescribe = true,
  onGenerateRequest,
  isGenerating,
  generatedImageUrl,
  selection = [],
  onSelectionChange,
  maxSelection = 1,
  storyId,
  disableSaveButtons,
}: Props) {
  const { user: currentUser } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // keep latest storyId available to async callbacks
  const storyIdRef = useRef<string | undefined>(storyId);
  useEffect(() => { storyIdRef.current = storyId; }, [storyId]);

  // build storage path (no leading or trailing slash)
  const pathFor = useCallback((uid: string, sid: string | undefined, category: string, name?: string) => {
    const base = sid
      ? `users/${uid}/assetIndex/stories/${sid}/${category}`
      : `users/${uid}/assetIndex/uncategorized/${category}`;
    return name ? `${base}/${name}` : base;
  }, []);

  const noun =
    nounOverride ?? (variant === 'character' ? 'Character' : variant === 'location' ? 'Location' : 'Cover');
  const generateCta = `Generate ${noun} Image (AI)`;

  const tipDocForOne =
    assetCategory === 'locations'
      ? '/info_tips/location-generation-template.md'
      : assetCategory === 'characters'
      ? '/info_tips/character-creation-template.md'
      : null;
  const tipDocForTwo = '/info_tips/master_prompt_guidance.PNG';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [nameToSave, setNameToSave] = useState('');
  const [suggestedPrompt, setSuggestedPrompt] = useState('');
  const [mainPrompt, setMainPrompt] = useState('');
  const [isDescribing, setIsDescribing] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [err, setErr] = useState('');
  const [localGeneratedUrl, setLocalGeneratedUrl] = useState('');

  const accept = useMemo(() => {
    if (isImageCategory(assetCategory)) {
      return 'image/png, image/jpeg, image/jpg, image/gif, image/webp';
    }
    return propAccept;
  }, [assetCategory, propAccept]);

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent<{ text?: string }>;
        const txt = ce?.detail?.text ?? '';
        if (txt) setMainPrompt(txt);
      } catch {}
    };
    window.addEventListener('set-uploader-prompt', handler as EventListener);
    return () => window.removeEventListener('set-uploader-prompt', handler as EventListener);
  }, []);

  useEffect(() => {
    setLocalGeneratedUrl(generatedImageUrl || '');
    if (generatedImageUrl && !nameToSave.trim()) {
      setNameToSave(`${noun.toLowerCase().replace(' ', '-')}-${Math.floor(Date.now() / 1000)}`);
    }
  }, [generatedImageUrl, noun, nameToSave]);

  useEffect(() => {
    return () => { if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const loadGallery = useCallback(async () => {
    if (!currentUser) {
      setGallery([]);
      return;
    }
    const sid = storyIdRef.current;

    try {
      const base = sref(storage, pathFor(currentUser.uid, sid, assetCategory));
      const res = await listAll(base);
      const items = await Promise.all(
        res.items.map(async (i) => ({
          name: i.name,
          fullPath: i.fullPath,
          url: await getDownloadURL(i),
        }))
      );
      setGallery(items.sort((a, b) => (a.name < b.name ? 1 : -1)));
      setErr('');
    } catch (e: any) {
      console.error(`Failed to load gallery for ${sid ? `story ${sid}` : 'uncategorized'}:`, e);
      const msg = String(e?.message || e);
      if (msg.includes('storage/unauthorized')) {
        setErr('Permission error listing your gallery. Check Storage rules: allow list on users/{uid}/assetIndex/(stories|uncategorized)/{category}.');
      } else {
        setErr(`Failed to load gallery: ${msg}`);
      }
      setGallery([]);
    }
  }, [assetCategory, currentUser, pathFor]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  async function onChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const check = validate(f);
    if (!check.ok) {
      setErr(check.msg!);
      return;
    }
    setErr('');
    setSelectedFile(f);
    const objectUrl = URL.createObjectURL(f);
    setPreviewUrl(objectUrl);
    setNameToSave(f.name.replace(/\.[^.]+$/, ''));
    onSaved?.({ name: f.name, url: objectUrl, fullPath: 'local://selected', contentType: f.type });
  }

  async function handleDescribe() {
    if (!selectedFile) return;
    setIsDescribing(true);
    try {
      setSuggestedPrompt('(Use “Describe Selected” above to analyze the current image).');
    } finally {
      setIsDescribing(false);
    }
  }

  async function handleSaveOriginal() {
    if (!currentUser || !selectedFile || !nameToSave.trim()) return;

    try {
      const ext = extFromMime(selectedFile.type);
      const cleanName = sanitizeId(nameToSave);
      const filename = `${cleanName}.${ext}`;
      const sid = storyIdRef.current;
      const path = pathFor(currentUser.uid, sid, assetCategory, filename);

      const storageRef = sref(storage, path);
      const dataUrl = await fileToDataUrl(selectedFile);

      const meta: Record<string, string> = {
        displayName: cleanName,
        category: assetCategory,
        source: 'uploaded',
        createdAt: String(Date.now()),
        'narratum:role': variant,
      };
      if (sid) meta['narratum:storyId'] = sid;

      await uploadString(storageRef, dataUrl, 'data_url', { customMetadata: meta });
      const downloadUrl = await getDownloadURL(storageRef);
      const item = { name: filename, url: downloadUrl, fullPath: path, contentType: selectedFile.type };
      setGallery((g) => [item, ...g]);
      onSaved?.(item);

      // Firestore index doc
      try {
        const { path: docPath } = buildIndexTarget({
          uid: currentUser.uid,
          storyId: sid,
          category: assetCategory,
          docId: cleanName,
        });
        await setDoc(
          fsDoc(db, docPath),
          {
            url: downloadUrl,
            name: cleanName,
            fileName: filename,
            contentType: selectedFile.type || 'application/octet-stream',
            createdAt: serverTimestamp(),
            source: 'uploaded',
            storyId: sid ?? null,
            role: variant,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Failed to write index doc for original upload:', err);
      }

      alert('Saved to gallery!');
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('storage/unauthorized')) {
        alert('Upload blocked by Storage rules. Confirm allow list for users/{uid}/assetIndex/... and that UID matches request.auth.uid.');
      } else {
        alert(e?.message || 'Save failed');
      }
    }
  }

  function handleGenerate() {
    onGenerateRequest?.(mainPrompt);
  }

  async function handleSaveGenerated() {
    if (!currentUser || !localGeneratedUrl || !nameToSave.trim()) return;

    try {
      const cleanName = sanitizeId(nameToSave);
      const filename = `${cleanName}.png`;
      const sid = storyIdRef.current;
      const path = pathFor(currentUser.uid, sid, assetCategory, filename);

      const storageRef = sref(storage, path);

      const meta: Record<string, string> = {
        displayName: cleanName,
        category: assetCategory,
        source: 'ai-generated',
        createdAt: String(Date.now()),
        'narratum:role': variant,
      };
      if (sid) meta['narratum:storyId'] = sid;

      await uploadString(storageRef, localGeneratedUrl, 'data_url', { customMetadata: meta });

      const downloadUrl = await getDownloadURL(storageRef);
      const item = { name: filename, url: downloadUrl, fullPath: path, contentType: 'image/png' };
      setGallery((g) => [item, ...g]);
      onSaved?.(item);

      // Firestore index doc
      try {
        const { path: docPath } = buildIndexTarget({
          uid: currentUser.uid,
          storyId: sid,
          category: assetCategory,
          docId: cleanName,
        });
        await setDoc(
          fsDoc(db, docPath),
          {
            url: downloadUrl,
            name: cleanName,
            fileName: filename,
            contentType: 'image/png',
            createdAt: serverTimestamp(),
            source: 'ai-generated',
            storyId: sid ?? null,
            role: variant,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Failed to write index doc for generated upload:', err);
      }

      alert('Generated image saved!');
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('storage/unauthorized')) {
        alert('Save blocked by Storage rules. Verify allow list and path for assetIndex.');
      } else {
        alert(e?.message || 'Save failed');
      }
    }
  }

  function handleRegenerate() {
    setLocalGeneratedUrl('');
  }

  async function handleDelete(item: GalleryItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteObject(sref(storage, item.fullPath));
      setGallery((g) => g.filter((x) => x.fullPath !== item.fullPath));
      // (Optional) also delete Firestore index doc
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  }

  const handleGalleryItemClick = (item: GalleryItem) => {
    if (onSelectionChange) {
      const isSelected = selection.includes(item.url);
      let newSelection: string[];
      if (isSelected) {
        newSelection = selection.filter((url) => url !== item.url);
      } else {
        if (selection.length >= maxSelection) {
          alert(`You can only select up to ${maxSelection} items.`);
          return;
        }
        newSelection = [...selection, item.url];
      }
      onSelectionChange(newSelection);
    } else {
      onSaved?.(item);
    }
  };

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
            unoptimized
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

  function UploaderUI() {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">
          {isImageCategory(assetCategory) ? 'Upload Image' : 'Upload File'}
        </label>
        <div className="border-2 border-dashed border-[#B0C4DE] rounded-md p-4 text-center">
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChoose} />
          <button className="cursor-pointer text-[#E97451] font-semibold" onClick={() => inputRef.current?.click()}>
            Click to Upload Image
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
        {selectedFile && (
          <div className="flex gap-2">
            <input
              className="flex-1 p-2 border-2 border-[#B0C4DE] rounded-md"
              placeholder="Name to save"
              value={nameToSave}
              onChange={(e) => setNameToSave(e.target.value)}
              disabled={disableSaveButtons}
            />
            <button
              onClick={handleSaveOriginal}
              className="px-4 py-2 rounded-md bg-[#3D4F60] text-white disabled:opacity-50"
              disabled={disableSaveButtons}
            >
              Save to My Gallery
            </button>
          </div>
        )}

        {/* ---------- IMAGE-SPECIFIC SECTION ---------- */}
        {isImageCategory(assetCategory) && (
          <>
            <div className="border-t my-4" />

            {showInnerDescribe && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">Suggested Prompt Description (from AI)</h4>

                  {tipDocForOne && (
                    <InfoPopover
                      title={assetCategory === 'locations' ? 'Location Template' : 'Character Template'}
                      docHref={tipDocForOne}
                      onUsePrompt={(text) => setMainPrompt(text)}
                    />
                  )}

                  {!!suggestedPrompt && (
                    <button
                      type="button"
                      title="Copy"
                      className="ml-auto inline-flex items-center gap-1"
                      onClick={() => navigator.clipboard.writeText(suggestedPrompt)}
                    >
                      <Copy size={14} /> Copy
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDescribe}
                    disabled={!selectedFile || isDescribing}
                    className="px-3 py-2 rounded-md border bg-white disabled:opacity-50"
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
            )}

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{mainPromptLabel ?? `${noun} Description`}</h4>
                <InfoPopover
                  title="Pro Tips for Prompting"
                  docHref={tipDocForTwo}
                  onUsePrompt={(text) => setMainPrompt(text)}
                />
              </div>

              <textarea
                className="w-full min-h-[120px] border rounded-md p-2"
                placeholder={`Describe the ${noun.toLowerCase()} you want the AI to generate…`}
                value={mainPrompt}
                onChange={(e) => setMainPrompt(e.target.value)}
                disabled={disableSaveButtons}
              />
            </div>

            {!localGeneratedUrl ? (
              <button
                onClick={() => onGenerateRequest?.(mainPrompt)}
                disabled={isGenerating || !mainPrompt.trim() || disableSaveButtons}
                className="w-full py-3 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 transition"
              >
                {isGenerating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin inline-block h-5 w-5 rounded-full border-2" />
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
                  disabled={disableSaveButtons}
                />
                <button
                  className="px-4 py-2 rounded-md bg-[#3D4F60] text-white disabled:opacity-50"
                  onClick={handleSaveGenerated}
                  disabled={disableSaveButtons}
                >
                  Save to My Gallery
                </button>
                <button className="px-4 py-2 rounded-md border" onClick={handleRegenerate}>
                  Regenerate
                </button>
              </div>
            )}

            {localGeneratedUrl && (
              <div className="mt-3 border rounded-xl p-3">
                <p className="text-sm mb-2">Generated Image</p>
                <Image
                  src={localGeneratedUrl}
                  alt="generated"
                  width={512}
                  height={512}
                  className="max-w-full rounded-md"
                  unoptimized
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function GalleryUI() {
    const galleryMessage = storyIdRef.current
      ? (gallery.length === 0 ? 'No files yet for this story. Upload or generate one!' : null)
      : (gallery.length === 0 ? 'No uncategorized files found. Upload or generate one with no story selected!' : null);

    return (
      <div>
        {galleryMessage ? (
          <p className="text-sm text-neutral-500">{galleryMessage}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.map((it) => {
              const isSelected = selection.includes(it.url);
              const isSelectionMode = !!onSelectionChange;

              return (
                <div
                  key={it.fullPath}
                  className="relative group border rounded-md overflow-hidden p-1 cursor-pointer transition-all duration-200"
                  onClick={() => handleGalleryItemClick(it)}
                  style={{
                    borderColor: isSelected ? '#3b82f6' : 'transparent',
                    borderWidth: isSelected ? '3px' : '1px',
                    opacity: isSelectionMode && selection.length > 0 && !isSelected ? 0.6 : 1,
                  }}
                >
                  <Image
                    src={it.url}
                    alt={it.name}
                    width={150}
                    height={150}
                    className="w-full h-32 object-cover rounded"
                    unoptimized
                  />
                  <button
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(it);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/90 rounded-full p-1 shadow"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                  {isSelected && (
                    <div className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-0.5 shadow">
                      <CheckCircle2 size={20} />
                    </div>
                  )}
                  <div className="px-2 py-1 text-xs truncate">{it.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (mode === 'uploaderOnly') {
    return <div className="p-4 bg-white border rounded-xl">{UploaderUI()}</div>;
  }
  if (mode === 'galleryOnly') {
    return <div>{GalleryUI()}</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <UploaderUI />
      <GalleryUI />
    </div>
  );
}
