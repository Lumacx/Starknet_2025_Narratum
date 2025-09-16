// src/app/create/scenes/page.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ImageIcon,
  Music,
  Upload,
  Wand2,
  Loader2,
  Info,
  PlusCircle,
  Quote,
  Volume2,
  Image as ImgIcon,
  SortAsc,
  SortDesc
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import {
  setDoc,
  getDoc,
  updateDoc,
  doc as fsDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import {
  ref as sref,
  listAll,
  getDownloadURL,
  getMetadata,
  uploadString,
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
  createdAt?: string | null; // <- we use this for sort by date (from storage metadata timeCreated)
  storyId?: string | null;
  role?: string | null;
};

type GalleryItem = {
  name: string;
  url: string;
  fullPath: string;
  contentType?: string;
  meta?: GalleryMeta;
  size?: number;
};

type LangCode =
  | 'en' | 'es' | 'pt' | 'fr' | 'de'
  | 'it' | 'ja' | 'ko' | 'zh' | 'hi' | 'ar';

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German',
  it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic',
};

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

/* ----- Scene/Story types ----- */

type Scene = {
  id: string;
  index: number;
  title?: string;
  text?: string;
  imageUrl?: string | null;
  imageName?: string | null;
  audioUrl?: string | null;
  audioName?: string | null;
  voiceId?: string | null;
  durationMs?: number | null;
  youtubeVideoUrl?: string | null;   // NEW
};

type StoryDoc = {
  title?: string;
  synopsis?: string;
  genres?: string[];
  language?: LangCode;
  voiceId?: string;
  reader?: { avatarUrl?: string; backgroundUrl?: string };
  scenes?: Scene[];
  status?: 'draft' | 'published';
  isPublic?: boolean;
  publishedAt?: any;
  updatedAt?: any;
  pageCount?: number;
};

type StorySummary = {
  id: string;
  title: string;
  synopsis: string;
  genres: string[];
  category: string;
  pageCount: number;
  coverImageUrl: string | null;
  updatedAt?: any; // Firestore Timestamp
};

/* ----- helpers ----- */

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

function resolveAvatarForVoiceAndGenre(voice: string | null | undefined, genres?: string[]): string {
  const g = (genres || []).map(s => s.toLowerCase());
  const isChildren = g.some(s => s.includes('children'));
  if (isChildren) return '/story_reader_avatars/Rain Bunny.png';
  switch ((voice || '').trim()) {
    case 'Nuna':      return '/story_reader_avatars/Nuna.png';
    case 'Kore':      return '/story_reader_avatars/Nuna.png';
    case 'Juniper':   return '/story_reader_avatars/Juniper.png';
    case 'Leda':      return '/story_reader_avatars/Juniper.png';
    case 'Argus':     return '/story_reader_avatars/Argus.png';
    case 'Sadachbia': return '/story_reader_avatars/Argus.png';
    case 'Achird':    return '/story_reader_avatars/Raj.png';
    case 'Zephyr':    return '/story_reader_avatars/Belle.png';
    case 'Puck':      return '/story_reader_avatars/Scythe.png';
    default:          return DEFAULTS.avatarUrl;
  }
}

function buildSSML(text: string, tone: string, lang: LangCode = 'en'): { ssml: string; style: string } {
  const clean = (text || '').trim();
  const safeText = clean.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let rate = '100%'; let pitch = '0st'; let volume = 'medium'; let style = 'normal';
  switch (tone) {
    case 'a cheerful':  rate='110%'; pitch='+2st'; volume='loud';   style='cheerful';  break;
    case 'a sad':       rate='90%';  pitch='-2st'; volume='medium'; style='sad';       break;
    case 'an excited':  rate='108%'; pitch='+1st'; volume='x-loud'; style='excited';   break;
    case 'a whispering':rate='95%';  pitch='-1st'; volume='x-soft'; style='whispering';break;
  }
  const ssml =
`<speak xml:lang="${lang}">
  <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
    ${safeText}
  </prosody>
</speak>`;
  return { ssml, style };
}

function makeDefaultScene(index = 0): Scene {
  const id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : String(Math.random()).slice(2);
  return { id, index, title: `Scene ${index + 1}`, text: '', imageUrl: null, imageName: null, audioUrl: null, audioName: null, voiceId: null, durationMs: null };
}

function deepClean(value: any): any {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(deepClean);
  if (value instanceof Date) return value;
  const tag = Object.prototype.toString.call(value);
  if (tag === '[object Object]') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepClean(v);
    return out;
  }
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
}

function serializeScene(s: Scene, i: number) {
  const base = {
    id: s?.id || (typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : String(Math.random()).slice(2)),
    index: Number.isFinite(s?.index) ? s.index : i,
    title: (s?.title ?? '').toString(),
    text: (s?.text ?? '').toString(),
    imageUrl: s?.imageUrl ?? null,
    imageName: s?.imageName ?? null,
    audioUrl: s?.audioUrl ?? null,
    audioName: s?.audioName ?? null,
    voiceId: s?.voiceId ?? null,
    durationMs: Number.isFinite(s?.durationMs as any) ? s.durationMs : null,
    youtubeVideoUrl: s?.youtubeVideoUrl ?? null,   // NEW
  };
  return deepClean(base);
}

function serializeStoryForWrite(story: StoryDoc | null, scenes: Scene[]) {
  const safeScenes = scenes.map((s, i) => serializeScene(s, i));
  const out: any = {
    title: story?.title ?? '',
    synopsis: story?.synopsis ?? '',
    genres: Array.isArray(story?.genres) ? story!.genres.map(g => String(g)) : [],
    language: (story?.language as LangCode) ?? 'en',
    reader: deepClean({
      avatarUrl: story?.reader?.avatarUrl ?? DEFAULTS.avatarUrl,
      backgroundUrl: story?.reader?.backgroundUrl ?? DEFAULTS.backgroundUrl,
    }),
    scenes: safeScenes,
    status: story?.status ?? 'draft',
    isPublic: !!story?.isPublic,
    updatedAt: serverTimestamp(),
  };
  if (typeof story?.pageCount === 'number') out.pageCount = story!.pageCount;
  if (story?.voiceId) out.voiceId = String(story.voiceId);
  return out;
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
  if (ctx?.synopsis) lines.push(`PRIMARY GUIDANCE (Story Synopsis — highest priority): ${ctx.synopsis}`);
  if (ctx?.genres?.length) {
    const desc = genreDescriptors(ctx.genres);
    lines.push(`SECONDARY GUIDANCE (Genre atmosphere): ${ctx.genres.join(', ')}.` + (desc.length ? ` Visual tone cues: ${desc.join('; ')}.` : ''));
  }
  if (userPrompt) lines.push(`TERTIARY GUIDANCE (Additional creative direction): ${userPrompt}`);
  if (ctx?.title) lines.push(`LIGHT INFLUENCE (Title motif — do NOT add text): ${ctx.title}. Use it only as thematic inspiration.`);
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
  if (typeof json?.imageBase64 === 'string') return { dataUrl: `data:image/png;base64,${json.imageBase64}`, modelUsed: json.modelUsed || json.model };
  if (typeof json?.dataUrl === 'string') return { dataUrl: json.dataUrl, modelUsed: json.modelUsed || json.model };
  return {};
}

/* ------------------------------------------------------------------ */
/* Storage upload helpers                                             */
/* ------------------------------------------------------------------ */

async function uploadDataUrlToStorage(userId: string, storyId: string, dataUrl: string, filename: string) {
  const path = `users/${userId}/assetIndex/stories/${storyId}/generatedImages/${filename}`;
  const r = sref(storage, path);
  await uploadString(r, dataUrl, 'data_url', {
    customMetadata: {
      'narratum:storyId': storyId,
      'narratum:assetCategory': 'generatedImages',
      'narratum:source': 'ai-generated-scene',
      'displayName': filename,
    }
  });
  const https = await getDownloadURL(r);
  await setDoc(
    fsDoc(db, `users/${userId}/assetIndex/stories/${storyId}/generatedImages/${filename.replace(/\.[^.]+$/, '')}`),
    {
      url: https,
      name: filename.replace(/\.[^.]+$/, ''),
      fileName: filename,
      contentType: 'image/png',
      createdAt: serverTimestamp(),
      source: 'ai-generated-scene',
      storyId,
      role: 'cover',
    },
    { merge: true }
  );
  return { https, fullPath: r.fullPath };
}

async function normalizeScenesBeforeSave(
  userId: string | undefined,
  storyId: string,
  raw: Scene[]
): Promise<Scene[]> {
  if (!userId) return raw;
  const out: Scene[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = { ...raw[i] };
    if (typeof s.imageUrl === 'string' && s.imageUrl.startsWith('data:')) {
      const fname = s.imageName || `scene-${i + 1}-${Date.now()}.png`;
      try {
        const up = await uploadDataUrlToStorage(userId, storyId, s.imageUrl, fname);
        s.imageUrl = up.https;
        s.imageName = fname;
      } catch (err) {
        console.warn('Image upload failed during normalization; clearing image to avoid 1MB overflow.', err);
        s.imageUrl = null;
      }
    }
    out.push(s);
  }
  return out;
}

// --- YouTube helpers ---
function extractYouTubeId(raw: string | null | undefined): string | null {
  const url = (raw || '').trim();
  if (!url) return null;

  // 1) Plain IDs (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    // youtube.com/watch?v=ID
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = u.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      // /shorts/ID, /embed/ID
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex(p => p === 'shorts' || p === 'embed' || p === 'live');
      if (idx >= 0 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) {
        return parts[idx + 1];
      }
    }

    // youtu.be/ID
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    // not a URL – fall through to regex
  }

  // Last-chance regex
  const m = url.match(/(?:v=|\/shorts\/|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function youtubeEmbedUrl(id: string): string {
  // modest UI + no related vids from other channels
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}


/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ScenesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = searchParams.get('storyId') || undefined;

  const [story, setStory] = useState<StoryDoc | null>(null);
  const [readerUI, setReaderUI] = useState({ avatarUrl: DEFAULTS.avatarUrl, backgroundUrl: DEFAULTS.backgroundUrl });
  const [scenes, setScenes] = useState<Scene[]>([makeDefaultScene(0)]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // NEW: Story selection for dropdown
  const [userStories, setUserStories] = useState<StorySummary[]>([]);
  const [userStoriesLoading, setUserStoriesLoading] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | undefined>(storyId);
  const [showUncategorized, setShowUncategorized] = useState(false);
  const storySelectValue = showUncategorized ? '__UNCAT__' : (selectedStoryId || '');
  const canBrowseGallery = !!selectedStoryId || showUncategorized;

  // UI locals
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
  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // AI ideas
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideas, setIdeas] = useState<Array<{ title: string; outline: string; imagePrompt?: string }>>([]);

  // Derived
  const currentScene = scenes[currentIndex] || null;
  const langLabel = useMemo(() => LANG_LABELS[(story?.language || 'en') as LangCode] || 'English', [story?.language]);

  const currentYouTubeId = useMemo(
    () => extractYouTubeId(currentScene?.youtubeVideoUrl),
    [currentScene?.youtubeVideoUrl]
  );
  

  // Page limits
  const selectedPages = Math.max(1, Math.min((story?.pageCount ?? 10), 20));
  const progressLabel = `Scene ${Math.min(currentIndex + 1, selectedPages)} / ${selectedPages}`;

  const canManageAssets = !!selectedStoryId;

  /* -------- Gallery loader (single, sorted) -------- */
  const loadGallery = useCallback(async (category: AssetCategory) => {
    if (!user) { setGallery([]); return; }
    setLoadingGallery(true);
    try {
      const basePath = showUncategorized
        ? `users/${user.uid}/assetIndex/uncategorized/${category}/`
        : selectedStoryId
          ? `users/${user.uid}/assetIndex/stories/${selectedStoryId}/${category}/`
          : null;

      if (!basePath) { setGallery([]); return; }

      const base = sref(storage, basePath);
      const res = await listAll(base);
      const items = await Promise.all(res.items.map(async (i) => {
        const [url, meta] = await Promise.all([getDownloadURL(i), getMetadata(i).catch(() => null)]);
        return {
          name: i.name,
          fullPath: i.fullPath,
          url,
          contentType: meta?.contentType || undefined,
          size: typeof meta?.size === 'number' ? meta.size : undefined,
          meta: {
            ...(meta?.customMetadata || {}),
            createdAt: (meta as any)?.timeCreated || undefined,
          },
        } as GalleryItem;
      }));

      const sorted = [...items].sort((a, b) => {
        if (sortBy === 'name') {
          return sortDir === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        } else {
          const da = a.meta?.createdAt ? new Date(a.meta.createdAt).getTime() : 0;
          const db = b.meta?.createdAt ? new Date(b.meta.createdAt).getTime() : 0;
          return sortDir === 'asc' ? da - db : db - da;
        }
      });

      setGallery(sorted);
    } catch (e) {
      console.error('Failed to load storage gallery:', e);
      setGallery([]);
    } finally {
      setLoadingGallery(false);
    }
  }, [user, selectedStoryId, showUncategorized, sortBy, sortDir]);

  function applyIdeaToCurrent(idea: { title: string; outline: string; imagePrompt?: string }) {
    if (!currentScene) return;
  
    const mergedText = currentScene.text?.trim()
      ? `${currentScene.text.trim()}\n\n${idea.outline.trim()}`
      : idea.outline.trim();
  
    updateCurrentScene({
      title: idea.title || currentScene.title,
      text: mergedText,
    });
  
    if (idea.imagePrompt && idea.imagePrompt.trim()) {
      setImagePrompt(idea.imagePrompt.trim());
    }
  }


  /* -------- Load story + scenes from Firestore -------- */
  useEffect(() => {
    (async () => {
      if (!selectedStoryId) {
        setStory(null);
        setScenes([makeDefaultScene(0)]);
        setCurrentIndex(0);
        setReaderUI({ avatarUrl: DEFAULTS.avatarUrl, backgroundUrl: DEFAULTS.backgroundUrl });
        return;
      }
      try {
        const storyRef = fsDoc(db, 'stories', selectedStoryId);
        const snap = await getDoc(storyRef);
        let docData: StoryDoc = {};
        if (snap.exists()) docData = (snap.data() as StoryDoc) || {};

        const fixedScenes: Scene[] = (docData.scenes || [])
        .map((s, i) => ({
          id: s?.id || crypto.randomUUID(),
          index: Number.isFinite(s?.index as any) ? (s!.index as number) : i,
          title: s?.title ?? `Scene ${i + 1}`,
          text: s?.text ?? '',
          imageUrl: s?.imageUrl ?? null,
          imageName: s?.imageName ?? null,
          audioUrl: s?.audioUrl ?? null,
          audioName: s?.audioName ?? null,
          voiceId: s?.voiceId ?? null,
          durationMs: Number.isFinite(s?.durationMs as any) ? s!.durationMs! : null,
          youtubeVideoUrl: s?.youtubeVideoUrl ?? null,   // NEW
        }))
          .sort((a, b) => a.index - b.index);

        const ensured = fixedScenes.length > 0 ? fixedScenes : [makeDefaultScene(0)];

        const existingAvatar = docData.reader?.avatarUrl || DEFAULTS.avatarUrl;
        const computedAvatar = resolveAvatarForVoiceAndGenre(docData.voiceId || ensured[0]?.voiceId || voice, docData.genres);
        const finalAvatar = (existingAvatar === DEFAULTS.avatarUrl) ? computedAvatar : existingAvatar;

        setStory({
          title: docData.title || '',
          synopsis: docData.synopsis || '',
          genres: docData.genres || [],
          language: (docData.language as LangCode) || 'en',
          voiceId: docData.voiceId || undefined,
          reader: {
            avatarUrl: finalAvatar || DEFAULTS.avatarUrl,
            backgroundUrl: docData.reader?.backgroundUrl || DEFAULTS.backgroundUrl,
          },
          status: docData.status || 'draft',
          isPublic: !!docData.isPublic,
          scenes: ensured,
          pageCount: typeof docData.pageCount === 'number' ? docData.pageCount : undefined,
        });

        setReaderUI({
          avatarUrl: finalAvatar || DEFAULTS.avatarUrl,
          backgroundUrl: docData.reader?.backgroundUrl || DEFAULTS.backgroundUrl,
        });

        setScenes(ensured);

        const fromUrl = Number.parseInt(searchParams.get('scene') || '', 10);
        const fromLs  = Number.parseInt(localStorage.getItem('reader:lastScene') || '', 10);
        const initial = Number.isFinite(fromUrl) ? fromUrl : (Number.isFinite(fromLs) ? fromLs : 0);
        setCurrentIndex(Math.max(0, Math.min(initial, Math.max(ensured.length - 1, 0))));
      } catch (e) {
        console.error('Failed to load story', e);
        setScenes(prev => prev.length ? prev : [makeDefaultScene(0)]);
        setStory(prev => prev ? prev : { title: '', synopsis: '', genres: [], language: 'en' as LangCode, scenes: [makeDefaultScene(0)], pageCount: 10 });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoryId]);

  // Read ?assets=uncategorized once on mount
  useEffect(() => {
    const assets = searchParams.get('assets');
    if (assets === 'uncategorized') {
      setShowUncategorized(true);
      setSelectedStoryId(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep URL + lastScene
  useEffect(() => {
    const sp2 = new URLSearchParams(window.location.search);
    const urlStoryId = searchParams.get('storyId');
    const urlAssets  = searchParams.get('assets');
    if (urlAssets === 'uncategorized' && !showUncategorized) {
      setShowUncategorized(true);
      setSelectedStoryId(undefined);
    } else if (urlStoryId && urlStoryId !== selectedStoryId && !showUncategorized) {
      setSelectedStoryId(urlStoryId);
    }
    if (showUncategorized) {
      sp2.delete('storyId'); sp2.set('assets', 'uncategorized');
    } else if (selectedStoryId) {
      sp2.set('storyId', selectedStoryId); sp2.delete('assets');
    } else {
      sp2.delete('storyId'); sp2.delete('assets');
    }
    sp2.set('scene', String(currentIndex));
    window.history.replaceState({}, '', `?${sp2.toString()}`);
    localStorage.setItem('reader:lastScene', String(currentIndex));
  }, [currentIndex, selectedStoryId, showUncategorized, searchParams]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (showUncategorized) { sp.set('uncat', '1'); sp.delete('storyId'); }
    else { sp.delete('uncat'); if (selectedStoryId) sp.set('storyId', selectedStoryId); else sp.delete('storyId'); }
    sp.set('scene', String(currentIndex));
    window.history.replaceState({}, '', `?${sp.toString()}`);
    localStorage.setItem('reader:lastScene', String(currentIndex));
  }, [currentIndex, selectedStoryId, showUncategorized]);

  /* -------- Fetch user's stories for dropdown -------- */
  useEffect(() => {
    const fetchUserStories = async () => {
      if (!user) { setUserStories([]); return; }
      setUserStoriesLoading(true);
      try {
        const qy = query(
          collection(db, 'stories'),
          where('ownerUid', '==', user.uid),
          orderBy('updatedAt', 'desc'),
          limit(100)
        );
        const snap = await getDocs(qy);
        const storiesData: StorySummary[] = snap.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            title: d?.title || '(untitled)',
            synopsis: d?.synopsis || '',
            genres: d?.genres || [],
            category: d?.category || 'short',
            pageCount: d?.pageCount || 1,
            coverImageUrl: d?.coverImageUrl ?? null,
            updatedAt: d?.updatedAt,
          };
        });
        setUserStories(storiesData);
        if (!selectedStoryId && storiesData.length > 0) setSelectedStoryId(storiesData[0].id);
      } catch (e) {
        console.error('Failed to load user stories for dropdown in ScenesPage:', e);
      } finally {
        setUserStoriesLoading(false);
      }
    };
    fetchUserStories();
  }, [user, selectedStoryId]);

  // Load gallery whenever inputs change
  useEffect(() => {
    if (!user || (!selectedStoryId && !showUncategorized)) { setGallery([]); return; }
    void loadGallery(activeTab as AssetCategory);
  }, [user, activeTab, loadGallery, selectedStoryId, showUncategorized]);

  /* -------- Helpers to update local state -------- */
  function updateCurrentScene(patch: Partial<Scene>) {
    setScenes(prev => {
      const next = [...prev];
      if (!next[currentIndex]) next[currentIndex] = makeDefaultScene(currentIndex);
      next[currentIndex] = { ...next[currentIndex], ...patch };
      return next;
    });
  }
  function updateStoryPatch(patch: Partial<StoryDoc>) {
    setStory(prev => (prev ? { ...prev, ...patch } : prev));
  }
  function applyVoiceAvatarUpdate(newVoice: string) {
    const avatarPath = resolveAvatarForVoiceAndGenre(newVoice, story?.genres);
    setVoice(newVoice);
    setReaderUI(prev => ({ ...prev, avatarUrl: avatarPath }));
    updateStoryPatch({ reader: { avatarUrl: avatarPath, backgroundUrl: story?.reader?.backgroundUrl || DEFAULTS.backgroundUrl } });
  }

  /* -------- Select/Describe/Reference -------- */
  const canDescribeSelected = (item: GalleryItem) => inferKindFromPath(item.fullPath, item.contentType) === 'image';

  async function handleDescribe(item: GalleryItem) {
    try {
      if (!canDescribeSelected(item)) return;
      const lang = (story?.language || 'en') as LangCode;
      const langLabel2 = LANG_LABELS[lang] || 'English';
      const promptText =
        lang === 'es'
          ? 'Describe esta imagen en un solo párrafo claro y conciso...'
          : `Describe this image in one clear, concise paragraph... Respond only in ${langLabel2}.`;
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
    if (kind === 'image') updateCurrentScene({ imageUrl: item.url, imageName: item.name });
    else if (kind === 'audio') updateCurrentScene({ audioUrl: item.url, audioName: item.name });
    else alert('Only image or audio can be selected directly for a scene.');
  }

  const [references, setReferences] = useState<Array<{ url: string; name?: string; category?: AssetCategory }>>([]);
  function handleUseAsReference(item: GalleryItem) {
    setReferences(prev => [...prev, { url: item.url, name: item.name, category: activeTab as AssetCategory }]);
  }

  /* -------- AI: Generate Image -------- */
  const handleGenerateImage = useCallback(async () => {
    if (!selectedStoryId) { alert('Please select an active story from the dropdown to generate an image.'); return; }
    if (!story) return;
    if (!imagePrompt.trim() && !story.synopsis && !(story.genres?.length)) {
      alert('Please write an image description or fill the story synopsis/genres on the Begin page.');
      return;
    }
    setIsGenImage(true);
    try {
      const { prompt, negativePrompt } = composePromptForImagen(imagePrompt, {
        title: story.title, genres: story.genres, synopsis: story.synopsis, language: story.language,
      });
      const refNames = (references || []).map(r => r.name).filter(Boolean);
      const promptWithRefs = refNames.length ? `${prompt}\nVISUAL REFERENCES (soft influence): ${refNames.join(', ')}.` : prompt;

      const r = await fetch('/api/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptWithRefs, negativePrompt, count: 1, storyId: selectedStoryId }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || 'Image generation failed');
      const { dataUrl } = extractImageAndModel(json);
      if (!dataUrl) throw new Error('No image returned by generator.');

      if (!user) throw new Error('You must be signed in to save generated images.');
      const fname = `scene-${currentIndex + 1}-${Date.now()}.png`;
      const uploaded = await uploadDataUrlToStorage(user.uid, selectedStoryId, dataUrl, fname);
      updateCurrentScene({ imageUrl: uploaded.https, imageName: fname });
    } catch (e: any) {
      alert(e?.message || 'Image generation error');
    } finally {
      setIsGenImage(false);
    }
  }, [story, imagePrompt, references, currentIndex, user, selectedStoryId]);

  /* -------- AI: Suggest -------- */
  async function handleSuggestForScene() {
    if (!selectedStoryId) { alert('Please select an active story from the dropdown to get scene suggestions.'); return; }
    if (!story) return;
    setIsSuggesting(true);
    try {
      const payload = {
        title: story.title, genres: story.genres, synopsis: story.synopsis,
        language: story.language, sceneIndex: currentIndex + 1, storyId: selectedStoryId,
      };
      const res = await fetch('/api/suggest-scene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Suggestion failed');
      if (json?.storyText) updateCurrentScene({ text: json.storyText });
      if (json?.imagePrompt) setImagePrompt(json.imagePrompt);
      if (!json?.storyText && !json?.imagePrompt) throw new Error('No suggestions returned.');
    } catch (e: any) {
      alert(e?.message || 'Suggest failed');
    } finally {
      setIsSuggesting(false);
    }
  }

  /* -------- AI: Outline Ideas -------- */
  async function handleGenerateIdeas() {
    if (!selectedStoryId) { alert('Please select an active story from the dropdown to generate outline ideas.'); return; }
    if (!story) return;
    setIdeasLoading(true);
    setIdeas([]);
    try {
      const res = await fetch('/api/generate-scene-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: story.synopsis || story.title || 'Story', pages: selectedPages, language: story.language || 'en', storyId: selectedStoryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'AI outline endpoint failed');
      const arr = Array.isArray(data) ? data : [];
      const mapped = arr.map((p: any, i: number) => ({ title: `Beat ${i + 1}`, outline: String(p?.storyText || '').trim(), imagePrompt: String(p?.imagePrompt || '').trim() }));
      setIdeas(mapped);
    } catch (e: any) {
      alert(e?.message || 'Could not generate ideas.');
    } finally {
      setIdeasLoading(false);
    }
  }

  /* -------- AUDIO player -------- */
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const autoplayUnlockedRef = React.useRef(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const src = currentScene?.audioUrl || '';
    if (!src) {
      setIsPlaying(false); setDuration(0); setCurrentTime(0);
      el.removeAttribute('src'); el.load();
      return;
    }
    el.src = src; el.load();
    if (autoplayUnlockedRef.current) el.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [currentScene?.audioUrl, currentIndex]);

  useEffect(() => {
    const next = scenes[currentIndex + 1];
    if (!next?.audioUrl) return;
    const link = document.createElement('link'); link.rel = 'prefetch'; link.as = 'audio'; link.href = next.audioUrl;
    document.head.appendChild(link);
    return () => { if (link.parentNode) link.parentNode.removeChild(link); };
  }, [currentIndex, scenes]);

  useEffect(() => {
    const el = audioRef.current; if (!el) return;
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
  function onPause() { audioRef.current?.pause(); setIsPlaying(false); }

  /* -------- NAV + SAVE/PUBLISH ---------------------------------- */
  function goPrev() { setCurrentIndex(i => Math.max(0, i - 1)); }
  function goNext() { setCurrentIndex(i => Math.min(scenes.length - 1, i + 1)); }

  const readerHref = selectedStoryId
    ? `/ereader?storyId=${encodeURIComponent(selectedStoryId)}&back=%2Fcreate%2Fscenes`
    : '#';

  async function persistScenes(nextScenes: Scene[]) {
    if (!selectedStoryId) { alert('Please select a story before saving scenes.'); return false; }
    try {
      const normalized = await normalizeScenesBeforeSave(user?.uid, selectedStoryId, nextScenes);
      const storyRef = fsDoc(db, 'stories', selectedStoryId);
      const safeDoc = serializeStoryForWrite(story, normalized);
      await setDoc(storyRef, safeDoc, { merge: true });
      return true;
    } catch (e: any) {
      console.error('Save error:', e);
      alert(`Failed to save scene.\n\n${e?.message || ''}`);
      return false;
    }
  }

  async function handleSaveScene() {
    const clipped = scenes.slice(0, selectedPages).map((s, i) => ({ ...s, index: i }));
    const ok = await persistScenes(clipped);
    if (ok) alert('Scene saved.');
  }

  async function handleSaveSceneAndNext() {
    let nextScenes = scenes.slice(0, selectedPages).map((s, i) => ({ ...s, index: i }));
    const onLastExisting = currentIndex === nextScenes.length - 1;
    const canAddMore = nextScenes.length < selectedPages;
    if (onLastExisting && canAddMore) {
      const newIdx = nextScenes.length;
      nextScenes = [...nextScenes, makeDefaultScene(newIdx)];
    }
    const ok = await persistScenes(nextScenes);
    if (!ok) return;
    setScenes(nextScenes);
    if (onLastExisting && canAddMore) setCurrentIndex(i => Math.min(i + 1, nextScenes.length - 1));
    else if (currentIndex < nextScenes.length - 1) setCurrentIndex(i => i + 1);
    else alert('Reached selected page limit.');
  }

  async function handlePublishStory() {
    if (!selectedStoryId) { alert('Please select a story before publishing.'); return; }
    try {
      const storyRef = fsDoc(db, 'stories', selectedStoryId);
      await updateDoc(storyRef, { status: 'published', isPublic: true, publishedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      alert('Story published! It will now appear in Discovery and your Profile.');
    } catch (e) {
      console.error(e);
      alert('Failed to publish story.');
    }
  }

  /* -------- Keyboard nav ------------------------------------ */
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

  function SceneStrip() {
    const slots = Array.from({ length: selectedPages }, (_, i) => scenes[i] || null);
    return (
      <div className="w-full overflow-x-auto">
        <div className="flex gap-2 py-2">
          {slots.map((sc, i) => {
            const isActive = i === currentIndex;
            const hasImg = !!sc?.imageUrl;
            const hasAudio = !!sc?.audioUrl;
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={classNames(
                  'min-w-[90px] max-w-[110px] shrink-0 rounded-lg border p-1 text-[11px] text-left',
                  isActive ? 'border-[#E97451] ring-2 ring-[#E97451]/40 bg-white' : 'border-[#3D4F60]/20 bg-white/70',
                )}
                title={sc?.title || `Scene ${i + 1}`}
              >
                <div className="relative h-16 w-full rounded overflow-hidden bg-zinc-100 grid place-items-center">
                  {hasImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sc!.imageUrl!} alt={`S${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center gap-1 text-zinc-500">
                      <ImgIcon size={14} /> No image
                    </div>
                  )}
                  <div className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
                    {i + 1}/{selectedPages}
                  </div>
                  {hasAudio && (
                    <div className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 rounded inline-flex items-center gap-1">
                      <Volume2 size={12} /> MP3/WAV
                    </div>
                  )}
                </div>
                <div className="mt-1 line-clamp-1">{sc?.title || `Scene ${i + 1}`}</div>
              </button>
            );
          })}
          {scenes.length < selectedPages && (
            <button
              onClick={() => {
                setScenes(prev => {
                  if (prev.length >= selectedPages) return prev;
                  const idx = prev.length;
                  return [...prev, makeDefaultScene(idx)];
                });
                setCurrentIndex(scenes.length);
              }}
              className="min-w-[90px] max-w-[110px] shrink-0 rounded-lg border border-dashed p-1 grid place-items-center text-[11px] text-zinc-600 bg-white/60"
              title="Add new scene"
            >
              <PlusCircle className="w-5 h-5" />
              Add scene
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
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
            <span className="ml-3 text-xs opacity-70 px-2 py-1 rounded bg-white/60 border">{progressLabel}</span>

            {/* Story Selector */}
            <div className="flex items-center gap-2 ml-4">
              <label htmlFor="scene-story-selector" className="text-sm font-semibold whitespace-nowrap hidden sm:inline">
                Story:
              </label>
              <select
                id="scene-story-selector"
                className="p-1.5 rounded-md border-2 text-sm bg-white text-slate-900 border-slate-300 dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]"
                value={storySelectValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__UNCAT__') { setShowUncategorized(true); setSelectedStoryId(undefined); }
                  else { setShowUncategorized(false); setSelectedStoryId(v || undefined); }
                }}
                disabled={userStoriesLoading}
              >
                <option value="">{userStoriesLoading ? 'Loading stories...' : 'Select a story...'}</option>
                <option value="__UNCAT__">All Uncategorized Assets</option>
                {userStories.map((s) => (
                  <option key={s.id} value={s.id}>{s.title || '(untitled)'}</option>
                ))}
              </select>
              {showUncategorized ? (
                <span className="text-xs ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                  Viewing Uncategorized
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/create/begin" className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20">Begin</Link>
            <Link href={selectedStoryId ? `/create/support?storyId=${selectedStoryId}` : '/create/support'} className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20">Support</Link>
            <span className="text-xs px-3 py-1.5 rounded-lg bg-[#E97451] text-white">Scenes</span>
          </div>
        </div>
      </header>

      {/* Workspace */}
      <main className="mx-auto max-w-6xl px-4 pb-40">
        <div className="min-h-[calc(100vh-140px)] overflow-y-auto py-6">

          {/* Top actions */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/60 dark:bg-[#0f1620]/60 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-[#3D4F60]/30 dark:border-[#4B5A6B]/30 bg-white dark:bg-[#0e1520] px-3 py-2 text-sm"
                placeholder="Story title"
                value={story?.title || ''}
                onChange={(e) => updateStoryPatch({ title: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goPrev} disabled={currentIndex <= 0} className="rounded-lg border px-3 py-2 text-sm bg-white/70 dark:bg-[#1A2533] disabled:opacity-50">← Previous</button>
              <button onClick={goNext} disabled={currentIndex >= Math.max(0, scenes.length - 1)} className="rounded-lg border px-3 py-2 text-sm bg-white/70 dark:bg-[#1A2533] disabled:opacity-50">Next →</button>

              <button onClick={handleSaveScene} disabled={!canManageAssets} className="rounded-lg border border-emerald-600/60 bg-emerald-600/20 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-50">
                Save Scene
              </button>
              <button onClick={handleSaveSceneAndNext} disabled={!canManageAssets} className="rounded-lg border border-teal-600/60 bg-teal-600/20 px-3 py-2 text-sm text-teal-900 dark:text-teal-200 hover:bg-teal-600/30 disabled:opacity-50">
                Save Scene & Next
              </button>

              <Link href={readerHref} className={classNames(
                'rounded-lg border border-indigo-600/60 bg-indigo-600/20 px-3 py-2 text-sm',
                canManageAssets ? 'text-indigo-900 dark:text-indigo-200 hover:bg-indigo-600/30' : 'opacity-60 pointer-events-none text-indigo-900 dark:text-indigo-200'
              )}>
                Preview Story
              </Link>
              <button onClick={handlePublishStory} disabled={!canManageAssets} className="rounded-lg border border-amber-600/60 bg-amber-600/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 hover:bg-amber-600/30 disabled:opacity-50">
                Publish
              </button>
            </div>
          </div>

          {/* Scene strip */}
          <div className="mb-4 rounded-2xl border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/70 dark:bg-[#0f1620]/70 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Scenes</h3>
              <div className="text-xs opacity-70">Selected pages: <strong>{selectedPages}</strong></div>
            </div>
            <SceneStrip />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT */}
            <section className="space-y-4">
              {/* Preview */}
              <div
                className="rounded-2xl overflow-hidden border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20"
                style={{ backgroundImage: `url(${readerUI.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <div className="backdrop-blur bg-white/60 dark:bg-[#0f1620]/60 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Story Preview</h2>
                    <div className="text-xs opacity-70">{progressLabel}</div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Image src={readerUI.avatarUrl || DEFAULTS.avatarUrl} alt="Narrator Avatar" width={36} height={36} className="rounded-full border border-black/10 bg-white" />
                    <div className="text-xs opacity-80">
                      <span className="font-medium">{voice}</span> • <span>{tone.replace(/^a[n]? /, '').toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-white/60 dark:bg-[#0f1620]/60 grid place-items-center">
                    {currentScene?.imageUrl ? (
                      <Image src={currentScene.imageUrl} alt={currentScene?.imageName ?? 'scene image'} width={1024} height={768} className="w-full h-full object-cover" priority />
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
                      disabled={isGenImage || !canManageAssets}
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
                      onChange={e => applyVoiceAvatarUpdate(e.target.value)}
                    >
                      <option value="Nuna">Nuna (Female, Firm)</option>
                      <option value="Puck">Scythe (Male, Upbeat)</option>
                      <option value="Zephyr">Belle (Female, Youthful)</option>
                      <option value="en-IN-Chirp3-HD-Achird">Raj (Male, Scholar)</option>
                      <option value="Juniper">Juniper (Female, Elegant)</option>
                      <option value="Argus">Argus (Male, Mysterious)</option>
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
                        const base = (narrationText || currentScene?.text || '').trim();
                        if (!canManageAssets) { alert('Please select an active story from the dropdown to generate narration.'); return; }
                        if (!base || !currentScene) { alert('Enter narration text first.'); return; }
                        setIsGenAudio(true);
                        try {
                          const lang = (story?.language || 'en') as LangCode;
                          const { ssml, style } = buildSSML(base, tone, lang);
                          const r = await fetch('/api/generate-audio', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              text: base, ssml, useSsml: true, voice, tone, style, toneHint: `[TONE=${tone}]`,
                              language: lang, model: 'gemini-2.5-flash-preview-tts', format: 'auto',
                              storyId: selectedStoryId, userId: user.uid, sceneIndex: currentIndex + 1,
                            }),
                          });
                          const json = await r.json();
                          if (!r.ok) throw new Error(json?.error || 'TTS failed');
                          if (!json?.audioUrl) throw new Error('No audioUrl returned by TTS route.');
                          updateCurrentScene({ audioUrl: json.audioUrl, audioName: `scene-${currentIndex + 1}-narration`, voiceId: voice });
                        } catch (e: any) {
                          alert((e?.message || 'TTS failed') + '\n\nTip: ensure /api/generate-audio reads { ssml, tone, style, toneHint } to bias delivery.');
                        } finally {
                          setIsGenAudio(false);
                        }
                      }}
                      disabled={isGenAudio || !canManageAssets}
                      className="px-4 py-2 rounded-md bg-[#3D4F60] text-white disabled:opacity-60"
                    >
                      {isGenAudio ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                      {currentScene?.audioUrl ? 'Re-generate Narration (AI)' : 'Generate Narration (AI)'}
                    </button>
                    {currentScene?.audioUrl && (
                      <a href={currentScene.audioUrl} className="px-4 py-2 rounded-md border" download>
                        Download
                      </a>
                    )}
                  </div>
                </div>
              </div>

                {/* YouTube Video URL input + preview */}
                <div className="rounded-2xl border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/70 dark:bg-[#0f1620]/70 shadow-sm p-3 space-y-2">
                  <label className="text-xs font-semibold">YouTube Video URL</label>
                  <input
                    type="url"
                    value={currentScene?.youtubeVideoUrl || ''}
                    onChange={(e) => updateCurrentScene({ youtubeVideoUrl: e.target.value })}
                    placeholder="Paste a YouTube link for this scene (e.g. https://youtu.be/XXXXXXXXXXX)…"
                    className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm"
                  />

                  {/* Live preview */}
                  {currentYouTubeId ? (
                    <div className="mt-2 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black">
                      <div className="aspect-[16/9] w-full">
                        <iframe
                          key={currentYouTubeId} // force refresh if ID changes
                          src={youtubeEmbedUrl(currentYouTubeId)}
                          title="YouTube preview"
                          loading="lazy"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] opacity-70">
                      Supports full URLs (<code className="font-mono">youtube.com/watch?v=…</code>, <code className="font-mono">youtu.be/…</code>, <code className="font-mono">/shorts/…</code>) or a raw 11-char video ID.
                    </p>
                  )}
                </div>


              {/* AI ideas */}
              <div className="rounded-2xl border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/70 dark:bg-[#0f1620]/70 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Scene-Outline Ideas (AI)</h3>
                  <button
                    onClick={handleGenerateIdeas}
                    disabled={ideasLoading || !canManageAssets}
                    className="rounded-lg border border-fuchsia-600/60 bg-fuchsia-600/20 px-3 py-2 text-xs text-fuchsia-900 dark:text-fuchsia-200 hover:bg-fuchsia-600/30 disabled:opacity-50"
                  >
                    {ideasLoading ? 'Generating…' : 'Generate ideas'}
                  </button>
                </div>
                {ideas.length === 0 && !ideasLoading && (
                  <p className="text-xs opacity-70">Click “Generate ideas” to get scene beats you can insert or add as new scenes.</p>
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
                          onClick={() => {
                            setScenes(prev => {
                              if (prev.length >= selectedPages) return prev;
                              const next = [...prev, { id: typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : String(Math.random()).slice(2), index: prev.length, title: idea.title || `Scene ${prev.length + 1}`, text: idea.outline, imageUrl: null, imageName: null, audioUrl: null, audioName: null, voiceId: null, durationMs: null }];
                              return next;
                            });
                          }}
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

            {/* RIGHT – My Gallery */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">My Gallery</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="opacity-70">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                  </select>
                  <button
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                    className="p-1 rounded border"
                    title="Toggle sort direction"
                  >
                    {sortDir === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
                  </button>
                </div>
              </div>

              <div className="text-xs opacity-70">AI language: <strong>{langLabel}</strong></div>

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
                    <Info className="w-4 h-4" />
                    {showUncategorized
                      ? 'No uncategorized files found.'
                      : `No files yet for this story in ${GALLERY_TABS.find(x => x.key === activeTab)?.label}.`
                    }
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
                          {/* Size badge */}
                          {typeof it.size === 'number' && (
                            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                              {formatBytes(it.size)}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            {kind === 'image' ? (
                              <>
                                <button onClick={() => handleDescribe(it)} className="flex-1 text-[11px] px-2 py-1 rounded bg-blue-500/90 text-white" title="AI Describe">
                                  Describe
                                </button>
                                <button onClick={() => handleUseAsReference(it)} className="flex-1 text-[11px] px-2 py-1 rounded bg-zinc-800/90 text-white" title="Use as Reference">
                                  Reference
                                </button>
                                <button onClick={() => handleSelectForScene(it)} className="flex-1 text-[11px] px-2 py-1 rounded bg-[#E97451]/90 text-white" title="Select for Scene">
                                  Select
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleSelectForScene(it)} className="w-full text-[11px] px-2 py-1 rounded bg-[#E97451]/90 text-white" title="Select for Scene (Audio)">
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

      {/* Footer */}
      <footer className="sticky bottom-0 z-30 border-t border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="text-xs opacity-70">
            {progressLabel} • Use <span className="font-medium">Auto-Suggest</span>, <span className="font-medium">Generate Image</span>, and <span className="font-medium">Generate Narration</span>.
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20 disabled:opacity-50" disabled={currentIndex <= 0}>
              Prev
            </button>
            <button onClick={goNext} className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20 disabled:opacity-50" disabled={currentIndex >= Math.max(0, scenes.length - 1)}>
              Next
            </button>

            <button onClick={handleSaveScene} disabled={!canManageAssets} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 border-2 border-emerald-600/40 text-emerald-900 dark:text-emerald-200 disabled:opacity-50">
              Save Scene
            </button>
            <button onClick={handleSaveSceneAndNext} disabled={!canManageAssets} className="text-xs px-3 py-1.5 rounded-lg bg-teal-600/20 border-2 border-teal-600/40 text-teal-900 dark:text-teal-200 disabled:opacity-50">
              Save Scene & Next
            </button>

            <Link href={readerHref} className={classNames(
              'text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-[#3D4F60]/20 dark:bg-[#1A2533] dark:border-[#4B5A6B]/20',
              canManageAssets ? '' : 'opacity-60 pointer-events-none'
            )}>
              Preview
            </Link>
            <button onClick={handlePublishStory} disabled={!canManageAssets} className="text-xs px-3 py-1.5 rounded-lg bg-amber-600/20 border-2 border-amber-600/40 text-amber-900 dark:text-amber-200 disabled:opacity-50">
              Publish
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
function formatBytes(n?: number) {
  if (!n && n !== 0) return '';
  const k = 1024;
  const sizes = ['B','KB','MB','GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(Math.max(n,1)) / Math.log(k)));
  const val = n / Math.pow(k, i);
  return `${val >= 10 || i === 0 ? Math.round(val) : val.toFixed(1)} ${sizes[i]}`;
}
