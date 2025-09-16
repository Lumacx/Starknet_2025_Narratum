// src/app/create/support/page.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UploadImageReference from '@/components/UploadImageReference';
import { ImageIcon, MapPin, User, Music, Wand2, Film, Loader2, ArrowUpDown, ChevronDown } from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────────
// Re-using or adapting from src/app/create/begin/page.tsx
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
// ────────────────────────────────────────────────────────────────────────────────

// 🔹 Firestore (para leer contexto de la historia y lista de historias)
import { db } from '@/lib/firebase';
import {
  doc as fsDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import InfoPopover from '@/components/InfoPopover';

/* --- LOGIC MOVED HERE from UploadImageReference --- */
function extractImageAndModel(json: any): { dataUrl?: string; modelUsed?: string } {
  if (Array.isArray(json?.images) && json.images.length) {
    const first = json.images[0];
    const dataUrl =
      typeof first === 'string'
        ? first.startsWith('data:')
          ? first
          : `data:image/png;base64,${first}`
        : undefined;
    return { dataUrl, modelUsed: json.modelUsed || json.model || json.modelName };
  }
  if (typeof json?.imageBase64 === 'string') {
    return {
      dataUrl: `data:image/png;base64,${json.imageBase64}`,
      modelUsed: json.modelUsed || json.model,
    };
  }
  return {};
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
  return out;
}

function composePromptForImagen(
  userPrompt: string,
  ctx?: { title?: string; genres?: string[]; synopsis?: string; language?: string }
) {
  const lines: string[] = [];
  lines.push(
    `Use ${ctx?.language || 'English'} to interpret all descriptive concepts. Do not render any textual characters in the image.`
  );
  lines.push(
    'Create a professional, illustration-style image (no text). Use a single striking composition with a clear focal subject, cinematic lighting, and a cohesive palette.'
  );
  if (ctx?.synopsis) lines.push(`PRIMARY GUIDANCE (Story Synopsis — highest priority): ${ctx.synopsis}`);
  if (ctx?.genres?.length) {
    const desc = genreDescriptors(ctx.genres);
    lines.push(
      `SECONDARY GUIDANCE (Genre atmosphere): ${ctx.genres.join(', ')}.` +
        (desc.length ? ` Visual tone cues: ${desc.join('; ')}.` : '')
    );
  }
  if (userPrompt) lines.push(`TERTIARY GUIDANCE (Additional creative direction): ${userPrompt}`);
  if (ctx?.title)
    lines.push(`LIGHT INFLUENCE (Title motif — do NOT add text): ${ctx.title}. Use it only as thematic inspiration.`);
  const negativesBase =
    'text, watermark, logo, low-res, blurry, jpeg artifacts, malformed anatomy, extra limbs, cropped face';
  return { prompt: lines.join('\n'), negativePrompt: negativesBase };
}
/* --- END OF MOVED LOGIC --- */

/* -------------------------------- Types ------------------------------- */
type TabKey = 'characters' | 'locations' | 'audioNarrations' | 'audioEffects' | 'videos';

const TABS: Array<{
  key: TabKey;
  label: string;
  blurb: string;
  icon: React.ComponentType<any>;
  variant: 'character' | 'location' | 'cover';
}> = [
  { key: 'characters',      label: 'Characters',        blurb: 'Reference images for your cast.', icon: User,   variant: 'character' },
  { key: 'locations',       label: 'Locations',         blurb: 'Places, worlds, scenes.',         icon: MapPin, variant: 'location' },
  { key: 'audioNarrations', label: 'Narrations (MP3)',  blurb: 'Voice lines or narration.',       icon: Music,  variant: 'cover'     },
  { key: 'audioEffects',    label: 'Sound FX (MP3)',    blurb: 'Ambient or effect sounds.',       icon: Wand2,  variant: 'cover'     },
  { key: 'videos',          label: 'Videos (MP4)',      blurb: 'Clips or motion shots.',          icon: Film,   variant: 'cover'     },
];

type LangCode =
  | 'en' | 'es' | 'pt' | 'fr' | 'de'
  | 'it' | 'ja' | 'ko' | 'zh' | 'hi' | 'ar';

type PromptContext = {
  title: string;
  genres: string[];
  synopsis: string;
  language: LangCode;
};

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German',
  it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic',
};

const DRAFT_KEY = 'newStoryDraft';

type MediaKind = 'image' | 'audio' | 'video' | 'youtube' | 'unknown';

/* ------------------------------ Utils -------------------------------- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}
const isImageTab = (k: TabKey) => k === 'characters' || k === 'locations';

function inferKind(url?: string, contentType?: string): MediaKind {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.startsWith('video/')) return 'video';

 const u = (url || '').trim();
  if (!u) return 'unknown';

  // YouTube detection
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
      return 'youtube';
    }
  } catch {
    // if it's a data: URL, handle separately
  }

  // Fallback by extension / data URL
  try {
    const pathname = new URL(u).pathname.toLowerCase();
    if (/\.(png|jpe?g|gif|webp)$/.test(pathname)) return 'image';
    if (/\.(mp3)$/.test(pathname)) return 'audio';
    if (/\.(mp4)$/.test(pathname)) return 'video';
  } catch {
    if (u.startsWith('data:image/')) return 'image';
    if (u.startsWith('data:audio/')) return 'audio';
    if (u.startsWith('data:video/')) return 'video';
  }
  return 'unknown';
}

// ── NEW: YouTube helpers ─────────────────────────────────────────────
function getYouTubeId(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl.trim());
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      // https://youtu.be/<id>
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      // https://youtube.com/watch?v=<id> or /embed/<id> or /shorts/<id>
      if (u.pathname.startsWith('/watch')) {
        const id = u.searchParams.get('v');
        return id || null;
      }
      if (u.pathname.startsWith('/embed/')) {
        const id = u.pathname.split('/')[2];
        return id || null;
      }
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2];
        return id || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function toYouTubeEmbedUrl(rawUrl: string): string | null {
  const id = getYouTubeId(rawUrl);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function toYouTubeThumb(rawUrl: string): string | null {
  const id = getYouTubeId(rawUrl);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// Normalize common “share” links into a canonical watch URL
function normalizeYouTubeUrl(rawUrl: string): string | null {
  const id = getYouTubeId(rawUrl);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

async function urlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ============================== Component ============================== */
export default function SupportPage() {
  const { user, loading } = useAuth();
  const search = useSearchParams();
  const router = useRouter();

  const storyId = search.get('storyId') || undefined;

  // Existing context state
  const [context, setContext] = useState<PromptContext>({
    title: '',
    genres: [],
    synopsis: '',
    language: 'en',
  });
  const langLabel = LANG_LABELS[context.language] || 'English';

  // NEW: list of user stories + selection
  const [userStories, setUserStories] = useState<StorySummary[]>([]);
  const [userStoriesLoading, setUserStoriesLoading] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | undefined>(storyId); // primary source of truth

  // NEW: toggle to show uncategorized assets
  const [showUncategorized, setShowUncategorized] = useState(false);

  // Helper: single source for the <select> value
  const storySelectValue = showUncategorized ? '__UNCAT__' : (selectedStoryId || '');

  // 🔽🔽 NEW — Sort & Pagination controls (mirrors Begin/Page) 🔽🔽
  type SortField = 'name' | 'createdAt' | 'updatedAt';
  type SortDir = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>(
    (search.get('sortField') as SortField) || 'updatedAt'
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    (search.get('sortDir') as SortDir) || 'desc'
  );
  const [pageSize, setPageSize] = useState<number>(
    Number(search.get('pageSize')) || 24
  );

  // A bump value to force remount of gallery on changes (resets internal pagination)
  const [galleryResetTick, setGalleryResetTick] = useState(0);

  const triggerGalleryReset = useCallback(() => {
    setGalleryResetTick(t => t + 1);
  }, []);

  // fetch story context (title/genres/synopsis/lang) based on selectedStoryId
  useEffect(() => {
    (async () => {
      if (!user || !selectedStoryId) return;
      try {
        const ref = fsDoc(db, 'stories', selectedStoryId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const s = snap.data() as any;
        let langFromDoc = s?.language as LangCode | undefined;
        if (!langFromDoc) {
          try {
            const raw = localStorage.getItem(DRAFT_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            langFromDoc = (parsed?.language as LangCode) || 'en';
          } catch {}
        }
        setContext(prev => ({
          ...prev,
          title: s?.title || prev.title,
          genres: Array.isArray(s?.genres) ? s.genres : prev.genres,
          synopsis: s?.synopsis || prev.synopsis,
          language: (langFromDoc || prev.language) as LangCode,
        }));
      } catch (e) {
        console.error('Failed to fetch story for context', e);
      }
    })();
  }, [user, selectedStoryId]);

  // NEW: fetch list of user stories for dropdown
  useEffect(() => {
    const fetchUserStories = async () => {
      if (!user) {
        setUserStories([]);
        return;
      }
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

        if (!selectedStoryId && storiesData.length > 0 && !showUncategorized) {
          setSelectedStoryId(storiesData[0].id);
        }
      } catch (e) {
        console.error('Failed to load user stories for dropdown:', e);
      } finally {
        setUserStoriesLoading(false);
      }
    };

    fetchUserStories();
  }, [user, selectedStoryId, showUncategorized]);

  const initialKey =
    (search.get('tab') as TabKey) ||
    (typeof window !== 'undefined' ? (localStorage.getItem('supportTab') as TabKey) : undefined) ||
    'characters';
  const [active, setActive] = useState<TabKey>(initialKey);
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const [displayContentType, setDisplayContentType] = useState<string | undefined>(undefined);
  const [desc, setDesc] = useState('');
  const [descLoading, setDescLoading] = useState(false);
  const [descError, setDescError] = useState('');

  // ▼▼ For image combination ▼▼
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [composerPrompt, setComposerPrompt] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [lastModelUsed, setLastModelUsed] = useState<string>('');
  // generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrlForChild, setGeneratedImageUrlForChild] = useState('');

  const acceptByTab: Record<TabKey, string | undefined> = {
    characters:      'image/png,image/jpeg',
    locations:       'image/png,image/jpeg',
    audioNarrations: 'audio/mpeg,audio/mp3',
    audioEffects:    'audio/mpeg,audio/mp3',
    videos:          undefined, // now handled by YouTube link form
  };

  // NEW: YouTube link capture
  const [ytUrl, setYtUrl] = useState('');
  const [ytName, setYtName] = useState('');
  const [savingYt, setSavingYt] = useState(false);
  const ytValid = !!normalizeYouTubeUrl(ytUrl);


  // NEW: Sync URL <-> selectedStoryId and other resets
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.set('tab', active);

    // Reflect selector state into URL:
    if (showUncategorized) {
      params.set('assets', 'uncategorized');
      params.delete('storyId');
    } else if (selectedStoryId) {
      params.set('storyId', selectedStoryId);
      params.delete('assets');
    } else {
      params.delete('storyId');
      params.delete('assets');
    }

    // Reflect sort + pagination in URL too
    params.set('sortField', sortField);
    params.set('sortDir', sortDir);
    params.set('pageSize', String(pageSize));

    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);

    localStorage.setItem('supportTab', active);

    // resets
    setDisplayUrl('');
    setDisplayContentType(undefined);
    setDesc('');
    setDescError('');
    setDescLoading(false);
    setGeneratedImageUrlForChild('');
    setLastModelUsed('');
  }, [active, selectedStoryId, showUncategorized, sortField, sortDir, pageSize]);

  useEffect(() => {
    if (!TABS.some((t) => t.key === active)) setActive('characters');
  }, [active]);

  const activeTab = useMemo(() => TABS.find((t) => t.key === active)!, [active]);
  const kind: MediaKind = inferKind(displayUrl, displayContentType);
  const canDescribeSelected = isImageTab(activeTab.key) && kind === 'image' && !!displayUrl;
  const memoizedPromptContext = useMemo(
    () => ({
      title: context.title,
      genres: context.genres,
      synopsis: context.synopsis,
      language: context.language,
    }),
    [context.title, context.genres, context.synopsis, context.language]
  );

  const handleSaved = useCallback((item: { url?: string; contentType?: string } | undefined) => {
    const u = item?.url;
    if (!u) return;
    setDisplayUrl(u);
    setDisplayContentType(item?.contentType);
    setDesc('');
    setDescError('');
  }, []);

  // NEW: guard requires active story + prompt; uses selectedStoryId
  const handleGenerateRequest = async (userPrompt: string) => {
    if (!showUncategorized && !selectedStoryId) {
      alert('Select a story or choose "All Uncategorized Assets" to generate an image.');
      return;
    }
    if (!userPrompt.trim()) {
      alert('Please enter a description to generate an image.');
      return;
    }
    setIsGenerating(true);
    setGeneratedImageUrlForChild('');

    try {
      const { prompt, negativePrompt } = composePromptForImagen(userPrompt, memoizedPromptContext);
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          count: 1,
          // Pass undefined to mean "uncategorized"
          storyId: showUncategorized ? undefined : selectedStoryId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'AI image generation failed');

      const { dataUrl, modelUsed } = extractImageAndModel(json);
      setLastModelUsed(modelUsed || 'Unknown');

      if (!dataUrl) throw new Error('No image was returned by the generator.');
      setGeneratedImageUrlForChild(dataUrl);
      handleSaved({ url: dataUrl, contentType: 'image/png' });
    } catch (e: any) {
      alert(e?.message || 'Image generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  async function handleDescribeSelected() {
    if (!canDescribeSelected) return;
    setDescError('');
    setDesc('');
    setDescLoading(true);
    try {
      const body = displayUrl.startsWith('data:') ? { dataUrl: displayUrl } : { imageUrl: displayUrl };
      const lang = (context.language || 'en') as LangCode;
      const langLabel = LANG_LABELS[lang] || 'English';
      const promptText =
        lang === 'es'
          ? 'Describe esta imagen en un solo párrafo claro y conciso...'
          : `Describe this image in one clear, concise paragraph... Respond only in ${langLabel}.`;
      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          prompt: promptText,
          language: lang,
          targetLanguage: lang,
          context: { title: context.title, genres: context.genres, synopsis: context.synopsis },
          responseModalities: ['TEXT'],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Describe failed');
      setDesc(json.description || '');
    } catch (e: any) {
      setDescError(e?.message || 'Describe failed');
    } finally {
      setDescLoading(false);
    }
  }

  // NEW: guard requires active story; uses selectedStoryId
  const handleSceneGeneration = async () => {
    if (!showUncategorized && !selectedStoryId) {
      alert('Select a story or choose "All Uncategorized Assets" to generate a scene.');
      return;
    }
    if (!composerPrompt.trim() || (selectedCharacters.length === 0 && selectedLocations.length === 0)) {
      alert('Please select at least one image and provide a prompt.');
      return;
    }
    setIsComposing(true);
    setGeneratedImageUrlForChild('');

    try {
      const imageUrls = [...selectedCharacters, ...selectedLocations];
      const imagesAsDataUrls = await Promise.all(imageUrls.map(url => urlToDataUrl(url)));

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: composerPrompt,
          images: imagesAsDataUrls,
          storyId: showUncategorized ? undefined : selectedStoryId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'AI scene generation failed');

      const { dataUrl, modelUsed } = extractImageAndModel(json);
      setLastModelUsed(modelUsed || 'Unknown');

      if (!dataUrl) throw new Error('No image was returned by the generator.');

      setGeneratedImageUrlForChild(dataUrl);
      handleSaved({ url: dataUrl, contentType: 'image/png' });

      setSelectedCharacters([]);
      setSelectedLocations([]);
      setComposerPrompt('');
    } catch (e: any) {
      console.error('Scene generation error:', e);
      alert(e?.message || 'Scene generation error');
    } finally {
      setIsComposing(false);
    }
  };

  async function saveYouTubeLink() {
    if (!user) return;
    if (!ytValid) {
      alert('Please paste a valid YouTube URL.');
      return;
    }
  
    const normalizedUrl = normalizeYouTubeUrl(ytUrl)!; // valid if ytValid
    const embedUrl = toYouTubeEmbedUrl(normalizedUrl)!;
    const thumbUrl = toYouTubeThumb(normalizedUrl) || null;
  
    // Decide the assetIndex path: story vs uncategorized
    // users/{uid}/assetIndex/stories/{storyId}/videos or users/{uid}/assetIndex/uncategorized/videos
    const base = showUncategorized
      ? collection(db, 'users', user.uid, 'assetIndex', 'uncategorized', 'videos')
      : collection(db, 'users', user.uid, 'assetIndex', 'stories', selectedStoryId!, 'videos');
  
    setSavingYt(true);
    try {
      const payload = {
        name: ytName?.trim() || '(untitled)',
        url: normalizedUrl,            // canonical “watch” URL
        embedUrl,                      // convenience for display iframes
        provider: 'youtube',
        kind: 'video',
        thumbUrl,                      // not guaranteed, but helpful for gallery cards
        ownerUid: user.uid,
        storyId: showUncategorized ? null : selectedStoryId!,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Optional “displayContentType” if your gallery expects it
        contentType: 'video/youtube'
      };
      const docRef = await addDoc(base, payload);
  
      // Update left “Display” immediately
      setDisplayUrl(embedUrl);
      setDisplayContentType('video/youtube');
  
      // Clear inputs
      setYtUrl('');
      setYtName('');
  
      // Optionally: nudge the gallery to refresh (keeps pagination reset logic intact)
      triggerGalleryReset();
    } catch (e: any) {
      console.error('Error saving YouTube link:', e);
      alert(e?.message || 'Could not save the YouTube link.');
    } finally {
      setSavingYt(false);
    }
  }

  // Decide which doc to show for the #1 icon based on the active tab
  // ★ kebab-case paths in /public/info_tips
  const tipDocForOne =
    active === 'locations'
      ? '/info_tips/location-generation-template.md'
      : '/info_tips/character-creation-template.md';
  const tipDocForTwo = '/info_tips/pro-tips-for-prompting-images.md';

  // ★ receive prompts from InfoPopover and route them to inputs
  const handleUsePromptFromInfo = useCallback((text: string) => {
    setComposerPrompt(text);
    window.dispatchEvent(new CustomEvent('set-uploader-prompt', { detail: { text } }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin" />
          <span>Checking your session…</span>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-xl mx-auto bg-[#F3EADF] rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
          <p className="mb-6">Please sign in to upload or view your reference gallery.</p>
          <div className="flex gap-3">
            <Link href="/login" className="px-5 py-2 rounded-md bg-[#3D4F60] text-white">Go to Login</Link>
            <button onClick={() => router.back()} className="px-5 py-2 rounded-md border-2">← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // const canSaveAssets = !!selectedStoryId;
  const canSaveAssets = !!selectedStoryId || showUncategorized;

  // 🔽 convenience: flip sort dir
  const toggleSortDir = () => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));

  // 🔽 whenever sort field/dir/pageSize changes, reset gallery pagination
  useEffect(() => {
    triggerGalleryReset();
  }, [sortField, sortDir, pageSize, triggerGalleryReset]);

  // 🔽 Build a stable key to force remount on critical changes (resets cursors)
  const galleryKey = [
    active,
    showUncategorized ? 'UNCAT' : selectedStoryId ?? 'NO_STORY',
    sortField,
    sortDir,
    pageSize,
    galleryResetTick,
  ].join('|');

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
      <div className="max-w-6xl mx-auto bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-[#2A3645] dark:border-[#4B5A6B] dark:text-[#E0C9A0] rounded-xl shadow-2xl">
        <style jsx global>{`
          .dark .uploader-scope input[type="text"],
          .dark .uploader-scope textarea { color: #3D4F60 !important; background: #ffffff !important; }
        `}</style>

        {/* --- HEADER --- */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-6 border-b-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20">
          <div>
            {/* Existing header content */}
            <h1 className="text-2xl sm:text-3xl font-bold">Build References & AI Support</h1>
            <p className="text-sm text-[#3A4B5C]/70 dark:text-[#E0C9A0]/70">
              Store image, audio, and video references used across your stories.
            </p>
            <p className="text-xs mt-1 text-[#3A4B5C]/60 dark:text-[#E0C9A0]/60">
              AI language: <strong>{langLabel}</strong>
              {showUncategorized
                ? ' • Context: Uncategorized'
                : (context.title ? ` • Context: ${context.title}` : '')
              }
            </p>

            {/* NEW: Story Selector Dropdown */}
            <div className="flex items-center gap-4 mt-2">
              <label htmlFor="story-selector" className="text-sm font-semibold whitespace-nowrap">
                Active Story:
              </label>
              <select
                id="story-selector"
                className="w-full max-w-xs p-2 border-2 rounded-md bg-white text-slate-900 border-slate-300 dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]"
                value={storySelectValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__UNCAT__') {
                    setShowUncategorized(true);
                    setSelectedStoryId(undefined);
                  } else {
                    setShowUncategorized(false);
                    setSelectedStoryId(v || undefined);
                  }
                }}
                disabled={userStoriesLoading}
              >
                <option value="">
                  {userStoriesLoading ? 'Loading stories...' : 'Select a story...'}
                </option>

                {/* NEW: special option */}
                <option value="__UNCAT__">All Uncategorized Assets</option>

                {userStories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || '(untitled)'}
                  </option>
                ))}
              </select>

              {/* Dynamic helper chip */}
              {showUncategorized ? (
                <span className="text-sm font-medium text-blue-700 dark:text-blue-200">
                  Viewing & saving to <em>Uncategorized</em>
                </span>
              ) : !selectedStoryId ? (
                <span className="text-sm text-red-600 font-medium">
                  (No story selected)
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-3">
            <Link className="underline text-sm" href="/create/begin">← Back</Link>
            <Link className="underline text-sm" href="/create/scenes">Next: AI Story eReader →</Link>
          </div>
        </div>

        {/* --- TABS --- */}
        <div className="px-4 sm:px-6 pt-4">
          <div role="tablist" aria-label="Reference categories" className="flex flex-wrap gap-2 sm:gap-3">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={active === key}
                onClick={() => setActive(key)}
                className={classNames(
                  'inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border transition',
                  active === key
                    ? 'bg-[#E97451] text-white border-[#E97451] shadow'
                    : 'bg-white text-[#3D4F60] border-[#3D4F60]/20 hover:border-[#3D4F60]/40 dark:bg-[#1A2533] dark:text-[#F0D1B0] dark:border-[#4B5A6B]/20 dark:hover:border-[#4B5A6B]/40'
                )}
              >
                <Icon size={16} /><span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* =================================================================== */}
        {/* ===================== MAIN CONTENT SECTION ======================== */}
        {/* =================================================================== */}
        <section id={`panel-${activeTab.key}`} role="tabpanel" className="p-4 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 mt-1">
              {React.createElement(activeTab.icon, { className: 'text-[#3D4F60] dark:text-[#F0D1B0]' })}
            </div>
            <div>
              <h2 className="text-lg font-bold">{activeTab.label}</h2>
              <p className="text-sm text-[#3A4B5C]/80 dark:text-[#E0C9A0]/80">{activeTab.blurb}</p>
            </div>
          </div>

          {/* --- CORRECTED TWO-COLUMN LAYOUT GRID --- */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* ------------------------- LEFT COLUMN -------------------------- */}
            <div className="flex flex-col gap-6">
              {/* --- 1. DISPLAY COMPONENT --- */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Display</h3>
                <div className="relative w-full bg-white dark:bg-[#0f1620] border rounded-lg overflow-hidden aspect-square grid place-items-center">
                {!displayUrl ? (
                      <div className="text-xs opacity-70">Nothing selected</div>
                    ) : kind === 'image' ? (
                      <img src={displayUrl} alt="Selected" className="absolute inset-0 w-full h-full object-contain" />
                    ) : kind === 'audio' ? (
                      <audio controls src={displayUrl} className="w-11/12" />
                    ) : kind === 'video' ? (
                      <video controls src={displayUrl} className="absolute inset-0 w-full h-full object-contain" />
                    ) : kind === 'youtube' ? (
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={toYouTubeEmbedUrl(displayUrl) || displayUrl}
                        title="YouTube video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <div className="text-xs opacity-70">Unsupported media</div>
                    )}

                  {displayUrl && lastModelUsed && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-mono rounded-md px-2 py-1 backdrop-blur-sm shadow-lg">
                      Model: {lastModelUsed}
                    </div>
                  )}
                </div>
              </div>

              {/* --- 2. AI DESCRIBE COMPONENT --- */}
              {isImageTab(activeTab.key) && (
                <div className="rounded-xl border-2 border-[#3D4F60] dark:border-[#4B5A6B] bg-[#F3EADF] dark:bg-[#2A3645] p-4">
                  <h3 className="font-semibold mb-2">AI Describe — Selected Image</h3>
                  <div className="flex gap-2 items-center mb-2">
                    <button
                      onClick={handleDescribeSelected}
                      disabled={!canDescribeSelected || descLoading}
                      className="px-4 py-2 rounded bg-[#E97451] text-white disabled:opacity-50"
                    >
                      {descLoading ? 'Describing…' : 'Describe Selected'}
                    </button>
                    {descError && <span className="text-red-600 text-sm">{descError}</span>}
                    {!displayUrl && <span className="text-sm opacity-70">Pick from gallery, upload, or generate first.</span>}
                  </div>
                  {!!desc && (
                    <>
                      <label className="block text-sm font-bold mb-1">Description</label>
                      <textarea
                        className="w-full p-2 border rounded dark:bg:white dark:text-[#3D4F60]"
                        rows={5}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                      />
                      <div className="mt-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(desc)}
                          className="px-3 py-1 rounded border-2 border-[#3D4F60] text-[#3D4F60] bg-white hover:bg-[#EAF1F7] active:scale-95 dark:border-[#4B5A6B] dark:text-[#E0C9A0] dark:bg-[#2A3645] dark:hover:bg-[#334154]/60"
                        >
                          Copy
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* --- 3. UPLOAD / GENERATE COMPONENT --- */}
              <div className="uploader-scope">
                {/* NEW: choose a story message */}
                {!canSaveAssets ? (
                  <div className="mb-4 p-3 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-200">
                    <p className="font-semibold">Choose where to manage assets.</p>
                    <p className="text-sm">
                      Select a story from the dropdown, or choose <strong>All Uncategorized Assets</strong> to work outside any story.
                    </p>
                  </div>
                ) : showUncategorized ? (
                  <div className="mb-4 p-3 rounded-md bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-200">
                    <p className="font-semibold">Uncategorized mode</p>
                    <p className="text-sm">
                      Uploads & saves will go to <code>users/&lt;uid&gt;/assetIndex/uncategorized/&lt;category&gt;/</code>.
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 p-3 rounded-md bg-emerald-100 border-emerald-300 border text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-200">
                    <p className="font-semibold">Story mode</p>
                    <p className="text-sm">
                      Uploads & saves will go to <code>users/&lt;uid&gt;/assetIndex/stories/{selectedStoryId}/&lt;category&gt;/</code>.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs mb-2">
                  <span className="opacity-70">Generation Tips:</span>
                  <div className="inline-flex items-center gap-1">
                    <span className="opacity-60">#1</span>
                    <InfoPopover
                      title={active === 'locations' ? 'Location Template' : 'Character Template'}
                      docHref={tipDocForOne}
                      onUsePrompt={handleUsePromptFromInfo}
                    />
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <span className="opacity-60">#2</span>
                    <InfoPopover
                      title="Pro Tips for Prompting Images"
                      docHref={tipDocForTwo}
                      onUsePrompt={handleUsePromptFromInfo}
                    />
                  </div>
                </div>

                {activeTab.key !== 'videos' ? (
                  <UploadImageReference
                    mode="uploaderOnly"
                    variant={activeTab.variant}
                    assetCategory={activeTab.key}
                    accept={acceptByTab[activeTab.key]}       // images/audio still use uploads
                    showInnerDescribe={false}
                    onSaved={handleSaved}
                    onGenerateRequest={handleGenerateRequest}
                    isGenerating={isGenerating}
                    generatedImageUrl={generatedImageUrlForChild}
                    storyId={showUncategorized ? undefined : selectedStoryId}
                    sortField={sortField}
                    sortDir={sortDir}
                    pageSize={pageSize}
                    disableSaveButtons={!canSaveAssets}
                  />
                ) : (
                  /* NEW: YouTube link form for Videos tab */
                  <div className="rounded-xl border-2 border-[#3D4F60] dark:border-[#4B5A6B] bg-[#F3EADF] dark:bg-[#2A3645] p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Insert YouTube URL
                    </h3>

                    {!canSaveAssets && (
                      <div className="mb-3 p-2 rounded bg-yellow-100 text-yellow-900 text-sm">
                        Select a story or choose <strong>All Uncategorized Assets</strong> to enable saving.
                      </div>
                    )}

                    <label className="block text-sm font-semibold mb-1">YouTube URL</label>
                    <input
                      type="text"
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full p-2 border rounded mb-3 dark:bg-white dark:text-[#3D4F60]"
                    />

                    <label className="block text-sm font-semibold mb-1">Custom Name</label>
                    <input
                      type="text"
                      value={ytName}
                      onChange={(e) => setYtName(e.target.value)}
                      placeholder="e.g., Trailer — Chapter 1"
                      className="w-full p-2 border rounded mb-4 dark:bg:white dark:text-[#3D4F60]"
                    />

                    {/* Live preview when valid */}
                    {ytValid && (
                      <div className="relative w-full border rounded overflow-hidden aspect-video mb-3 bg-black">
                        <iframe
                          src={toYouTubeEmbedUrl(ytUrl) || undefined}
                          title="YouTube preview"
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveYouTubeLink}
                        disabled={!canSaveAssets || !ytValid || savingYt}
                        className="px-4 py-2 rounded bg-[#E97451] text-white disabled:opacity-50"
                      >
                        {savingYt ? 'Saving…' : 'Save to My Gallery'}
                      </button>
                      {!ytValid && ytUrl.trim().length > 0 && (
                        <span className="text-xs text-red-600">Enter a valid YouTube URL.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </div>

            {/* ------------------------- RIGHT COLUMN -------------------------- */}
            <div className="flex flex-col gap-6">
              {/* --- 4. AI SCENE COMPOSER --- */}
              {isImageTab(activeTab.key) && (
                <div className="border-2 border-dashed border-[#E97451] rounded-xl p-4 bg-[#F3EADF] dark:bg-[#2A3645]">
                  <h3 className="font-semibold mb-3 text-lg">AI Scene Composer</h3>

                  {selectedCharacters.length === 0 && selectedLocations.length === 0 ? (
                    <p className="text-sm text-gray-500">Select images from your gallery below to begin combining them.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[...selectedCharacters, ...selectedLocations].map(url => (
                          <img key={url} src={url} className="w-16 h-16 rounded object-cover border" alt="Selected Asset" />
                        ))}
                      </div>
                      <textarea
                        className="w-full p-2 border rounded dark:bg-white dark:text-[#3D4F60]"
                        rows={3}
                        placeholder="e.g., Make the character stand in front of the castle at sunset..."
                        value={composerPrompt}
                        onChange={(e) => setComposerPrompt(e.target.value)}
                      />
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={handleSceneGeneration}
                          disabled={isComposing || !composerPrompt.trim()}
                          className="px-4 py-2 rounded bg-[#E97451] text-white disabled:opacity-50 flex items-center gap-2"
                        >
                          {isComposing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                          {isComposing ? 'Generating...' : 'Generate Scene'}
                        </button>
                        <button
                          onClick={() => { setSelectedCharacters([]); setSelectedLocations([]); setComposerPrompt(''); }}
                          className="text-xs underline"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* --- 5. MY GALLERY --- */}
              <div className="border-2 border-[#3D4F60] dark:border-[#4B5A6B] rounded-xl p-3 bg-white/60 dark:bg-transparent">
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <h4 className="font-semibold">
                    My Gallery — <span className="opacity-80">{activeTab.label}</span>
                  </h4>

                  {/* 🔽 Sort & Pagination Controls */}
                  <div className="flex items-center gap-2 text-sm">
                    {/* Sort field */}
                    <label className="sr-only" htmlFor="gallery-sort-field">Sort by</label>
                    <div className="relative">
                      <select
                        id="gallery-sort-field"
                        className="pl-3 pr-8 py-1.5 rounded-md border bg-white dark:bg-[#1A2533] dark:text-[#E0C9A0] dark:border-[#4B5A6B]/40"
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value as typeof sortField)}
                      >
                        <option value="name">Name</option>
                        <option value="updatedAt">Updated</option>
                        <option value="createdAt">Created</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                    </div>

                    {/* Sort dir */}
                    <button
                      type="button"
                      onClick={toggleSortDir}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-white dark:bg-[#1A2533] dark:text-[#E0C9A0] dark:border-[#4B5A6B]/40"
                      title={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      {sortDir.toUpperCase()}
                    </button>

                    {/* Page size */}
                    <label className="ml-2">Page:</label>
                    <select
                      className="pl-2 pr-6 py-1.5 rounded-md border bg-white dark:bg-[#1A2533] dark:text-[#E0C9A0] dark:border-[#4B5A6B]/40"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      {[12, 24, 36, 48].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>

                    {/* Force reset (useful when testing pagination) */}
                    <button
                      type="button"
                      onClick={triggerGalleryReset}
                      className="ml-2 text-xs underline opacity-80"
                      title="Reset gallery pagination"
                    >
                      reset
                    </button>
                  </div>
                </div>

                {isImageTab(activeTab.key) && (
                  <p className="text-xs text-gray-500 mb-2">Select up to 3 characters and 2 locations to combine them.</p>
                )}

                {/* NOTE:
                   - key={galleryKey} forces a remount when sort/page settings change,
                     which ensures any internal cursor-based pagination in the gallery re-initializes.
                   - sortField/sortDir/pageSize are passed down; wire them inside UploadImageReference
                     where you build your Firestore queries (orderBy + limit).
                */}
                {/* @ts-ignore */}
                <UploadImageReference
                  key={galleryKey}
                  mode="galleryOnly"
                  variant={activeTab.variant}
                  assetCategory={activeTab.key}
                  onSaved={handleSaved}
                  selection={activeTab.key === 'characters' ? selectedCharacters : selectedLocations}
                  onSelectionChange={activeTab.key === 'characters' ? setSelectedCharacters : setSelectedLocations}
                  maxSelection={activeTab.key === 'characters' ? 3 : 2}
                  storyId={showUncategorized ? undefined : selectedStoryId}
                  disableSaveButtons={!canSaveAssets}
                  sortField={sortField}       // NEW
                  sortDir={sortDir}           // NEW
                  pageSize={pageSize}         // NEW
                />

                {/* Tiny helper text for pagination state */}
                <div className="mt-2 text-[11px] opacity-70">
                  Sorting by <code>{sortField}</code> ({sortDir}), page size <code>{pageSize}</code>. Changes here reset the gallery’s internal cursor.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <div className="flex justify-end gap-3 p-6 border-t-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20">
          <Link
            className="px-4 py-2 rounded-md border border-[#3D4F60] text-[#3D4F60] bg-white dark:border-[#4B5A6B] dark:text-[#E0C9A0] dark:bg-[#2A3645]"
            href="/create/begin"
          >
            ← Back
          </Link>
          <Link
            className="px-6 py-2 rounded-md bg-[#E97451] text-white"
            href={selectedStoryId ? `/create/scenes?storyId=${selectedStoryId}` : '/create/scenes'}
          >
            Next: AI Story eReader →
          </Link>
        </div>
      </div>
    </div>
  );
}
