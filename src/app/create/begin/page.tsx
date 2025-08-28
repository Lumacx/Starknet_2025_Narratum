'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { useCreateStory } from '@/hooks/useCreateStory';

/* ------------------------------------------------------------------ */
/* Page constants & types                                              */
/* ------------------------------------------------------------------ */
const GENRES = [
  'Fantasy', 'Sci-Fi', 'Mystery', 'Horror', 'Romance', 'Adventure', "Children's",
  'Comedy', 'Drama', 'Action', 'Other',
] as const;

const CATEGORIES = [
  { key: 'short',    label: 'Short Story (1–10 slides)', min: 1, max: 10 },
  { key: 'novela',   label: 'Novela (5–20 slides)',      min: 5, max: 20 },
  { key: 'campaign', label: 'Campaign (1–20 slides)',    min: 1, max: 20 },
] as const;

type Draft = {
  storyId?: string;
  title: string;
  genres: string[];
  synopsis: string;
  category: typeof CATEGORIES[number]['key'];
  pages: number;
  coverUrl?: string | null;
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
  synopsis?: string;
  genres?: string[];
  category?: Draft['category'];
  pageCount?: number;
  coverImageUrl?: string | null;
  updatedAt?: any;
};

const DRAFT_KEY   = 'newStoryDraft';
const STARTED_KEY = 'newStoryStarted';
const DEFAULTS = {
  avatarUrl: '/avatars/Default.png',
  backgroundUrl: '/story_reader_backgrounds/dream-background.png',
};

/* Helpers */
function isHttpUrl(u?: string | null) {
  return !!u && (u.startsWith('http://') || u.startsWith('https://'));
}
function catConfig(key: Draft['category']) {
  return CATEGORIES.find((c) => c.key === key)!;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function BeginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createStory = useCreateStory();

  type Mode = 'new' | 'continue';
  const [mode, setMode] = useState<Mode>('new');
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');

  const [draft, setDraft] = useState<Draft>({
    title: '',
    genres: [],
    synopsis: '',
    category: 'short',
    pages: 3,
    coverUrl: undefined,
    storyId: undefined,
    reader: { avatarUrl: DEFAULTS.avatarUrl, backgroundUrl: DEFAULTS.backgroundUrl },
  });

  // Gate for revealing the Book Cover section
  const [started, setStarted] = useState<boolean>(false);
  const [startLoading, setStartLoading] = useState<boolean>(false);
  const [startError, setStartError] = useState<string>('');
  const coverSectionRef = useRef<HTMLDivElement | null>(null);

  // AI Describe state
  const [descLoading, setDescLoading] = useState(false);
  const [descText, setDescText] = useState<string>('');
  const [descError, setDescError] = useState<string>('');

  /* ---------------- Load user stories when logged in ---------------- */
  useEffect(() => {
    async function loadStories() {
      if (!user) return setStories([]);
      try {
        const q = query(
          collection(db, 'stories'),
          where('ownerUid', '==', user.uid),
          orderBy('updatedAt', 'desc'),
          orderBy('__name__', 'desc'), // future-proof with your index
          limit(50)
        );
        const snap = await getDocs(q);
        const rows: StorySummary[] = [];
        snap.forEach((doc) => {
          const d = doc.data() as any;
          rows.push({
            id: doc.id,
            title: d?.title || '(untitled)',
            synopsis: d?.synopsis || '',
            genres: d?.genres || [],
            category: (d?.category || 'short') as Draft['category'],
            pageCount: d?.pageCount || 1,
            coverImageUrl: d?.coverImageUrl ?? null,
            updatedAt: d?.updatedAt,
          });
        });
        setStories(rows);
      } catch (e) {
        console.error('Failed to load stories for user', e);
      }
    }
    loadStories();
  }, [user]);

  /* ---------------- Load / Save local draft ---------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const rawStarted = localStorage.getItem(STARTED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDraft((d) => ({
          ...d,
          ...parsed,
          reader: {
            avatarUrl: parsed?.reader?.avatarUrl || DEFAULTS.avatarUrl,
            backgroundUrl: parsed?.reader?.backgroundUrl || DEFAULTS.backgroundUrl,
          },
        }));
        setStarted(rawStarted === '1' || !!parsed.storyId);
      } else {
        // seed empty scenes with page count
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep scenes length in sync with slider
  useEffect(() => {
    setDraft((d) => {
      const target = draft.pages;
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
      return { ...d, scenes: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.pages]);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [draft]);

  const cat = useMemo(() => catConfig(draft.category), [draft.category]);

  /* Create the story on-demand when user presses "Start Story" */
  async function createStoryNow(): Promise<string> {
    if (!user) throw new Error('Please sign in first.');
    if (draft.storyId) return draft.storyId;

    const id = await createStory({
      title: draft.title || '(untitled)',
      synopsis: draft.synopsis || '',
      genres: draft.genres || [],
      category: draft.category,
      pageCount: draft.pages || 0,
      coverImageUrl: null,
      visibility: 'private',
      status: 'draft',
    });

    setDraft((d) => ({ ...d, storyId: id }));
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      obj.storyId = id;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
      localStorage.setItem(STARTED_KEY, '1');
    } catch {}
    return id;
  }

  /* Optimistic Start Story handler with animation feedback */
  async function onStartStory() {
    setStartError('');
    if (!canStart) return;

    // Optimistic reveal
    setStarted(true);
    setStartLoading(true);

    try {
      await createStoryNow();
      // scroll the cover section into view
      setTimeout(() => {
        coverSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } catch (e: any) {
      // revert on failure
      setStarted(false);
      setStartError(e?.message || 'Failed to start story.');
    } finally {
      setStartLoading(false);
    }
  }

  /* Upload cover into canonical path (robust) */
  async function uploadCoverIntoStoryPath(userUid: string, storyId: string, srcUrl: string) {
    const path = `users/${userUid}/stories/${storyId}/images/cover.png`;
    const r = ref(storage, path);

    try {
      if (srcUrl.startsWith('data:')) {
        await uploadString(r, srcUrl, 'data_url');
        return await getDownloadURL(r);
      }

      if (srcUrl.startsWith('gs://')) {
        const httpsSrc = await getDownloadURL(ref(storage, srcUrl));
        const blob = await (await fetch(httpsSrc, { cache: 'no-store' })).blob();
        await uploadBytes(r, blob, { contentType: blob.type || 'image/png' });
        return await getDownloadURL(r);
      }

      if (srcUrl.startsWith('blob:') || srcUrl.startsWith('http')) {
        const resp = await fetch(srcUrl, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`Source fetch failed (${resp.status})`);
        const blob = await resp.blob();
        await uploadBytes(r, blob, { contentType: blob.type || 'image/png' });
        return await getDownloadURL(r);
      }

      throw new Error(`Unsupported cover source: ${srcUrl.slice(0, 32)}…`);
    } catch (e: any) {
      console.error('Upload cover into story path failed:', path, e?.message || e);
      throw e;
    }
  }

  // Called from child after user chooses/saves a cover
  const handleCoverImageSaved = async (url: string) => {
    setDraft((d) => ({ ...d, coverUrl: url })); // optimistic
    try {
      if (!user) throw new Error('Please sign in first.');
      const id = draft.storyId || (await createStoryNow());
      const httpsUrl = await uploadCoverIntoStoryPath(user.uid, id, url);

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

  /* -------- AI Describe for current cover -------- */
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

      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          prompt:
            'Describe this image in one concise paragraph suitable for a story cover prompt.',
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

  /* -------------------- Mode handlers -------------------- */

  function resetToNew() {
    setSelectedStoryId('');
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(STARTED_KEY);
    } catch {}
    setDraft({
      title: '',
      genres: [],
      synopsis: '',
      category: 'short',
      pages: 3,
      coverUrl: undefined,
      storyId: undefined,
      scenes: Array.from({ length: 3 }, () => ({
        text: '',
        imagePrompt: '',
        imageDescription: '',
        imageUrl: null,
        audioUrl: null,
      })),
      reader: { avatarUrl: DEFAULTS.avatarUrl, backgroundUrl: DEFAULTS.backgroundUrl },
    });
    setDescText('');
    setDescError('');
    setStartError('');
    setStarted(false);
  }

  function hydrateFromStory(s: StorySummary) {
    const catKey = (s.category || 'short') as Draft['category'];
    const cfg = catConfig(catKey);
    const pages = Math.min(Math.max(s.pageCount || cfg.min, cfg.min), cfg.max);

    setDraft((d) => ({
      ...d,
      storyId: s.id,
      title: s.title || '',
      synopsis: s.synopsis || '',
      genres: s.genres || [],
      category: catKey,
      pages,
      coverUrl: s.coverImageUrl ?? undefined,
      reader: d.reader ?? { avatarUrl: DEFAULTS.avatarUrl, backgroundUrl: DEFAULTS.backgroundUrl },
      scenes: Array.from({ length: pages }, () => ({
        text: '',
        imagePrompt: '',
        imageDescription: '',
        imageUrl: null,
        audioUrl: null,
      })),
    }));

    try {
      const obj = {
        storyId: s.id,
        title: s.title || '',
        synopsis: s.synopsis || '',
        genres: s.genres || [],
        category: catKey,
        pages,
        coverUrl: s.coverImageUrl ?? undefined,
        reader: { avatarUrl: DEFAULTS.avatarUrl, backgroundUrl: DEFAULTS.backgroundUrl },
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
      localStorage.setItem(STARTED_KEY, '1');
    } catch {}
    setStarted(true);
    setTimeout(() => coverSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }

  const canStart =
    draft.title.trim() !== '' &&
    draft.genres.length > 0 &&
    draft.synopsis.trim() !== '';

  const isNextButtonEnabled =
    started &&
    draft.title.trim() !== '' &&
    draft.genres.length > 0 &&
    draft.synopsis.trim() !== '' &&
    draft.coverUrl != null;

  return (
    <div className="min-h-screen p-6 pb-28 
      bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] 
      text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Begin a New Tale</h1>
          <Link href="/" className="text-sm underline text-[#3A4B5C] dark:text-[#E0C9A0]">Back</Link>
        </div>

        {/* Top Form */}
        <div className="mb-5 rounded-xl border-2 border-[#CBBBA0] bg-[#F3EADF] text-[#3A4B5C] dark:bg-[#2A3645] dark:border-[#4B5A6B] dark:text-[#E0C9A0] shadow p-6">
          {/* Title + Genres + Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-bold mb-2">Title</label>
              <input
                className="w-full p-3 border-2 rounded-md bg-white dark:bg-[#1A2533] text-[#3A4B5C] dark:text-[#E0C9A0]"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="The Rise of the Shadow Dragon"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-bold mb-2">Genres</label>
              <GenreMultiSelect
                genresList={GENRES as any}
                selectedGenres={draft.genres}
                onSelectedGenresChange={(genres) => setDraft((d) => ({ ...d, genres }))}
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-bold mb-2">Story Mode</label>
              <div className="flex gap-3">
                <select
                  className="w-1/2 p-3 border-2 rounded-md bg-white dark:bg-[#1A2533] text-[#3A4B5C] dark:text-[#E0C9A0]"
                  value={mode}
                  onChange={(e) => {
                    const m = e.target.value as Mode;
                    setMode(m);
                    if (m === 'new') resetToNew();
                  }}
                >
                  <option value="new">Create New</option>
                  <option value="continue">Continue</option>
                </select>

                <select
                  disabled={mode !== 'continue'}
                  className="w-1/2 p-3 border-2 rounded-md bg-white disabled:opacity-50 dark:bg-[#1A2533] text-[#3A4B5C] dark:text-[#E0C9A0]"
                  value={selectedStoryId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedStoryId(id);
                    const s = stories.find((x) => x.id === id);
                    if (s) hydrateFromStory(s);
                  }}
                >
                  <option value="" disabled>
                    {mode === 'continue' ? 'Pick a story…' : 'Select a story'}
                  </option>
                  {stories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              {mode === 'continue' && stories.length === 0 && (
                <p className="text-xs mt-2 opacity-80">No stories found for your account.</p>
              )}
            </div>
          </div>

          {/* Synopsis */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">Brief Synopsis</label>
            <textarea
              rows={4}
              className="w-full p-3 border-2 rounded-md bg-white dark:bg-[#1A2533] text-[#3A4B5C] dark:text-[#E0C9A0]"
              value={draft.synopsis}
              onChange={(e) => setDraft((d) => ({ ...d, synopsis: e.target.value }))}
              placeholder="A young mage discovers a hidden power that could save or shatter the kingdom..."
            />
          </div>

          {/* Category + Pages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2">Category</label>
              <select
                className="w-full p-3 border-2 rounded-md bg-white dark:bg-[#1A2533] text-[#3A4B5C] dark:text-[#E0C9A0]"
                value={draft.category}
                onChange={(e) => {
                  const nextKey = e.target.value as Draft['category'];
                  const cfg = catConfig(nextKey);
                  setDraft((d) => ({
                    ...d,
                    category: nextKey,
                    pages: Math.min(Math.max(d.pages, cfg.min), cfg.max),
                  }));
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs mt-1">Allowed pages: {cat.min}–{cat.max}</p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Number of Pages</label>
              <input
                type="range"
                min={cat.min}
                max={cat.max}
                value={draft.pages}
                onChange={(e) => setDraft((d) => ({ ...d, pages: Number(e.target.value) }))}
                className="w-full accent-[#E97451]"
              />
              <div className="text-sm mt-1">Pages: <strong>{draft.pages}</strong></div>
            </div>
          </div>

          {/* Start Story gate (only when creating new) */}
          {mode === 'new' && !started && (
            <div className="mt-6 flex items-center justify-between gap-4">
              {startError && <span className="text-red-600 text-sm">{startError}</span>}
              <div className="grow" />
              <button
                onClick={onStartStory}
                disabled={!canStart || startLoading}
                className={[
                  'px-6 py-2 rounded-md text-white font-semibold',
                  'bg-[#E97451] hover:bg-[#D46342] disabled:opacity-50',
                  'transition transform hover:-translate-y-0.5 active:scale-95',
                  startLoading ? 'cursor-wait' : 'cursor-pointer',
                ].join(' ')}
              >
                {startLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                    Starting…
                  </span>
                ) : (
                  'Start Story'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Book Cover + AI Describe — only after Start Story, or when continuing */}
        {started && (
          <div
            ref={coverSectionRef}
            className="rounded-xl border-2 border-[#CBBBA0] bg-[#F3EADF] text-[#3A4B5C] dark:bg-[#2A3645] dark:border-[#4B5A6B] dark:text-[#E0C9A0] shadow p-6
                       transition-all duration-300 ease-out animate-[fadeIn_.25s_ease-out]"
          >
            <h2 className="text-xl font-bold mb-4">Book Cover Image</h2>

            <CoverImageManager
              initialCoverUrl={draft.coverUrl ?? undefined}
              onCoverImageSaved={handleCoverImageSaved}
              storyId={draft.storyId}
              assetRole="cover"
            />

            {/* AI Describe */}
            <div className="mt-4 p-3 rounded-lg border border-[#CBBBA0] dark:border-[#4B5A6B] bg-white/50 dark:bg-black/20">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <button
                  onClick={describeCurrentCover}
                  disabled={descLoading || !draft.coverUrl}
                  className={[
                    'px-4 py-2 rounded-md text-white font-semibold',
                    'bg-[#E97451] hover:bg-[#D46342] disabled:opacity-50',
                    'transition transform hover:-translate-y-0.5 active:scale-95',
                  ].join(' ')}
                >
                  {descLoading ? 'Describing…' : 'AI Describe Cover'}
                </button>
                {descError && <span className="text-red-600 text-sm">{descError}</span>}
              </div>

              {!!descText && (
                <div className="mt-3">
                  <label className="block text-sm font-bold mb-1">AI Description</label>
                  <textarea
                    className="w-full p-3 border-2 rounded-md bg-white dark:bg-[#1A2533]"
                    rows={3}
                    value={descText}
                    onChange={(e) => setDescText(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setDraft((d) => ({ ...d, synopsis: descText }))}
                      className="px-3 py-1 rounded-md border bg-gray-100 dark:bg-gray-700"
                    >
                      Use as Synopsis
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(descText)}
                      className="px-3 py-1 rounded-md border bg-gray-100 dark:bg-gray-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end flex-wrap gap-3 mt-5 mb-12">
          <button
            className="px-5 py-2 rounded-md border bg-gray-200 dark:bg-gray-700 transition hover:-translate-y-0.5 active:scale-95"
            onClick={resetToNew}
          >
            Reset
          </button>

          <button
            className="px-6 py-2 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 hover:bg-[#D46342] transition transform hover:-translate-y-0.5 active:scale-95"
            onClick={async () => {
              try {
                if (!started) await onStartStory();
                const id = draft.storyId!;
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
            className="px-6 py-2 rounded-md border-2 border-[#3D4F60] text-[#3D4F60] bg-white dark:border-[#4B5A6B] dark:text-[#E0C9A0] dark:bg-[#2A3645] transition transform hover:-translate-y-0.5 active:scale-95"
            onClick={async () => {
              try {
                if (!started) await onStartStory();
                const id = draft.storyId!;
                router.push(`/create/scenes?storyId=${id}`);
              } catch (e: any) {
                alert(e?.message || 'Failed to continue.');
              }
            }}
            disabled={!isNextButtonEnabled}
          >
            Skip to Scenes →
          </button>
        </div>
      </div>
    </div>
  );
}

/* Tailwind keyframes (optional; add to globals.css if you want a true fadeIn):
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
*/
