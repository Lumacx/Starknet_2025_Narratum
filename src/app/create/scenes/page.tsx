// src/app/create/scenes/page.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ImageIcon, Music, Upload, Wand2, Loader2, Check, Info, PlusCircle, Quote } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import {
  setDoc,
  getDoc,
  updateDoc,
  doc as fsDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref as sref,
  listAll,
  getDownloadURL,
  getMetadata,
} from 'firebase/storage';

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type AssetCategory =
  | 'characters'
  | 'locations'
  | 'backgrounds'
  | 'covers'
  | 'avatars'
  | 'audioNarrations'
  | 'audioEffects'
  | 'videos';

type GalleryMeta = {
  modelUsed?: string | null;
  provider?: string | null;
  location?: string | null;
  prompt?: string | null;
  language?: string | null;
  source?: string | null;
  displayName?: string | null;
  category?: string | null;
  createdAt?: string | null;
  storyId?: string | null;
  role?: string | null;
};

type GalleryItem = {
  name: string;
  url: string;
  fullPath: string;
  contentType?: string;
  meta?: GalleryMeta;
};

type LangCode =
  | 'en' | 'es' | 'pt' | 'fr' | 'de'
  | 'it' | 'ja' | 'ko' | 'zh' | 'hi' | 'ar';

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German',
  it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic',
};

const DRAFT_KEY = 'newStoryDraft';
const DEFAULTS = {
  avatarUrl: '/avatars/Default.png',
  backgroundUrl: '/story_reader_backgrounds/dream-background.png',
};

const GALLERY_TABS: Array<{
  key: AssetCategory | 'characters' | 'locations' | 'audioNarrations' | 'audioEffects' | 'videos';
  label: string;
  kind: 'image' | 'audio' | 'video';
}> = [
  { key: 'characters',      label: 'Characters',       kind: 'image' },
  { key: 'locations',       label: 'Locations',        kind: 'image' },
  { key: 'audioNarrations', label: 'Narrations (MP3)', kind: 'audio' },
  { key: 'audioEffects',    label: 'Sound FX (MP3)',   kind: 'audio' },
  { key: 'videos',          label: 'Videos (MP4)',     kind: 'video' },
];

/* ----- Scene/Story types for merged flow ----- */

type Scene = {
  id: string;
  index: number;
  title?: string;
  text?: string;
  imageUrl?: string;
  imageName?: string;
  audioUrl?: string;
  audioName?: string;
  voiceId?: string;              // per-scene override (optional)
  durationMs?: number;
};

type StoryDoc = {
  title?: string;
  synopsis?: string;
  genres?: string[];
  language?: LangCode;
  voiceId?: string;              // story-level default voice (optional)
  reader?: { avatarUrl?: string; backgroundUrl?: string };
  scenes?: Scene[];
  status?: 'draft' | 'published';
  isPublic?: boolean;
  publishedAt?: any;
  updatedAt?: any;
};

/* ----- UI helpers ----- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

function inferKindFromPath(path?: string, contentType?: string): 'image' | 'audio' | 'video' | 'unknown' {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.startsWith('video/')) return 'video';
  const p = path || '';
  if (/\.(png|jpe?g|gif|webp)$/i.test(p)) return 'image';
  if (/\.(mp3|wav|m4a)$/i.test(p)) return 'audio';
  if (/\.(mp4|webm)$/i.test(p)) return 'video';
  return 'unknown';
}

/* ------------------------------------------------------------------ */
/* Imagen-oriented helpers (consistent with Support/Begin)             */
/* ------------------------------------------------------------------ */

function genreDescriptors(genres: string[] = []): string[] {
  const g = genres.map(s => s.toLowerCase().trim());
  const out: string[] = [];
  if (g.includes('fantasy')) out.push('mythic, magical realism, ornate details, ethereal glow');
  if (g.includes('sci-fi') || g.includes('science fiction')) out.push('futuristic, sleek materials, volumetric light, high contrast');
  if (g.includes('mystery')) out.push('moody, chiaroscuro, suspenseful framing');
  if (g.includes('horror')) out.push('ominous, high shadow depth, desaturated tones');
  if (g.includes('romance')) out.push('warm palette, soft bokeh, intimate framing');
  if (g.includes('adventure')) out.push('dynamic angle, epic scale, dramatic skies');
  if (g.includes("children's")) out.push('whimsical, friendly shapes, bright but harmonious colors');
  if (g.includes('comedy')) out.push('playful, lighthearted expressions, lively composition');
  if (g.includes('drama')) out.push('cinematic lighting, emotive atmosphere');
  if (g.includes('action')) out.push('kinetic energy, sense of motion, bold contrasts');
  if (g.includes('other')) out.push('cohesive palette, professional cover illustration');
  return out;
}

function composePromptForImagen(
  userPrompt: string,
  ctx?: { title?: string; genres?: string[]; synopsis?: string; language?: string }
) {
  const lines: string[] = [];
  lines.push(`Use ${ctx?.language || 'English'} to interpret all descriptive concepts. Do not render any textual characters in the image.`);
  lines.push('Create a professional, illustration-style image (no text). Use a single striking composition with a clear focal subject, cinematic lighting, and a cohesive palette.');
  if (ctx?.synopsis) {
    lines.push(`PRIMARY GUIDANCE (Story Synopsis — highest priority): ${ctx.synopsis}`);
  }
  if (ctx?.genres?.length) {
    const desc = genreDescriptors(ctx.genres);
    lines.push(`SECONDARY GUIDANCE (Genre atmosphere): ${ctx.genres.join(', ')}.` + (desc.length ? ` Visual tone cues: ${desc.join('; ')}.` : ''));
  }
  if (userPrompt) {
    lines.push(`TERTIARY GUIDANCE (Additional creative direction): ${userPrompt}`);
  }
  if (ctx?.title) {
    lines.push(`LIGHT INFLUENCE (Title motif — do NOT add text): ${ctx.title}. Use it only as thematic inspiration.`);
  }
  const negativesBase = 'text, watermark, logo, low-res, blurry, jpeg artifacts, malformed anatomy, extra limbs, cropped face';
  return { prompt: lines.join('\n'), negativePrompt: negativesBase };
}

function extractImageAndModel(json: any): { dataUrl?: string; modelUsed?: string } {
  if (Array.isArray(json?.images) && json.images.length) {
    const first = json.images[0];
    const dataUrl = typeof first === 'string'
      ? (first.startsWith('data:') ? first : `data:image/png;base64,${first}`)
      : undefined;
    return { dataUrl, modelUsed: json.modelUsed || json.model || json.modelName };
  }
  if (typeof json?.imageBase64 === 'string') {
    return { dataUrl: `data:image/png;base64,${json.imageBase64}`, modelUsed: json.modelUsed || json.model };
  }
  if (typeof json?.dataUrl === 'string') {
    return { dataUrl: json.dataUrl, modelUsed: json.modelUsed || json.model };
  }
  return {};
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ScenesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = searchParams.get('storyId') || undefined;

  /* -------- Story context (title/genres/synopsis/language/voice) -------- */
  const [story, setStory] = useState<StoryDoc | null>(null);
  const [readerUI, setReaderUI] = useState({
    avatarUrl: DEFAULTS.avatarUrl,
    backgroundUrl: DEFAULTS.backgroundUrl,
  });
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const langLabel = useMemo(
    () => LANG_LABELS[(story?.language || 'en') as LangCode] || 'English',
    [story?.language]
  );

  // Local per-scene UI helpers (kept from your file)
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageDesc, setImageDesc] = useState('');
  const [narrationText, setNarrationText] = useState('');
  const [voice, setVoice] = useState('Kore');
  const [tone, setTone] = useState<'a normal' | 'a cheerful' | 'a sad' | 'an excited' | 'a whispering'>('a normal');

  const [isGenImage, setIsGenImage] = useState(false);
  const [isGenAudio, setIsGenAudio] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Gallery
  const [activeTab, setActiveTab] = useState<typeof GALLERY_TABS[number]['key']>('characters');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  // AI Scene-Outline ideas
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideas, setIdeas] = useState<Array<{ title: string; outline: string }>>([]);

  // Derived current scene
  const currentScene = scenes[currentIndex] || null;

  /* -------- Load story + scenes from Firestore -------- */
  useEffect(() => {
    (async () => {
      if (!storyId) return;

      try {
        const storyRef = fsDoc(db, 'stories', storyId);
        const snap = await getDoc(storyRef);
        let doc: StoryDoc = {};
        if (snap.exists()) doc = (snap.data() as StoryDoc) || {};

        // normalize scenes
        const fixedScenes: Scene[] = (doc.scenes || []).map((s, i) => ({
          id: s.id || crypto.randomUUID(),
          index: Number.isFinite(s.index) ? s.index : i,
          title: s.title ?? `Scene ${i + 1}`,
          text: s.text || '',
          imageUrl: s.imageUrl || undefined,
          imageName: s.imageName || undefined,
          audioUrl: s.audioUrl || undefined,
          audioName: s.audioName || undefined,
          voiceId: s.voiceId || undefined,
          durationMs: s.durationMs || undefined,
        })).sort((a, b) => a.index - b.index);

        setStory({
          title: doc.title || '',
          synopsis: doc.synopsis || '',
          genres: doc.genres || [],
          language: (doc.language as LangCode) || 'en',
          voiceId: doc.voiceId || undefined,
          reader: {
            avatarUrl: doc.reader?.avatarUrl || DEFAULTS.avatarUrl,
            backgroundUrl: doc.reader?.backgroundUrl || DEFAULTS.backgroundUrl,
          },
          status: doc.status || 'draft',
          isPublic: !!doc.isPublic,
          scenes: fixedScenes,
        });

        setReaderUI({
          avatarUrl: doc.reader?.avatarUrl || DEFAULTS.avatarUrl,
          backgroundUrl: doc.reader?.backgroundUrl || DEFAULTS.backgroundUrl,
        });
        setScenes(fixedScenes);

        // init scene index from URL or localStorage
        const fromUrl = Number.parseInt(searchParams.get('scene') || '', 10);
        const fromLs  = Number.parseInt(localStorage.getItem('reader:lastScene') || '', 10);
        const initial = Number.isFinite(fromUrl) ? fromUrl : (Number.isFinite(fromLs) ? fromLs : 0);
        setCurrentIndex(Math.max(0, Math.min(initial, Math.max(fixedScenes.length - 1, 0))));
      } catch (e) {
        console.error('Failed to load story', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // keep URL and localStorage in sync
  useEffect(() => {
    const sp2 = new URLSearchParams(window.location.search);
    if (storyId) sp2.set('storyId', storyId);
    sp2.set('scene', String(currentIndex));
    window.history.replaceState({}, '', `?${sp2.toString()}`);
    localStorage.setItem('reader:lastScene', String(currentIndex));
  }, [currentIndex, storyId]);

  /* -------- Gallery loader (Storage-based, consistent with Support) -------- */
  const loadGallery = useCallback(async (category: AssetCategory) => {
    if (!user) return;
    setLoadingGallery(true);
    try {
      const base = sref(storage, `users/${user.uid}/assets/${category}/`);
      const res = await listAll(base);
      const items = await Promise.all(
        res.items.map(async (i) => {
          const [url, meta] = await Promise.all([getDownloadURL(i), getMetadata(i).catch(() => null)]);
          const cm = meta?.customMetadata || {};
          const it: GalleryItem = {
            name: i.name,
            fullPath: i.fullPath,
            url,
            contentType: meta?.contentType || undefined,
            meta: {
              modelUsed: (cm['narratum:model'] || cm['modelUsed'] || cm['model'] || null) as string | null,
              provider: (cm['narratum:provider'] || cm['provider'] || null) as string | null,
              location: (cm['narratum:location'] || cm['location'] || null) as string | null,
              prompt: (cm['narratum:prompt'] || cm['prompt'] || null) as string | null,
              language: (cm['narratum:language'] || null) as string | null,
              source: (cm['source'] || null) as string | null,
              displayName: (cm['displayName'] || null) as string | null,
              category: (cm['category'] || null) as string | null,
              createdAt: (cm['createdAt'] || null) as string | null,
              storyId: (cm['narratum:storyId'] || cm['storyId'] || null) as string | null,
              role: (cm['narratum:role'] || cm['role'] || null) as string | null,
            },
          };
          return it;
        })
      );
      setGallery(items.sort((a, b) => (a.name < b.name ? 1 : -1)));
    } catch (e) {
      console.error('Failed to load storage gallery:', e);
      setGallery([]);
    } finally {
      setLoadingGallery(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const tab = activeTab as AssetCategory;
    void loadGallery(tab);
  }, [user, activeTab, loadGallery]);

  /* -------- Helpers to update story/scenes in state -------- */
  function updateCurrentScene(patch: Partial<Scene>) {
    setScenes(prev => {
      const cur = prev[currentIndex];
      if (!cur) return prev;
      const next = [...prev];
      next[currentIndex] = { ...cur, ...patch };
      return next;
    });
  }
  function updateStoryPatch(patch: Partial<StoryDoc>) {
    setStory(prev => (prev ? { ...prev, ...patch } : prev));
  }

  /* -------- Actions: select from gallery / describe / reference -------- */
  const canDescribeSelected = (item: GalleryItem) => {
    const k = inferKindFromPath(item.fullPath, item.contentType);
    return k === 'image';
  };

  async function handleDescribe(item: GalleryItem) {
    try {
      if (!canDescribeSelected(item)) return;
      const lang = (story?.language || 'en') as LangCode;
      const langLabel = LANG_LABELS[lang] || 'English';
      const promptText =
        lang === 'es'
          ? 'Describe esta imagen en un solo párrafo claro y conciso...'
          : `Describe this image in one clear, concise paragraph... Respond only in ${langLabel}.`;
      const body = { imageUrl: item.url, prompt: promptText, language: lang, targetLanguage: lang, responseModalities: ['TEXT'] };
      const r = await fetch('/api/describe-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || 'Describe failed');
      setImageDesc(json.description || '');
    } catch (e: any) {
      alert(e?.message || 'AI describe failed');
    }
  }

  function handleSelectForScene(item: GalleryItem) {
    const kind = inferKindFromPath(item.fullPath, item.contentType);
    if (kind === 'image') {
      updateCurrentScene({ imageUrl: item.url, imageName: item.name });
    } else if (kind === 'audio') {
      updateCurrentScene({ audioUrl: item.url, audioName: item.name });
    } else {
      alert('Only image or audio can be selected directly for a scene.');
    }
  }

  // Soft references list (kept in component only for now)
  const [references, setReferences] = useState<Array<{ url: string; name?: string; category?: AssetCategory }>>([]);
  function handleUseAsReference(item: GalleryItem) {
    setReferences((prev) => [...prev, { url: item.url, name: item.name, category: activeTab as AssetCategory }]);
  }

  /* -------- AI: Generate Image (Imagen 4 via /api/generate-image) -------- */
  const handleGenerateImage = useCallback(async () => {
    if (!story) return;
    if (!imagePrompt.trim() && !story.synopsis && !(story.genres?.length)) {
      alert('Please write an image description or fill the story synopsis/genres on the Begin page.');
      return;
    }
    setIsGenImage(true);
    try {
      const { prompt, negativePrompt } = composePromptForImagen(imagePrompt, {
        title: story.title,
        genres: story.genres,
        synopsis: story.synopsis,
        language: story.language,
      });

      // Optionally blend soft reference names
      const refNames = (references || []).map(r => r.name).filter(Boolean);
      const promptWithRefs = refNames.length
        ? `${prompt}\nVISUAL REFERENCES (soft influence): ${refNames.join(', ')}.`
        : prompt;

      const r = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptWithRefs, negativePrompt, count: 1 }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || 'Image generation failed');
      const { dataUrl } = extractImageAndModel(json);
      if (!dataUrl) throw new Error('No image returned by generator.');
      updateCurrentScene({ imageUrl: dataUrl, imageName: `scene-${currentIndex + 1}-ai.png` });
    } catch (e: any) {
      alert(e?.message || 'Image generation error');
    } finally {
      setIsGenImage(false);
    }
  }, [story, imagePrompt, references, currentIndex]);

  /* -------- Auto-suggest scene text + image prompt (kept from your flow) ----- */
  /* -------- Auto-suggest scene text + image prompt -------- */
async function handleSuggestForScene() {
  if (!story) return;
  setIsSuggesting(true);
  try {
    const payload = {
      title: story.title,
      genres: story.genres,
      synopsis: story.synopsis,
      language: story.language,
      sceneIndex: currentIndex + 1,
    };

    const res = await fetch('/api/suggest-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Suggestion failed');

    if (json?.storyText) updateCurrentScene({ text: json.storyText });
    if (json?.imagePrompt) setImagePrompt(json.imagePrompt);

    if (!json?.storyText && !json?.imagePrompt) {
      throw new Error('No suggestions returned.');
    }
  } catch (e: any) {
    alert(e?.message || 'Suggest failed');
  } finally {
    setIsSuggesting(false);
  }
}

  /* -------- AI Scene-Outline Ideas (new optional panel) ------------------ */
  /* -------- AI Scene-Outline Ideas (array from /api/generate-scene-outline) -------- */
async function handleGenerateIdeas() {
  if (!story) return;
  setIdeasLoading(true);
  setIdeas([]);
  try {
    const res = await fetch('/api/generate-scene-outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: story.synopsis || story.title || 'Story',
        pages: 5,
        language: story.language || 'en',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'AI outline endpoint failed');

    // Expecting an array: [{ storyText, imagePrompt }, ...]
    const arr = Array.isArray(data) ? data : [];
    const mapped = arr.map((p: any, i: number) => ({
      title: `Beat ${i + 1}`,
      outline: String(p?.storyText || '').trim(),
      imagePrompt: String(p?.imagePrompt || '').trim(),
    }));

    setIdeas(mapped);
  } catch (e: any) {
    alert(e?.message || 'Could not generate ideas.');
  } finally {
    setIdeasLoading(false);
  }
}

function applyIdeaToCurrent(idea: { title: string; outline: string; imagePrompt?: string }) {
  if (!currentScene) return;
  const mergedText = currentScene.text?.trim()
    ? `${currentScene.text.trim()}\n\n${idea.outline.trim()}`
    : idea.outline.trim();

  updateCurrentScene({ title: idea.title || currentScene.title, text: mergedText });
  if (idea.imagePrompt && idea.imagePrompt.trim()) {
    setImagePrompt(idea.imagePrompt.trim());
  }
}

  function addIdeaAsNewScene(idea: { title: string; outline: string }) {
    setScenes(prev => ([
      ...prev,
      {
        id: crypto.randomUUID(),
        index: prev.length,
        title: idea.title || `Scene ${prev.length + 1}`,
        text: idea.outline,
      }
    ]));
  }

  /* -------- AUDIO: Single player with autoplay gating + preload next ---- */
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const autoplayUnlockedRef = React.useRef(false);

  // bind to current scene audio
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const src = currentScene?.audioUrl || '';
    if (!src) {
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      el.removeAttribute('src');
      el.load();
      return;
    }
    el.src = src;
    el.load();
    if (autoplayUnlockedRef.current) {
      el.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [currentScene?.audioUrl, currentIndex]);

  // preload next scene
  useEffect(() => {
    const next = scenes[currentIndex + 1];
    if (!next?.audioUrl) return; // devolver void está bien
  
    const link = document.createElement('link');
    link.rel = 'prefetch';         // o 'preload' si prefieres
    link.as = 'audio';
    link.href = next.audioUrl;
    document.head.appendChild(link);
  
    return () => {
      // asegúrate de devolver una FUNCIÓN que haga el cleanup
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, [currentIndex, scenes]);
  

  // audio events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onLoaded = () => setDuration(el.duration || 0);
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onEnded = () => { setIsPlaying(false); if (currentIndex < scenes.length - 1) setCurrentIndex(i => i + 1); };
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('ended', onEnded);
    };
  }, [currentIndex, scenes.length]);

  function onUserGesturePlay() {
    autoplayUnlockedRef.current = true;
    audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
  }
  function onPause() {
    audioRef.current?.pause();
    setIsPlaying(false);
  }

  /* -------- NAV + SAVE/PUBLISH/READER ---------------------------------- */
  function goPrev() { setCurrentIndex(i => Math.max(0, i - 1)); }
  function goNext() { setCurrentIndex(i => Math.min(scenes.length - 1, i + 1)); }

  const readerHref = storyId ? `/ereader?storyId=${encodeURIComponent(storyId)}` : '#';

  async function handleSaveStory() {
    if (!storyId) return;
    try {
      const storyRef = fsDoc(db, 'stories', storyId);
      const nextDoc: Partial<StoryDoc> = {
        title: story?.title || '',
        synopsis: story?.synopsis || '',
        genres: story?.genres || [],
        language: (story?.language as LangCode) || 'en',
        voiceId: story?.voiceId, // default voice if you add a selector
        reader: readerUI,
        scenes: scenes.map((s, i) => ({ ...s, index: i })),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(storyRef, nextDoc);
      alert('Story saved.');
    } catch (e) {
      console.error(e);
      alert('Failed to save story.');
    }
  }

  async function handlePublishStory() {
    if (!storyId) return;
    try {
      const storyRef = fsDoc(db, 'stories', storyId);
      await updateDoc(storyRef, {
        status: 'published',
        isPublic: true,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert('Story published! It will now appear in Discovery and your Profile.');
    } catch (e) {
      console.error(e);
      alert('Failed to publish story.');
    }
  }

  /* -------- Keyboard nav (optional) ------------------------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentIndex < scenes.length - 1) goNext();
      if (e.key === 'ArrowLeft' && currentIndex > 0) goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, scenes.length]);

  /* -------- UI ---------------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm opacity-70">
        <Loader2 className="animate-spin mr-2" /> Checking your session…
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-xl mx-auto bg-[#F3EADF] rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
          <p className="mb-6">Please sign in to edit scenes.</p>
          <div className="flex gap-3">
            <Link href="/login" className="px-5 py-2 rounded-md bg-[#3D4F60] text-white">Go to Login</Link>
            <button onClick={() => router.back()} className="px-5 py-2 rounded-md border-2">← Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
      {/* Keep inputs dark-readable like Support */}
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

      {/* Workspace */}
      <main className="mx-auto max-w-6xl px-4 pb-40">
        <div className="min-h-[calc(100vh-140px)] overflow-y-auto py-6">
          {/* Top actions */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/60 dark:bg-[#0f1620]/60 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-[#3D4F60]/30 dark:border-[#4B5A6B]/30 bg-white dark:bg-[#0e1520] px-3 py-2 text-sm"
                placeholder="Story title"
                value={story?.title || ''}
                onChange={(e) => updateStoryPatch({ title: e.target.value })}
              />
              {/* optional: story default voice selector can go here later */}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goPrev} disabled={currentIndex <= 0} className="rounded-lg border px-3 py-2 text-sm bg-white/70 dark:bg-[#1A2533] disabled:opacity-50">← Previous scene</button>
              <button onClick={goNext} disabled={currentIndex >= Math.max(0, scenes.length - 1)} className="rounded-lg border px-3 py-2 text-sm bg-white/70 dark:bg-[#1A2533] disabled:opacity-50">Next scene →</button>
              <button onClick={handleSaveStory} className="rounded-lg border border-teal-600/60 bg-teal-600/20 px-3 py-2 text-sm text-teal-900 dark:text-teal-200 hover:bg-teal-600/30">
                Save Story
              </button>
              <Link href={storyId ? `/ereader?storyId=${encodeURIComponent(storyId)}` : '#'} className="rounded-lg border border-indigo-600/60 bg-indigo-600/20 px-3 py-2 text-sm text-indigo-900 dark:text-indigo-200 hover:bg-indigo-600/30">
                Preview Story
              </Link>
              <button onClick={handlePublishStory} className="rounded-lg border border-amber-600/60 bg-amber-600/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 hover:bg-amber-600/30">
                Publish Story
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT – Preview & Scene text & AI panels */}
            <section className="space-y-4">
              {/* Preview card */}
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
                    <div className="text-xs opacity-70">Scene #{currentIndex + 1}</div>
                  </div>

                  <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-white/60 dark:bg-[#0f1620]/60 grid place-items-center">
                    {currentScene?.imageUrl ? (
                      <Image
                        src={currentScene.imageUrl}
                        alt={currentScene?.imageName ?? 'scene image'}
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
                    <div className="flex items-center gap-2">
                      {currentScene?.audioUrl ? (
                        <>
                          {!isPlaying ? (
                            <button onClick={onUserGesturePlay} className="px-3 py-1.5 rounded bg-[#3D4F60] text-white">▶ Play</button>
                          ) : (
                            <button onClick={onPause} className="px-3 py-1.5 rounded bg-[#3D4F60] text-white">❚❚ Pause</button>
                          )}
                          <div className="text-xs opacity-70">
                            {isBuffering ? 'Buffering… ' : ''}{formatTime(currentTime)} / {formatTime(duration)}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs opacity-70">No narration selected</div>
                      )}
                    </div>
                    <audio ref={audioRef} preload="metadata" className="hidden" />
                  </div>
                </div>
              </div>

              {/* Scene text + helpers */}
              <div className="rounded-2xl border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/70 dark:bg-[#0f1620]/70 shadow-sm p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold">Scene Title</label>
                  <input
                    value={currentScene?.title || ''}
                    onChange={(e) => updateCurrentScene({ title: e.target.value })}
                    className="ml-2 flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm"
                    placeholder={`Scene ${currentIndex + 1} title`}
                  />
                  <button
                    type="button"
                    onClick={handleSuggestForScene}
                    className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs"
                  >
                    {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Quote className="w-4 h-4" />}
                    Auto-Suggest (text + image)
                  </button>
                </div>

                <label className="text-xs font-semibold">Scene Text</label>
                <textarea
                  value={currentScene?.text || ''}
                  onChange={e => updateCurrentScene({ text: e.target.value })}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
                  placeholder="Write the story text for this scene…"
                />

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-3 bg-white/60 dark:bg-zinc-900/60 asset-scope">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Image Description</label>
                    <textarea
                      value={imagePrompt}
                      onChange={e => setImagePrompt(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
                      placeholder="Describe the visual for this scene (or use Auto-Suggest)…"
                    />
                    <button
                      onClick={handleGenerateImage}
                      disabled={isGenImage}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E97451] text-white disabled:opacity-60"
                    >
                      {isGenImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Generate Image (AI)
                    </button>
                  </div>

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

                <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-3 bg-white/60 dark:bg-zinc-900/60 asset-scope">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold">Narration</label>
                  </div>
                  <textarea
                    value={narrationText}
                    onChange={e => setNarrationText(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
                    placeholder="Write or paste the narration to speak (defaults to the Scene Text if empty)…"
                  />
                  <div className="grid sm:grid-cols-2 gap-2 mt-2">
                    <select
                      className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-white text-[#3D4F60]"
                      value={voice}
                      onChange={e => setVoice(e.target.value)}
                    >
                      <option value="Kore">Kore (Male, Firm)</option>
                      <option value="Puck">Puck (Male, Upbeat)</option>
                      <option value="Zephyr">Zephyr (Female, Bright)</option>
                      <option value="Leda">Leda (Female, Youthful)</option>
                      <option value="Sadachbia">Sadachbia (Female, Lively)</option>
                    </select>
                    <select
                      className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-white text-[#3D4F60]"
                      value={tone}
                      onChange={e => setTone(e.target.value as any)}
                    >
                      <option value="a normal">Normal Tone</option>
                      <option value="a cheerful">Cheerful Tone</option>
                      <option value="a sad">Sad Tone</option>
                      <option value="an excited">Excited Tone</option>
                      <option value="a whispering">Whispering Tone</option>
                    </select>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={async () => {
                        const text = (narrationText || currentScene?.text || '').trim();
                        if (!text || !currentScene) { alert('Enter narration text first.'); return; }
                        setIsGenAudio(true);
                        try {
                          const r = await fetch('/api/generate-audio', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              text,
                              voice,
                              tone,
                              language: (story?.language || 'en'),
                              model: 'gemini-2.5-flash-preview-tts',
                            }),
                          });
                          const json = await r.json();
                          if (!r.ok) throw new Error(json?.error || 'TTS failed');
                          if (!json?.audioUrl) throw new Error('No audioUrl returned by TTS route.');
                          updateCurrentScene({
                            audioUrl: json.audioUrl,
                            audioName: `scene-${currentIndex + 1}-narration.mp3`,
                          });
                        } catch (e: any) {
                          alert((e?.message || 'TTS failed') + '\n\nTip: ensure /api/generate-audio returns { audioUrl }.');
                        } finally {
                          setIsGenAudio(false);
                        }
                      }}
                      disabled={isGenAudio}
                      className="px-4 py-2 rounded-md bg-[#3D4F60] text-white disabled:opacity-60"
                    >
                      {isGenAudio ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                      {currentScene?.audioUrl ? 'Re-generate Narration (AI)' : 'Generate Narration (AI)'}
                    </button>
                    {currentScene?.audioUrl && (
                      <a href={currentScene.audioUrl} className="px-4 py-2 rounded-md border" download>
                        Download MP3
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Scene-Outline Ideas (AI) */}
              <div className="rounded-2xl border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/70 dark:bg-[#0f1620]/70 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Scene-Outline Ideas (AI)</h3>
                  <button
                    onClick={handleGenerateIdeas}
                    disabled={ideasLoading}
                    className="rounded-lg border border-fuchsia-600/60 bg-fuchsia-600/20 px-3 py-2 text-xs text-fuchsia-900 dark:text-fuchsia-200 hover:bg-fuchsia-600/30 disabled:opacity-50"
                  >
                    {ideasLoading ? 'Generating…' : 'Generate ideas'}
                  </button>
                </div>
                {ideas.length === 0 && !ideasLoading && (
                  <p className="text-xs opacity-70">Click “Generate ideas” to get 3–5 scene beats you can insert or add as new scenes.</p>
                )}
                <ul className="space-y-3">
                  {ideas.map((idea, idx) => (
                    <li key={`${idea.title}-${idx}`} className="rounded-xl border border-slate-700/30 bg-white/60 dark:bg-slate-900/50 p-3">
                      <div className="mb-1 text-[13px] font-medium">{idea.title || `Idea ${idx + 1}`}</div>
                      <div className="whitespace-pre-wrap text-[12px] leading-relaxed opacity-90">
                        {idea.outline}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => applyIdeaToCurrent(idea)}
                          className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/20"
                        >
                          Insert into current
                        </button>
                        <button
                          onClick={() => addIdeaAsNewScene(idea)}
                          className="rounded-md border border-indigo-500/50 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-700 dark:text-indigo-200 hover:bg-indigo-500/20"
                        >
                          Add as new scene
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* RIGHT – My Gallery (Tabs) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">My Gallery</h3>
                <div className="text-xs opacity-70">AI language: <strong>{langLabel}</strong></div>
              </div>

              <div className="flex flex-wrap gap-2">
                {GALLERY_TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={classNames(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition',
                      activeTab === t.key
                        ? 'bg-[#E97451] text-white border-[#E97451] shadow'
                        : 'bg-white text-[#3D4F60] border-[#3D4F60]/20 hover:border-[#3D4F60]/40 dark:bg-[#1A2533] dark:text-[#F0D1B0] dark:border-[#4B5A6B]/20 dark:hover:border-[#4B5A6B]/40'
                    )}
                  >
                    {t.kind === 'image' ? <ImageIcon size={16} /> : t.kind === 'audio' ? <Music size={16} /> : <Upload size={16} />}
                    <span className="text-sm font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border-2 border-[#3D4F60] dark:border-[#4B5A6B] p-3 bg-white/60 dark:bg-transparent">
                {loadingGallery ? (
                  <div className="text-sm opacity-70 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading…</div>
                ) : gallery.length === 0 ? (
                  <div className="text-sm opacity-70 flex items-center gap-2">
                    <Info className="w-4 h-4" /> No files yet in {GALLERY_TABS.find(x => x.key === activeTab)?.label}.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.map(it => {
                      const kind = inferKindFromPath(it.fullPath, it.contentType);
                      return (
                        <div key={it.fullPath} className="relative group border rounded-md overflow-hidden p-1">
                          {kind === 'image' ? (
                            <Image src={it.url} alt={it.name} width={150} height={150} className="w-full h-32 object-cover rounded" />
                          ) : kind === 'audio' ? (
                            <div className="w-full h-32 grid place-items-center bg-zinc-100 dark:bg-zinc-800 rounded">
                              <Music className="w-6 h-6" />
                              <div className="text-[11px] mt-1 opacity-80 px-1 truncate">{it.name}</div>
                            </div>
                          ) : (
                            <div className="w-full h-32 grid place-items-center bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
                              {it.name}
                            </div>
                          )}

                          {/* Badges */}
                          {it.meta?.modelUsed && kind === 'image' && (
                            <div className="absolute top-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                              AI • {it.meta.modelUsed}
                            </div>
                          )}
                          {it.meta?.language && (
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                              {it.meta.language}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            {kind === 'image' && (
                              <>
                                <button
                                  onClick={() => handleDescribe(it)}
                                  className="flex-1 text-[11px] px-2 py-1 rounded bg-blue-500/90 text-white"
                                  title="AI Describe"
                                >
                                  Describe
                                </button>
                                <button
                                  onClick={() => handleUseAsReference(it)}
                                  className="flex-1 text-[11px] px-2 py-1 rounded bg-zinc-800/90 text-white"
                                  title="Use as Reference"
                                >
                                  Reference
                                </button>
                                <button
                                  onClick={() => handleSelectForScene(it)}
                                  className="flex-1 text-[11px] px-2 py-1 rounded bg-[#E97451]/90 text-white"
                                  title="Select for Scene"
                                >
                                  Select
                                </button>
                              </>
                            )}
                            {kind === 'audio' && (
                              <button
                                onClick={() => handleSelectForScene(it)}
                                className="w-full text-[11px] px-2 py-1 rounded bg-[#E97451]/90 text-white"
                                title="Select for Scene (Audio)"
                              >
                                Use Audio
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* References quick list */}
              {references.length > 0 && (
                <div className="rounded-xl border-2 border-[#3D4F60]/40 dark:border-[#4B5A6B]/40 p-3 bg-white/50 dark:bg-[#0f1620]/50">
                  <div className="text-xs font-semibold mb-2">Scene References</div>
                  <ul className="flex flex-wrap gap-2">
                    {references.map((r, i) => (
                      <li key={i} className="px-2 py-1 text-xs rounded bg-zinc-100 dark:bg-zinc-800">
                        {r.name || r.url.split('/').pop()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Local footer for scene nav (kept; now index-based) */}
      <footer className="sticky bottom-0 z-30 border-t border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="text-xs opacity-70">
            Use <span className="font-medium">Auto-Suggest</span> to draft scenes, <span className="font-medium">Generate Image</span> to illustrate, and <span className="font-medium">Generate Narration</span> for audio.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20 disabled:opacity-50"
              disabled={currentIndex <= 0}
            >
              Prev Scene
            </button>
            <button
              onClick={goNext}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20 disabled:opacity-50"
              disabled={currentIndex >= Math.max(0, scenes.length - 1)}
            >
              Next Scene
            </button>
            <button
              onClick={handleSaveStory}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-[#E97451] text-white"
              title="Save entire story"
            >
              <Check className="w-4 h-4" />
              Save Story
            </button>
            <Link
              href={readerHref}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20"
            >
              Preview Story
            </Link>
            <button
              onClick={handlePublishStory}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-600/20 border-2 border-amber-600/40 text-amber-900 dark:text-amber-200"
            >
              Publish Story
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */
function formatTime(sec: number) {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
