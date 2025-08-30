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
  uploadBytes,
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

type SceneData = {
  index: number;
  text: string;
  image?: { url: string; name?: string };
  audio?: { url: string; name?: string };
  references?: Array<{ url: string; name?: string; category?: AssetCategory }>;
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

function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ScenesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = searchParams.get('storyId') || undefined;

  /* -------- Load story context (title/genres/synopsis/language) -------- */
  const [context, setContext] = useState<{ title?: string; genres?: string[]; synopsis?: string; language: LangCode }>({
    title: '',
    genres: [],
    synopsis: '',
    language: 'en',
  });
  const langLabel = LANG_LABELS[context.language] || 'English';

  useEffect(() => {
    (async () => {
      // Prefer Firestore story doc
      let langFromDoc: LangCode | undefined;
      try {
        if (user && storyId) {
          const ref = fsDoc(db, 'stories', storyId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const s = snap.data() as any;
            langFromDoc = (s?.language as LangCode) || undefined;
            setContext(prev => ({
              ...prev,
              title: s?.title || prev.title,
              genres: Array.isArray(s?.genres) ? s.genres : prev.genres,
              synopsis: s?.synopsis || prev.synopsis,
              language: (langFromDoc || prev.language) as LangCode,
            }));
            return;
          }
        }
      } catch (e) {
        console.error('Failed loading story doc for context', e);
      }
      // Fallback to localStorage draft
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const fallbackLang = (parsed?.language as LangCode) || 'en';
        setContext(prev => ({
          ...prev,
          title: parsed?.title || prev.title,
          genres: Array.isArray(parsed?.genres) ? parsed.genres : prev.genres,
          synopsis: parsed?.synopsis || prev.synopsis,
          language: fallbackLang,
        }));
      } catch {}
    })();
  }, [user, storyId]);

  /* -------- Reader UI + scene state -------- */
  const [readerUI, setReaderUI] = useState({
    avatarUrl: DEFAULTS.avatarUrl,
    backgroundUrl: DEFAULTS.backgroundUrl,
  });
  const [scene, setScene] = useState<SceneData>({
    index: 1,
    text: '',
    references: [],
  });
  const [pageCount, setPageCount] = useState<number>(3);

  // Prompts / descriptions / audio settings
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageDesc, setImageDesc] = useState('');
  const [narrationText, setNarrationText] = useState('');
  const [voice, setVoice] = useState('Kore'); // same set as integration demo
  const [tone, setTone] = useState<'a normal' | 'a cheerful' | 'a sad' | 'an excited' | 'a whispering'>('a normal');
  const [isGenImage, setIsGenImage] = useState(false);
  const [isGenAudio, setIsGenAudio] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Gallery
  const [activeTab, setActiveTab] = useState<typeof GALLERY_TABS[number]['key']>('characters');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  /* -------- Hydrate initial scene from story or draft -------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Firestore first
      try {
        if (user && storyId) {
          const ref = fsDoc(db, 'stories', storyId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
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
                references: [],
              });
              setImagePrompt(s1?.imagePrompt || '');
              setImageDesc(s1?.imageDescription || '');
              setNarrationText(s1?.narrationText || s1?.text || '');
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Could not load scenes from story', e);
      }

      // Draft fallback
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
          const scenes = draft?.scenes || (draft?.pages ? Array.from({ length: draft.pages }, () => ({})) : []);
          if (scenes?.length) {
            setPageCount(scenes.length);
            const s1 = scenes[0];
            setScene(s => ({
              ...s,
              index: 1,
              text: s1?.text || '',
              image: s1?.imageUrl ? { url: s1.imageUrl, name: s1.imageName || '' } : undefined,
              audio: s1?.audioUrl ? { url: s1.audioUrl, name: s1.audioName || '' } : undefined,
              references: [],
            }));
            setImagePrompt(s1?.imagePrompt || '');
            setImageDesc(s1?.imageDescription || '');
            setNarrationText(s1?.narrationText || s1?.text || '');
            return;
          }
        }
      } catch {}
      // Defaults already set
    })();
    return () => { cancelled = true; };
  }, [user, storyId]);

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

  /* -------- Actions: select for scene / reference / describe -------- */
  const canDescribeSelected = (item: GalleryItem) => {
    const k = inferKindFromPath(item.fullPath, item.contentType);
    return k === 'image';
  };

  async function handleDescribe(item: GalleryItem) {
    try {
      if (!canDescribeSelected(item)) return;
      const lang = (context.language || 'en') as LangCode;
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
      setScene(s => ({ ...s, image: { url: item.url, name: item.name } }));
    } else if (kind === 'audio') {
      setScene(s => ({ ...s, audio: { url: item.url, name: item.name } }));
    } else {
      alert('Only image or audio can be selected directly for a scene.');
    }
  }

  function handleUseAsReference(item: GalleryItem) {
    setScene(s => ({
      ...s,
      references: [
        ...(s.references || []),
        { url: item.url, name: item.name, category: (activeTab as AssetCategory) },
      ],
    }));
  }

  /* -------- AI: Generate Image (Imagen 4 via /api/generate-image) -------- */
  async function handleGenerateImage() {
    if (!imagePrompt.trim() && !context.synopsis && !(context.genres?.length)) {
      alert('Please write an image description or fill the story synopsis/genres on the Begin page.');
      return;
    }
    setIsGenImage(true);
    try {
      const { prompt, negativePrompt } = composePromptForImagen(imagePrompt, {
        title: context.title,
        genres: context.genres,
        synopsis: context.synopsis,
        language: context.language,
      });

      // Optionally blend "references" names into prompt (soft hint)
      const refNames = (scene.references || []).map(r => r.name).filter(Boolean);
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
      setScene(s => ({ ...s, image: { url: dataUrl, name: `scene-${scene.index}-ai.png` } }));
    } catch (e: any) {
      alert(e?.message || 'Image generation error');
    } finally {
      setIsGenImage(false);
    }
  }

  /* -------- Auto-suggest scene text + image prompt (expects backend) ----- */
  async function handleSuggestForScene() {
    setIsSuggesting(true);
    try {
      const payload = {
        title: context.title,
        genres: context.genres,
        synopsis: context.synopsis,
        language: context.language,
        sceneIndex: scene.index,
      };
      const res = await fetch('/api/suggest-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Suggestion failed');
      if (json?.storyText) setScene(s => ({ ...s, text: json.storyText }));
      if (json?.imagePrompt) setImagePrompt(json.imagePrompt);
      if (!json?.storyText && !json?.imagePrompt) throw new Error('No suggestions returned.');
    } catch (e: any) {
      alert(
        (e?.message || 'Suggest failed') +
        '\n\nTip: implement /api/suggest-scene to call a Gemini text model that returns {storyText, imagePrompt} for this scene.'
      );
    } finally {
      setIsSuggesting(false);
    }
  }

  /* -------- TTS (Gemini AUDIO via /api/generate-audio) ------------------- */
  async function handleGenerateAudio() {
    const text = (narrationText || scene.text || '').trim();
    if (!text) {
      alert('Please enter narration text (or use scene text).');
      return;
    }
    setIsGenAudio(true);
    try {
      const body = {
        text,
        voice,
        tone, // e.g., "a cheerful"
        language: context.language,
        model: 'gemini-2.5-flash-preview-tts',
      };
      const r = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || 'TTS failed');
      if (!json?.audioUrl) throw new Error('No audioUrl returned by TTS route.');
      setScene(s => ({ ...s, audio: { url: json.audioUrl, name: `scene-${scene.index}-narration.mp3` } }));
    } catch (e: any) {
      alert(
        (e?.message || 'TTS failed') +
        '\n\nTip: add /api/generate-audio that proxies Gemini “AUDIO” modality and returns { audioUrl } (data: URL or signed Storage URL).'
      );
    } finally {
      setIsGenAudio(false);
    }
  }

  /* -------- Save scene to Firestore ------------------------------------- */
  const canSave =
    !!user && (scene.text.trim().length > 0 || scene.image?.url || scene.audio?.url);

  async function handleSave() {
    if (!user) return;
    try {
      const scenesCol = collection(db, 'users', user.uid, 'draftScenes');
      const docRef = fsDoc(scenesCol, `scene-${scene.index || 1}`);
      await setDoc(docRef, {
        ...scene,
        imagePrompt,
        imageDescription: imageDesc || null,
        narrationText: narrationText || null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });

      if (storyId) {
        const storyRef = fsDoc(db, 'stories', storyId);
        const snap = await getDoc(storyRef);
        const existing = (snap.exists() && (snap.data() as any)?.scenes) || [];
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
          narrationText: narrationText || '',
        };
        await updateDoc(storyRef, {
          scenes: nextScenes,
          reader: {
            avatarUrl: readerUI.avatarUrl,
            backgroundUrl: readerUI.backgroundUrl,
          },
          updatedAt: serverTimestamp(),
          language: context.language,
        });
      }

      alert('Scene saved!');
    } catch (e: any) {
      alert(e?.message || 'Failed to save scene.');
    }
  }

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

      {/* Scrollable workspace — add bottom padding so global App footer won't cover local footer */}
      <main className="mx-auto max-w-6xl px-4 pb-40">
        <div className="min-h-[calc(100vh-140px)] overflow-y-auto py-6">
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

              {/* Scene text + helpers */}
              <div className="rounded-2xl border-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/70 dark:bg-[#0f1620]/70 shadow-sm p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold">Scene Text</label>
                  <button
                    type="button"
                    onClick={handleSuggestForScene}
                    className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs"
                  >
                    {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Quote className="w-4 h-4" />}
                    Auto-Suggest (text + image)
                  </button>
                </div>
                <textarea
                  value={scene.text}
                  onChange={e => setScene(s => ({ ...s, text: e.target.value }))}
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
                      onClick={handleGenerateAudio}
                      disabled={isGenAudio}
                      className="px-4 py-2 rounded-md bg-[#3D4F60] text-white disabled:opacity-60"
                    >
                      {isGenAudio ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                      Generate Narration (AI)
                    </button>
                    {scene.audio?.url && (
                      <a
                        href={scene.audio.url}
                        className="px-4 py-2 rounded-md border"
                        download
                      >
                        Download MP3
                      </a>
                    )}
                  </div>
                </div>
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
              {scene.references && scene.references.length > 0 && (
                <div className="rounded-xl border-2 border-[#3D4F60]/40 dark:border-[#4B5A6B]/40 p-3 bg-white/50 dark:bg-[#0f1620]/50">
                  <div className="text-xs font-semibold mb-2">Scene References</div>
                  <ul className="flex flex-wrap gap-2">
                    {scene.references.map((r, i) => (
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

      {/* Local footer for scene nav & save */}
      <footer className="sticky bottom-0 z-30 border-t border-[#3D4F60]/10 dark:border-[#4B5A6B]/20 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="text-xs opacity-70">
            Use <span className="font-medium">Auto-Suggest</span> to draft scenes, <span className="font-medium">Generate Image</span> to illustrate, and <span className="font-medium">Generate Narration</span> for audio.
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
