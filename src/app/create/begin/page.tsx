'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import GenreMultiSelect from '@/components/GenreMultiSelect';
import CoverImageManager from '@/components/CoverImageManager';

import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import {
  serverTimestamp,
  updateDoc,
  doc as fsDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { useCreateStory } from '@/hooks/useCreateStory';
import { uploadCoverToStory } from '@/lib/uploadCover';

/* ------------------------------------------------------------------ */
/* Page constants & types                                              */
/* ------------------------------------------------------------------ */
const GENRES = [
  'Fantasy','Sci-Fi','Mystery','Horror','Romance','Adventure',"Children's",
  'Comedy','Drama','Action','Other',
] as const;

const CATEGORIES = [
  { key: 'short',    label: 'Short Story (1–10 slides)', min: 1, max: 10 },
  { key: 'novela',   label: 'Novela (5–20 slides)',      min: 5, max: 20 },
  { key: 'campaign', label: 'Campaign (1–20 slides)',    min: 1, max: 20 },
] as const;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية' },
] as const;

type LangCode = typeof LANGUAGES[number]['code'];

type Draft = {
  storyId?: string;
  title: string;
  genres: string[];
  synopsis: string;
  category: typeof CATEGORIES[number]['key'];
  pages: number;
  coverUrl?: string | null;
  language: LangCode;
  campaignName?: string;

  scenes?: Array<{
    text: string;
    imagePrompt: string;
    imageDescription?: string;
    imageUrl?: string | null;
    audioUrl?: string | null;
  }>;

  reader?: {
    avatarUrl?: string;
    backgroundUrl?: string;
  };
};

type StorySummary = {
  id: string;
  title: string;
  synopsis: string;
  genres: string[];
  category: Draft['category'];
  pageCount: number;
  coverImageUrl: string | null;
  updatedAt?: any;
};

const DRAFT_KEY = 'newStoryDraft';
const DEFAULTS = {
  avatarUrl: '/story_reader_avatars/Default.png',
  backgroundUrl: '/story_reader_backgrounds/dream-background.png',
};

/* Helpers */
function isHttpUrl(u?: string | null) {
  return !!u && (u.startsWith('http://') || u.startsWith('https://'));
}
function clampPagesForCategory(catKey: Draft['category'], pages: number) {
  const cfg = CATEGORIES.find(c => c.key === catKey)!;
  const n = Math.floor(Number.isFinite(pages as any) ? pages : cfg.min);
  return Math.max(cfg.min, Math.min(cfg.max, n));
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function BeginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createStory = useCreateStory();

  /* ---------------- Draft state ---------------- */
  const [draft, setDraft] = useState<Draft>({
    title: '',
    genres: [],
    synopsis: '',
    category: 'short',
    pages: 3,
    coverUrl: undefined,
    storyId: undefined,
    language: 'en',
    campaignName: '',
    reader: { avatarUrl: DEFAULTS.avatarUrl, backgroundUrl: DEFAULTS.backgroundUrl },
  });

  /* ---------------- Story Mode (New / Continue) ---------------- */
  const [storyMode, setStoryMode] = useState<'new' | 'continue'>('new');
  const [existingStoryId, setExistingStoryId] = useState<string>('');

  /* ---------------- Visibility for Book Cover block ---------------- */
  const [showCover, setShowCover] = useState<boolean>(false);

  /* ---------------- Story list for Continue ---------------- */
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesLast, setStoriesLast] = useState<QueryDocumentSnapshot | null>(null);

  /* ---------------- Buttons/progress ---------------- */
  const [starting, setStarting] = useState(false);
  const [jumpingScenes, setJumpingScenes] = useState(false);

  /* ---------------- AI Describe state ---------------- */
  const [descLoading, setDescLoading] = useState(false);
  const [descText, setDescText] = useState<string>('');
  const [descError, setDescError] = useState<string>('');

  /* ---------------- Load draft from localStorage ---------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDraft((d) => ({
          ...d,
          ...parsed,
          reader: {
            avatarUrl: parsed?.reader?.avatarUrl || DEFAULTS.avatarUrl,
            backgroundUrl: parsed?.reader?.backgroundUrl || DEFAULTS.backgroundUrl,
          },
          language: parsed?.language || 'en',
          campaignName: parsed?.campaignName || '',
        }));
        setShowCover(Boolean(parsed?.storyId));
      } else {
        setDraft((d) => ({
          ...d,
          scenes: Array.from({ length: d.pages }, () => ({
            text: '',
            imagePrompt: '',
            imageDescription: '',
            imageUrl: null,
            audioUrl: null,
          })),
        }));
      }
    } catch {}
  }, []);

  /* ---------------- Keep scenes length in sync ---------------- */
  useEffect(() => {
    setDraft((d) => {
      const target = clampPagesForCategory(d.category, d.pages);
      const cur = d.scenes?.length ?? 0;
      if (cur === target) return d;
      const next = d.scenes ? [...d.scenes] : [];
      if (target > cur) {
        for (let i = 0; i < target - cur; i++) {
          next.push({ text: '', imagePrompt: '', imageDescription: '', imageUrl: null, audioUrl: null });
        }
      } else {
        next.length = target;
      }
      return { ...d, pages: target, scenes: next };
    });
  }, [draft.pages, draft.category]);

  /* ---------------- Persist draft (localStorage) ---------------- */
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [draft]);

  const cat = useMemo(() => CATEGORIES.find((c) => c.key === draft.category)!, [draft.category]);

  /* ---------------- Fetch user's stories for Continue ---------------- */
  const fetchStoriesPage = useCallback(async (after?: QueryDocumentSnapshot) => {
    if (!user) return;
    setStoriesLoading(true);
    try {
      const base = [
        where('ownerUid', '==', user.uid),
        orderBy('updatedAt', 'desc'),
        orderBy('__name__', 'desc'),
        limit(50),
      ] as const;

      const qy = after
        ? query(collection(db, 'stories'), ...base, startAfter(after))
        : query(collection(db, 'stories'), ...base);

      const snap = await getDocs(qy);
      const page: StorySummary[] = snap.docs.map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          title: d?.title || '(untitled)',
          synopsis: d?.synopsis || '',
          genres: d?.genres || [],
          category: (d?.category || 'short') as Draft['category'],
          pageCount: d?.pageCount || 1,
          coverImageUrl: d?.coverImageUrl ?? null,
          updatedAt: d?.updatedAt,
        };
      });

      setStories((prev) => (after ? [...prev, ...page] : page));
      setStoriesLast(snap.docs.at(-1) ?? null);
    } catch (e) {
      console.error('Failed to load stories for user', e);
    } finally {
      setStoriesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchStoriesPage();
  }, [user, fetchStoriesPage]);

  /* ---------------- Ensure story exists (used by cover upload) ---------------- */
  async function ensureStoryId(): Promise<string> {
    if (!user) throw new Error('Please sign in first.');
    if (draft.storyId) return draft.storyId;

    const id = await createStory({
      title: draft.title || '(untitled)',
      synopsis: draft.synopsis || '',
      genres: draft.genres || [],
      category: draft.category,
      pageCount: clampPagesForCategory(draft.category, draft.pages),
      coverImageUrl: null,
      visibility: 'private',
      status: 'draft',
      language: draft.language,
      metadata: draft.campaignName ? { campaignName: draft.campaignName } : {},
    } as any);

    setDraft((d) => ({ ...d, storyId: id }));
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      obj.storyId = id;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
    } catch {}
    return id;
  }

  /* ---------------- Upload cover helpers ---------------- */
  async function uploadCoverViaSdk(userUid: string, storyId: string, srcUrl: string) {
    const path = `users/${userUid}/stories/${storyId}/images/cover.png`;
    const r = ref(storage, path);
    if (srcUrl.startsWith('data:')) {
      await uploadString(r, srcUrl, 'data_url');
    } else {
      const resp = await fetch(srcUrl);
      const blob = await resp.blob();
      await uploadBytes(r, blob, { contentType: blob.type || 'image/png' });
    }
    return await getDownloadURL(r);
  }

  const handleCoverImageSaved = async (url: string) => {
    setDraft((d) => ({ ...d, coverUrl: url })); // optimistic
    try {
      if (!user) throw new Error('Please sign in first.');
      const id = await ensureStoryId();

      let httpsUrl = url;

      // ✅ TIPADO SUAVE para evitar "never"
      try {
        const out: any = await (uploadCoverToStory as any)?.({
          uid: user.uid,
          storyId: id,
          src: url,
        });
        if (typeof out === 'string') httpsUrl = out;
        else if (out && typeof out.publicUrl === 'string') httpsUrl = out.publicUrl;
      } catch (e) {
        console.warn('uploadCoverToStory helper failed, falling back to SDK:', e);
        try {
          httpsUrl = await uploadCoverViaSdk(user.uid, id, url);
        } catch (e2) {
          console.warn('SDK upload failed, falling back to using external URL:', e2);
          httpsUrl = url; // último recurso: deja el URL externo
        }
      }

      await updateDoc(fsDoc(db, 'stories', id), {
        coverImageUrl: httpsUrl,
        updatedAt: serverTimestamp(),
      });

      setDraft((d) => ({ ...d, coverUrl: httpsUrl }));
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        obj.coverUrl = httpsUrl;
        obj.storyId = id;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
      } catch {}
    } catch (e: any) {
      console.error('Failed to persist cover to story path:', e?.message || e);
    }
  };

  /* ---------------- AI Describe for current cover ---------------- */
  async function describeCurrentCover() {
    setDescError('');
    setDescText('');
    if (!draft.coverUrl) {
      setDescError('Please select a cover image first.');
      return;
    }
    setDescLoading(true);
    try {
      const payload = isHttpUrl(draft.coverUrl)
        ? { imageUrl: draft.coverUrl }
        : { dataUrl: draft.coverUrl };

      const LANG_LABELS: Record<string, string> = {
        en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German',
        it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic',
      };
      const lang = draft.language || 'en';
      const langLabel = LANG_LABELS[lang] || 'English';

      const promptText =
        lang === 'es'
          ? 'Describe esta imagen en un solo párrafo claro y conciso (sin viñetas). Concéntrate en el sujeto, el entorno, la iluminación y el estado de ánimo. Responde únicamente en español.'
          : `Describe this image in one clear, concise paragraph (no bullets). Focus on subject, setting, lighting, and mood. Respond only in ${langLabel}.`;

      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          prompt: promptText,
          language: lang,
          targetLanguage: lang,
          responseModalities: ['TEXT'],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Describe failed');
      setDescText(json.description || '');
    } catch (err: any) {
      setDescError(err?.message || 'Failed to describe image.');
    } finally {
      setDescLoading(false);
    }
  }

  /* ---------------- Continue: load selected story into fields ---------------- */
  useEffect(() => {
    (async () => {
      if (!user) return;
      if (!existingStoryId || storyMode !== 'continue') return;
      try {
        const sRef = fsDoc(db, 'stories', existingStoryId);
        const snap = await getDoc(sRef);
        if (!snap.exists()) return;

        const s = snap.data() as any;
        setDraft((d) => ({
          ...d,
          storyId: existingStoryId,
          title: s.title || d.title,
          synopsis: s.synopsis || d.synopsis,
          genres: Array.isArray(s.genres) ? s.genres : d.genres,
          category: (s.category || d.category) as Draft['category'],
          pages: typeof s.pageCount === 'number'
            ? clampPagesForCategory((s.category || d.category) as Draft['category'], s.pageCount)
            : d.pages,
          coverUrl: s.coverImageUrl ?? d.coverUrl ?? null,
          language: (s.language as LangCode) || d.language,
          campaignName: s?.metadata?.campaignName || d.campaignName || '',
        }));
        setShowCover(true);
      } catch (e) {
        console.error('Failed to load story details', e);
      }
    })();
  }, [user, existingStoryId, storyMode]);

  /* Persist language when story exists */
  useEffect(() => {
    (async () => {
      try {
        if (!draft.storyId || !user) return;
        await updateDoc(fsDoc(db, 'stories', draft.storyId), {
          language: draft.language,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Could not persist language change', e);
      }
    })();
  }, [draft.language, draft.storyId, user]);

  /* Persist campaignName when story exists */
  useEffect(() => {
    (async () => {
      try {
        if (!draft.storyId || !user) return;
        if (typeof draft.campaignName === 'undefined') return;
        await updateDoc(fsDoc(db, 'stories', draft.storyId), {
          metadata: { campaignName: draft.campaignName || '' },
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Could not persist campaignName change', e);
      }
    })();
  }, [draft.campaignName, draft.storyId, user]);

  /* Persist category + pageCount when story exists */
  useEffect(() => {
    (async () => {
      try {
        if (!draft.storyId || !user) return;
        const pageCount = clampPagesForCategory(draft.category, draft.pages);
        await updateDoc(fsDoc(db, 'stories', draft.storyId), {
          category: draft.category,
          pageCount,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Could not persist category/pageCount change', e);
      }
    })();
  }, [draft.category, draft.pages, draft.storyId, user]);

  /* ---------------- Buttons ---------------- */
  const canStartNew =
    draft.title.trim() !== '' &&
    draft.genres.length > 0 &&
    draft.synopsis.trim() !== '' &&
    (draft.category !== 'campaign' || (draft.campaignName || '').trim() !== '');

  async function onStartStory() {
    try {
      setStarting(true);
      if (storyMode === 'continue') {
        if (!existingStoryId) throw new Error('Please select a story to load.');
        setShowCover(true);
        return;
      }
      if (!canStartNew) throw new Error('Fill Title, Genres, Synopsis (and Campaign Name if Campaign).');

      const id = await createStory({
        title: draft.title.trim(),
        synopsis: draft.synopsis.trim(),
        genres: draft.genres,
        category: draft.category,
        pageCount: clampPagesForCategory(draft.category, draft.pages),
        coverImageUrl: null,
        visibility: 'private',
        status: 'draft',
        language: draft.language,
        metadata: draft.campaignName ? { campaignName: draft.campaignName } : {},
      } as any);

      setDraft((d) => ({ ...d, storyId: id }));
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        obj.storyId = id;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
      } catch {}

      setShowCover(true);
    } catch (e: any) {
      alert(e?.message || 'Failed to start story.');
    } finally {
      setStarting(false);
    }
  }

  async function handleSkipToScenes() {
    try {
      setJumpingScenes(true);

      if (storyMode === 'continue') {
        if (!existingStoryId) throw new Error('Pick a story to continue.');
        router.push(`/create/scenes?storyId=${existingStoryId}`);
        return;
      }

      if (!canStartNew) throw new Error('Fill Title, Genres, Synopsis (and Campaign Name if Campaign).');

      const id =
        draft.storyId ||
        (await createStory({
          title: draft.title.trim(),
          synopsis: draft.synopsis.trim(),
          genres: draft.genres,
          category: draft.category,
          pageCount: clampPagesForCategory(draft.category, draft.pages),
          visibility: 'private',
          status: 'draft',
          language: draft.language,
          metadata: draft.campaignName ? { campaignName: draft.campaignName } : {},
        } as any));

      setDraft(d => ({ ...d, storyId: id }));
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        obj.storyId = id;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
      } catch {}

      router.push(`/create/scenes?storyId=${id}`);
    } catch (e: any) {
      alert(e?.message || 'Could not continue to Scenes.');
    } finally {
      setJumpingScenes(false);
    }
  }

  const isNextButtonEnabled =
    draft.title.trim() !== '' &&
    draft.genres.length > 0 &&
    draft.synopsis.trim() !== '' &&
    draft.coverUrl != null &&
    (draft.category !== 'campaign' || (draft.campaignName || '').trim() !== '');

  /* ---------------- UI ---------------- */
  return (
    <div
      className="
        min-h-screen p-6 pb-28
        text-slate-800 bg-gradient-to-b from-slate-50 to-slate-200
        dark:text-[#E0C9A0] dark:bg-gradient-to-b dark:from-[#0d1b2a] dark:to-[#1b263b]
        font-sans
      "
    >
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Begin a New Tale</h1>
          <Link href="/" className="text-sm underline text-slate-700 dark:text-[#C8D6E5]">Back</Link>
        </div>

        {/* Top Form */}
        <div className="
          mb-5 rounded-xl border-2 shadow p-6
          border-slate-300 bg-white text-slate-800
          dark:border-[#344b63] dark:bg-[#142436] dark:text-[#E0C9A0]
        ">
          {/* Title + Genres + Story Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">Title</label>
              <input
                className="
                  w-full p-3 border-2 rounded-md
                  bg-white text-slate-900 border-slate-300
                  focus:outline-none focus:ring-2 focus:ring-slate-300
                  dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55] dark:focus:ring-[#2c3f55]
                "
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="The Rise of the Shadow Dragon"
              />
            </div>

            {/* Genres */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold mb-2">Genres</label>
              <GenreMultiSelect
                genresList={GENRES as any}
                selectedGenres={draft.genres}
                onSelectedGenresChange={(genres) => setDraft((d) => ({ ...d, genres }))}
              />
            </div>

            {/* Story Mode (New / Continue + select) */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold mb-1">Story Mode</label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setStoryMode('new'); setExistingStoryId(''); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition
                    ${storyMode === 'new'
                      ? 'bg-[#E97451] text-white shadow-md'
                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[.98] dark:bg-[#0f2334] dark:text-[#C8D6E5] dark:hover:bg-[#152b42]'}`}
                  aria-pressed={storyMode === 'new'}
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={() => setStoryMode('continue')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition
                    ${storyMode === 'continue'
                      ? 'bg-[#E97451] text-white shadow-md'
                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[.98] dark:bg-[#0f2334] dark:text-[#C8D6E5] dark:hover:bg-[#152b42]'}`}
                  aria-pressed={storyMode === 'continue'}
                >
                  Continue
                </button>
              </div>

              {storyMode === 'continue' && (
                <select
                  className="
                    w-full p-3 border-2 rounded-md
                    bg-white text-slate-900 border-slate-300
                    dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
                  "
                  value={existingStoryId}
                  onChange={(e) => setExistingStoryId(e.target.value)}
                >
                  <option value="">Select a story…</option>
                  {stories.map((s) => (
                    <option key={s.id} value={s.id}>{s.title || '(untitled)'}</option>
                  ))}
                </select>
              )}
              {storyMode === 'continue' && storiesLoading && (
                <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">Loading your stories…</p>
              )}
            </div>

            {/* Language */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">Language</label>
              <select
                className="
                  w-full p-3 border-2 rounded-md
                  bg-white text-slate-900 border-slate-300
                  dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
                "
                value={draft.language}
                onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value as LangCode }))}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">
                AI prompts and descriptions will use this language.
              </p>
            </div>

            {/* empty spacer to balance grid */}
            <div className="hidden md:block" />
          </div>

          {/* Synopsis */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">Brief Synopsis</label>
            <textarea
              rows={4}
              className="
                w-full p-3 border-2 rounded-md
                bg-white text-slate-900 border-slate-300
                dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
              "
              value={draft.synopsis}
              onChange={(e) => setDraft((d) => ({ ...d, synopsis: e.target.value }))}
              placeholder="A young mage discovers a hidden power that could save or shatter the kingdom..."
            />
          </div>

          {/* Current Story (Category + Pages + Campaign Name) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2">Current Story</label>
              <select
                className="
                  w-full p-3 border-2 rounded-md
                  bg-white text-slate-900 border-slate-300
                  dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
                "
                value={draft.category}
                onChange={(e) => {
                  const nextKey = e.target.value as Draft['category'];
                  setDraft((d) => {
                    const nextPages = clampPagesForCategory(nextKey, d.pages);
                    return { ...d, category: nextKey, pages: nextPages };
                  });
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">
                Allowed pages: {cat.min}–{cat.max}
              </p>

              {draft.category === 'campaign' && (
                <div className="mt-4">
                  <label className="block text-sm font-bold mb-2">Campaign Name</label>
                  <input
                    className="
                      w-full p-3 border-2 rounded-md
                      bg-white text-slate-900 border-slate-300
                      focus:outline-none focus:ring-2 focus:ring-slate-300
                      dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55] dark:focus:ring-[#2c3f55]
                    "
                    value={draft.campaignName || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, campaignName: e.target.value }))}
                    placeholder="e.g., Summer Reading Challenge"
                  />
                  <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">
                    This is saved in <code>metadata.campaignName</code> for discovery filters.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Number of Pages</label>
              <input
                type="range"
                min={cat.min}
                max={cat.max}
                value={draft.pages}
                onChange={(e) => setDraft((d) => ({ ...d, pages: clampPagesForCategory(d.category, Number(e.target.value)) }))}
                className="w-full accent-[#E97451]"
              />
              <div className="text-sm mt-1">
                Pages: <strong>{draft.pages}</strong>
              </div>
            </div>
          </div>

          {/* Start & quick actions */}
          <div className="flex justify-end flex-wrap gap-3 mt-6">
            <button
              className="
                px-5 py-2 rounded-md border
                bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[.98]
                dark:bg-gray-700/40 dark:text-[#C8D6E5] dark:hover:bg-gray-700/70
              "
              onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} location.reload(); }}
            >
              Reset
            </button>

            <button
              onClick={onStartStory}
              disabled={
                starting ||
                (storyMode === 'new' ? !canStartNew : !existingStoryId)
              }
              className={`
                px-6 py-2 rounded-md text-white font-semibold transition transform active:scale-[.98]
                ${storyMode === 'new'
                  ? (canStartNew ? 'bg-[#2e7d32] hover:bg-[#276a2b]' : 'bg-[#2e7d32]/50')
                  : (existingStoryId ? 'bg-[#2e7d32] hover:bg-[#276a2b]' : 'bg-[#2e7d32]/50')}
              `}
              title={storyMode === 'continue' ? 'Load the selected story' : 'Create the new story draft'}
            >
              {storyMode === 'new' ? (starting ? 'Starting…' : 'Start Story') : 'Load Story'}
            </button>

            <button
              className="
                px-6 py-2 rounded-md font-semibold disabled:opacity-50
                bg-[#E97451] text-white hover:bg-[#D46342]
              "
              onClick={async () => {
                try {
                  const id = await ensureStoryId();
                  router.push(`/create/support?storyId=${id}`);
                } catch (e: any) {
                  alert(e?.message || 'Failed to continue.');
                }
              }}
              disabled={!isNextButtonEnabled}
            >
              Next: Build References & AI Support →
            </button>

            <button
              onClick={handleSkipToScenes}
              disabled={
                jumpingScenes ||
                (storyMode === 'new' ? !canStartNew : !existingStoryId)
              }
              className="
                px-6 py-2 rounded-md border-2
                border-slate-300 text-slate-800 bg-white
                hover:bg-slate-100 active:scale-[.98] disabled:opacity-50
                dark:border-[#3D4F60] dark:text-[#C8D6E5] dark:bg-[#0f2334] dark:hover:bg-[#152b42]
              "
            >
              Skip to Scenes →
            </button>
          </div>
        </div>

        {/* Book Cover (hidden until Start Story or Continue) */}
        {showCover && (
          <div className="
            rounded-xl border-2 shadow p-6
            border-slate-300 bg-white text-slate-800
            dark:border-[#344b63] dark:bg-[#142436] dark:text-[#E0C9A0]
          ">
            <h2 className="text-xl font-bold mb-4">Book Cover Image</h2>

            <CoverImageManager
              initialCoverUrl={draft.coverUrl ?? undefined}
              onCoverImageSaved={handleCoverImageSaved}
              storyId={draft.storyId}
              assetRole="cover"
              promptContext={{
                title: draft.title,
                genres: draft.genres,
                synopsis: draft.synopsis,
                language: draft.language,
              }}
            />

            {/* AI Describe panel */}
            <div className="
              mt-4 p-3 rounded-lg border
              border-slate-300 bg-slate-50
              dark:border-[#344b63] dark:bg-black/20
            ">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <button
                  onClick={describeCurrentCover}
                  disabled={descLoading || !draft.coverUrl}
                  className="px-4 py-2 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 hover:bg-[#D46342]"
                >
                  {descLoading ? 'Describing…' : 'AI Describe Cover'}
                </button>
                {descError && <span className="text-red-600 dark:text-red-400 text-sm">{descError}</span>}
              </div>

              {!!descText && (
                <div className="mt-3">
                  <label className="block text-sm font-bold mb-1">AI Description</label>
                  <textarea
                    className="
                      w-full p-3 border-2 rounded-md
                      bg-white text-slate-900 border-slate-300
                      dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
                    "
                    rows={3}
                    value={descText}
                    onChange={(e) => setDescText(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setDraft((d) => ({ ...d, synopsis: descText }))}
                      className="
                        px-3 py-1 rounded-md border
                        bg-slate-200 text-slate-800 hover:bg-slate-300
                        dark:bg-gray-700/40 dark:text-[#C8D6E5] dark:hover:bg-gray-700/70
                      "
                    >
                      Use as Synopsis
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(descText)}
                      className="
                        px-3 py-1 rounded-md border
                        bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[.98]
                        dark:bg-gray-700/40 dark:text-[#C8D6E5] dark:hover:bg-gray-700/70
                      "
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
