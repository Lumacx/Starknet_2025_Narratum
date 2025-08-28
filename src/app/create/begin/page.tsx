'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GenreMultiSelect from '@/components/GenreMultiSelect';
import CoverImageManager from '@/components/CoverImageManager';

import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { serverTimestamp, updateDoc, doc as fsDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { useCreateStory } from '@/hooks/useCreateStory';

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

type Draft = {
  storyId?: string;
  title: string;
  genres: string[];
  synopsis: string;
  category: typeof CATEGORIES[number]['key'];
  pages: number;
  coverUrl?: string | null;
};

const DRAFT_KEY = 'newStoryDraft';

/* Helpers */
function isHttpUrl(u?: string | null) {
  return !!u && (u.startsWith('http://') || u.startsWith('https://'));
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function BeginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createStory = useCreateStory();

  const [draft, setDraft] = useState<Draft>({
    title: '',
    genres: [],
    synopsis: '',
    category: 'short',
    pages: 3,
    coverUrl: undefined,
    storyId: undefined,
  });

  // AI Describe state
  const [descLoading, setDescLoading] = useState(false);
  const [descText, setDescText] = useState<string>('');
  const [descError, setDescError] = useState<string>('');

  // Load / Save local draft
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try { setDraft((d) => ({ ...d, ...JSON.parse(raw) })); } catch {}
    }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [draft]);

  const cat = CATEGORIES.find((c) => c.key === draft.category)!;

  /* Ensure canonical story doc exists */
  async function ensureStoryId(): Promise<string> {
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
      if (raw) {
        const obj = JSON.parse(raw);
        obj.storyId = id;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
      }
    } catch {}
    return id;
  }

  /* Upload cover into canonical path */
  async function uploadCoverIntoStoryPath(userUid: string, storyId: string, srcUrl: string) {
    const path = `users/${userUid}/stories/${storyId}/images/cover.png`;
    const r = ref(storage, path);
    try {
      if (srcUrl.startsWith('data:')) {
        await uploadString(r, srcUrl, 'data_url');
      } else {
        const resp = await fetch(srcUrl);
        const blob = await resp.blob();
        await uploadBytes(r, blob, { contentType: blob.type || 'image/png' });
      }
      return await getDownloadURL(r);
    } catch (e: any) {
      console.error('Upload cover into story path failed:', path, e?.code, e?.message || e);
      throw e;
    }
  }

  // Called from child after user chooses/saves a cover
  const handleCoverImageSaved = async (url: string) => {
    setDraft((d) => ({ ...d, coverUrl: url })); // optimistic
    try {
      if (!user) throw new Error('Please sign in first.');
      const id = await ensureStoryId();
      const httpsUrl = await uploadCoverIntoStoryPath(user.uid, id, url);

      await updateDoc(fsDoc(db, 'stories', id), {
        coverImageUrl: httpsUrl,
        updatedAt: serverTimestamp(),
      });

      setDraft((d) => ({ ...d, coverUrl: httpsUrl }));
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const obj = JSON.parse(raw);
          obj.coverUrl = httpsUrl;
          obj.storyId = id;
          localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
        }
      } catch {}
      // Optional: auto-describe after setting cover
      // await describeCurrentCover();
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

  const isNextButtonEnabled =
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
          {/* Title + Genres */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold mb-2">Title</label>
              <input
                className="w-full p-3 border-2 rounded-md bg-white dark:bg-[#1A2533] text-[#3A4B5C] dark:text-[#E0C9A0]"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="The Rise of the Shadow Dragon"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Genres</label>
              <GenreMultiSelect
                genresList={GENRES as any}
                selectedGenres={draft.genres}
                onSelectedGenresChange={(genres) => setDraft((d) => ({ ...d, genres }))}
              />
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
                  const cfg = CATEGORIES.find((c) => c.key === nextKey)!;
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
        </div>

        {/* Bottom: Cover + AI Describe */}
        <div className="rounded-xl border-2 border-[#CBBBA0] bg-[#F3EADF] text-[#3A4B5C] dark:bg-[#2A3645] dark:border-[#4B5A6B] dark:text-[#E0C9A0] shadow p-6">
          <h2 className="text-xl font-bold mb-4">Book Cover Image</h2>

          <CoverImageManager
            initialCoverUrl={draft.coverUrl ?? undefined}
            onCoverImageSaved={handleCoverImageSaved}
            storyId={draft.storyId}
            assetRole="cover"
          />

          {/* AI Describe panel */}
          <div className="mt-4 p-3 rounded-lg border border-[#CBBBA0] dark:border-[#4B5A6B] bg-white/50 dark:bg:black/20">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <button
                onClick={describeCurrentCover}
                disabled={descLoading || !draft.coverUrl}
                className="px-4 py-2 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 hover:bg-[#D46342]"
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

        {/* Footer actions */}
        <div className="flex justify-end gap-3 mt-5 mb-12">
          <button
            className="px-5 py-2 rounded-md border bg-gray-200 dark:bg-gray-700"
            onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} location.reload(); }}
          >
            Reset
          </button>
          <button
            className="px-6 py-2 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 hover:bg-[#D46342]"
            onClick={async () => {
              try { await ensureStoryId(); } catch (e: any) { alert(e?.message || 'Failed to create story.'); return; }
              router.push('/create/support');
            }}
            disabled={!isNextButtonEnabled}
          >
            Next: Build References & AI Support →
          </button>
        </div>
      </div>
    </div>
  );
}
