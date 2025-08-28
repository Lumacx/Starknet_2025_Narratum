'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ImageIcon, Music, Upload, Wand2, Loader2, Check, Info } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import {
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  doc as fsDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type AssetCategory =
  | 'characters'
  | 'locations'
  | 'backgrounds'
  | 'covers'
  | 'audioNarrations'
  | 'audioEffects'
  | 'videos';

type AssetDoc = {
  id: string;
  name: string;
  url: string;
  contentType: string;
  category: AssetCategory;
  createdAt?: any;
  meta?: Record<string, any>;
};

type SceneData = {
  index: number;
  text: string;
  image?: {
    url: string;
    name?: string;
    assetId?: string;
  };
  audio?: {
    url: string;
    name?: string;
    assetId?: string;
  };
};

/* ------------------------------------------------------------------ */
/* Defaults & helpers                                                  */
/* ------------------------------------------------------------------ */
const DRAFT_KEY = 'newStoryDraft'; // shared with Begin
const DEFAULTS = {
  avatarUrl: '/avatars/Default.png',
  backgroundUrl: '/story_reader_backgrounds/dream-background.png',
};

function inferKind(url?: string, contentType?: string): 'image' | 'audio' | 'video' | 'unknown' {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.startsWith('video/')) return 'video';
  const u = url || '';
  try {
    const pathname = new URL(u).pathname.toLowerCase();
    if (/\.(png|jpe?g|gif|webp)$/.test(pathname)) return 'image';
    if (/\.(mp3|wav|m4a)$/.test(pathname)) return 'audio';
    if (/\.(mp4|webm)$/.test(pathname)) return 'video';
  } catch {}
  return 'unknown';
}

/* Wire your own AI routes here */
async function generateImage(prompt: string): Promise<{ url: string; name: string }> {
  // TODO: replace with your server route (e.g. /api/images/generate)
  await new Promise(r => setTimeout(r, 900));
  return { url: '/story_reader_backgrounds/dream-background.png', name: 'ai-image.png' };
}
async function describeImage(imageUrl: string): Promise<string> {
  // TODO: replace with /api/describe-image
  await new Promise(r => setTimeout(r, 600));
  return 'A dreamy nebula backdrop with soft purple clouds and tiny stars.';
}
async function generateNarration(text: string): Promise<{ url: string; name: string }> {
  // TODO: replace with /api/audio/narrate
  await new Promise(r => setTimeout(r, 1200));
  return { url: '/samples/sample-narration.mp3', name: 'ai-narration.mp3' };
}

/* ------------------------------------------------------------------ */
/* Reusable Asset Picker                                               */
/* ------------------------------------------------------------------ */
type AssetPickerProps = {
  kind: 'image' | 'audio';
  categoryForGallery: AssetCategory;
  promptLabel?: string;
  initialPrompt?: string;
  onPicked: (asset: { url: string; name?: string; assetId?: string }) => void;
  onDescribeImage?: (desc: string) => void;
};
function AssetPicker({
  kind,
  categoryForGallery,
  promptLabel = kind === 'image' ? 'Image Prompt' : 'Narration Text',
  initialPrompt = '',
  onPicked,
  onDescribeImage,
}: AssetPickerProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'gallery' | 'ai' | 'upload'>('gallery');
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState<AssetDoc[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [file, setFile] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isImage = kind === 'image';

  useEffect(() => {
    if (!user) return;
    (async () => {
      const q = query(
        collection(db, 'users', user.uid, 'assets'),
        where('category', '==', categoryForGallery),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const items: AssetDoc[] = [];
      snap.forEach(d => items.push({ id: d.id, ...(d.data() as any) }));
      setGallery(items);
    })().catch(console.error);
  }, [user, categoryForGallery]);

  async function handleAI() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      if (isImage) {
        const { url, name } = await generateImage(prompt);
        onPicked({ url, name });
      } else {
        const { url, name } = await generateNarration(prompt);
        onPicked({ url, name });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDescribe(selected?: AssetDoc) {
    if (!isImage || !onDescribeImage) return;
    const asset = selected ?? gallery.find(g => g.id === selectedId);
    if (!asset) return;
    setLoading(true);
    try {
      const desc = await describeImage(asset.url);
      onDescribeImage(desc);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!user || !file) return;
    setLoading(true);
    try {
      const path = `users/${user.uid}/assets/${categoryForGallery}/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);

      const docRef = await addDoc(collection(db, 'users', user.uid, 'assets'), {
        name: file.name,
        url,
        contentType: file.type,
        category: categoryForGallery,
        createdAt: serverTimestamp(),
      });

      onPicked({ url, name: file.name, assetId: docRef.id });

      setGallery(prev => [{ id: docRef.id, name: file.name, url, contentType: file.type, category: categoryForGallery }, ...prev]);
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-blue-300/40 bg-white/70 dark:bg-zinc-900/70 dark:border-blue-700/40 shadow-sm">
      {/* Tabs */}
      <div className="flex items-center gap-2 p-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        {[
          { key: 'gallery', label: 'My Gallery' },
          { key: 'ai', label: isImage ? 'AI Generate' : 'AI Narrate' },
          { key: 'upload', label: 'New Upload' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${tab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 asset-scope">
        {tab === 'gallery' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {gallery.length === 0 && (
              <div className="col-span-full text-sm text-zinc-500 flex items-center gap-2">
                <Info className="w-4 h-4" /> No saved assets yet in <span className="font-semibold">{categoryForGallery}</span>.
              </div>
            )}
            {gallery.map(g => (
              <button
                key={g.id}
                onClick={() => { setSelectedId(g.id); onPicked({ url: g.url, name: g.name, assetId: g.id }); }}
                className={`group relative rounded-xl overflow-hidden border transition
                  ${selectedId === g.id ? 'border-blue-600 ring-2 ring-blue-400' : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700'}`}
                title={g.name}
              >
                {isImage ? (
                  <Image src={g.url} alt={g.name} width={300} height={200} className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 w-full grid place-items-center bg-zinc-100 dark:bg-zinc-800">
                    <Music className="w-8 h-8" />
                    <div className="text-xs mt-1 px-2 text-center line-clamp-2">{g.name}</div>
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded hidden group-hover:block">
                  Select
                </div>
              </button>
            ))}
            {isImage && gallery.length > 0 && (
              <div className="col-span-full">
                <button
                  onClick={() => handleDescribe()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  AI Describe selected
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{promptLabel}</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={isImage ? 3 : 4}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
              placeholder={isImage ? 'A misty forest with ethereal lights…' : 'Type the narration text you want to generate…'}
            />
            <button
              onClick={handleAI}
              disabled={loading || !prompt.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isImage ? 'Generate Image' : 'Generate Narration'}
            </button>
          </div>
        )}

        {tab === 'upload' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Select a {isImage ? 'PNG/JPG' : 'MP3/WAV'} file</label>
            <input
              type="file"
              accept={isImage ? 'image/png,image/jpeg,image/webp' : 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav'}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload & Save to Gallery
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function ScenesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = searchParams.get('storyId'); // Begin pushes ?storyId=...

  // Reader UI (avatar/background) + page count
  const [readerUI, setReaderUI] = useState({
    avatarUrl: DEFAULTS.avatarUrl,
    backgroundUrl: DEFAULTS.backgroundUrl,
  });
  const [pageCount, setPageCount] = useState<number>(3);

  // Scene (one-at-a-time editing)
  const [scene, setScene] = useState<SceneData>({
    index: 1,
    text: '',
  });
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageDesc, setImageDesc] = useState(''); // AI Describe result

  // Hydrate from Firestore or localStorage or defaults
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      // 1) Firestore by storyId
      if (user && storyId) {
        const ref = fsDoc(db, 'stories', storyId);
        const snap = await getDoc(ref);
        if (!cancelled && snap.exists()) {
          const data = snap.data() as any;

          setReaderUI({
            avatarUrl: data?.reader?.avatarUrl || DEFAULTS.avatarUrl,
            backgroundUrl: data?.reader?.backgroundUrl || DEFAULTS.backgroundUrl,
          });

          const scenes = data?.scenes || [];
          if (Array.isArray(scenes) && scenes.length) {
            setPageCount(scenes.length);
            const s1 = scenes[0];
            setScene({
              index: 1,
              text: s1?.text || '',
              image: s1?.imageUrl ? { url: s1.imageUrl, name: s1.imageName || '' } : undefined,
              audio: s1?.audioUrl ? { url: s1.audioUrl, name: s1.audioName || '' } : undefined,
            });
            setImagePrompt(s1?.imagePrompt || '');
            setImageDesc(s1?.imageDescription || '');
            return;
          }
        }
      }

      // 2) LocalStorage
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft?.reader) {
              setReaderUI({
                avatarUrl: draft.reader.avatarUrl || DEFAULTS.avatarUrl,
                backgroundUrl: draft.reader.backgroundUrl || DEFAULTS.backgroundUrl,
              });
            }
            const scenes = draft?.scenes || draft?.pages || [];
            if (scenes?.length) {
              setPageCount(scenes.length);
              const s1 = scenes[0];
              setScene({
                index: 1,
                text: s1?.text || '',
                image: s1?.imageUrl ? { url: s1.imageUrl, name: s1.imageName || '' } : undefined,
                audio: s1?.audioUrl ? { url: s1.audioUrl, name: s1.audioName || '' } : undefined,
              });
              setImagePrompt(s1?.imagePrompt || '');
              setImageDesc(s1?.imageDescription || '');
              return;
            }
          }
        } catch {}
      }

      // 3) Defaults
      setReaderUI({
        avatarUrl: DEFAULTS.avatarUrl,
        backgroundUrl: DEFAULTS.backgroundUrl,
      });
      setScene(s => ({ ...s, index: 1, text: s.text || '' }));
    }
    hydrate();
    return () => { cancelled = true; };
  }, [user, storyId]);

  const canSave = !!user && (scene.text.trim().length > 0 || scene.image?.url || scene.audio?.url);

  function applyImage(asset: { url: string; name?: string; assetId?: string }) {
    setScene(s => ({ ...s, image: { url: asset.url, name: asset.name, assetId: asset.assetId } }));
  }
  function applyAudio(asset: { url: string; name?: string; assetId?: string }) {
    setScene(s => ({ ...s, audio: { url: asset.url, name: asset.name, assetId: asset.assetId } }));
  }

  async function handleSave() {
    if (!user) return;

    // Persist per-scene (draftScenes) and optionally merge into story doc if storyId exists
    const scenesCol = collection(db, 'users', user.uid, 'draftScenes');
    const docRef = fsDoc(scenesCol, `scene-${scene.index || 1}`);
    await setDoc(docRef, {
      ...scene,
      imagePrompt,
      imageDescription: imageDesc || null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });

    if (storyId) {
      const storyRef = fsDoc(db, 'stories', storyId);
      const storySnap = await getDoc(storyRef);
      const existing = (storySnap.exists() && (storySnap.data() as any)?.scenes) || [];
      const idx = (scene.index || 1) - 1;
      const nextScenes = [...existing];
      nextScenes[idx] = {
        text: scene.text || '',
        imageUrl: scene.image?.url || null,
        imageName: scene.image?.name || null,
        audioUrl: scene.audio?.url || null,
        audioName: scene.audio?.name || null,
        imagePrompt: imagePrompt || '',
        imageDescription: imageDesc || '',
      };
      await updateDoc(storyRef, {
        scenes: nextScenes,
        reader: {
          avatarUrl: readerUI.avatarUrl,
          backgroundUrl: readerUI.backgroundUrl,
        },
        updatedAt: serverTimestamp(),
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
      {/* Dark override for inputs in pickers (match Support) */}
      <style jsx global>{`
        .dark .asset-scope input[type="text"],
        .dark .asset-scope textarea {
          color: #3D4F60 !important;
          background: #ffffff !important;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-[#0d1520]/70 border-b border-[#3D4F60]/10 dark:border-[#4B5A6B]/20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold text-[#3D4F60] dark:text-[#E0C9A0]">Narratum</Link>
            <span className="text-sm opacity-60">/ Create /</span>
            <span className="text-sm font-semibold">Scenes</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/create/begin" className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20">Begin</Link>
            <Link href="/create/support" className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20">Support</Link>
            <span className="text-xs px-3 py-1.5 rounded-lg bg-[#E97451] text-white">Scenes</span>
          </div>
        </div>
      </header>

      {/* Scrollable workspace between header/footer */}
      <main className="mx-auto max-w-6xl px-4">
        <div className="h-[calc(100vh-140px)] overflow-y-auto py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT – Story Preview & Text */}
            <section className="space-y-4">
              {/* Preview card on background */}
              <div
                className="rounded-2xl overflow-hidden border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20"
                style={{
                  backgroundImage: `url(${readerUI.backgroundUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="backdrop-blur bg-white/60 dark:bg-[#0f1620]/60 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Story Preview
                    </h2>
                    <div className="text-xs opacity-70">Scene #{scene.index || 1}</div>
                  </div>

                  <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-white/60 dark:bg-[#0f1620]/60 grid place-items-center">
                    {scene.image?.url ? (
                      <Image
                        src={scene.image.url}
                        alt={scene.image?.name ?? 'scene image'}
                        width={1024}
                        height={768}
                        className="w-full h-full object-cover"
                        priority
                      />
                    ) : (
                      <div className="text-xs opacity-70">No image selected</div>
                    )}
                  </div>

                  <div className="mt-3">
                    <audio className="w-full" controls src={scene.audio?.url || undefined} />
                    {!scene.audio?.url && (
                      <div className="text-xs opacity-70 mt-1">No narration selected</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Scene text */}
              <div className="rounded-2xl border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/70 dark:bg-[#0f1620]/70 shadow-sm p-3 space-y-2">
                <label className="text-xs font-semibold">Scene Text</label>
                <textarea
                  value={scene.text}
                  onChange={e => setScene(s => ({ ...s, text: e.target.value }))}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
                  placeholder="Write the story text for this scene…"
                />
              </div>
            </section>

            {/* RIGHT – Pickers */}
            <section className="space-y-6">
              {/* Image picker + AI describe */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Scene Image
                  </h3>
                  <div className="text-xs opacity-70">{scene.image?.name ?? scene.image?.url ?? '—'}</div>
                </div>

                <AssetPicker
                  kind="image"
                  categoryForGallery="backgrounds"
                  promptLabel="Image Prompt"
                  initialPrompt={imagePrompt}
                  onPicked={applyImage}
                  onDescribeImage={(desc) => setImageDesc(desc)}
                />

                <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-3 bg-white/60 dark:bg-zinc-900/60 asset-scope">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">AI Description</label>
                  <textarea
                    value={imageDesc}
                    onChange={e => setImageDesc(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
                    placeholder="When you use AI Describe on an image, the description appears here…"
                  />
                </div>
              </div>

              {/* Audio picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Music className="w-4 h-4" /> Narration Audio
                  </h3>
                  <div className="text-xs opacity-70">{scene.audio?.name ?? scene.audio?.url ?? '—'}</div>
                </div>

                <AssetPicker
                  kind="audio"
                  categoryForGallery="audioNarrations"
                  promptLabel="Narration Text"
                  onPicked={applyAudio}
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-30 border-t border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="text-xs opacity-70">
            Pick from <span className="font-medium">My Gallery</span>, <span className="font-medium">AI Generate</span>, or <span className="font-medium">New Upload</span>. Background & avatar defaults are preloaded.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScene(s => ({ ...s, index: Math.max(1, (s.index ?? 1) - 1) }))}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20"
            >
              Prev Scene
            </button>
            <button
              onClick={() => setScene(s => ({ ...s, index: (s.index ?? 1) + 1 }))}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20"
            >
              Next Scene
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-[#E97451] text-white disabled:opacity-60"
              title={user ? '' : 'Sign in to save'}
            >
              {canSave ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
              Save Scene
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
