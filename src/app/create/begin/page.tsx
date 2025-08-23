'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GenreMultiSelect from '@/components/GenreMultiSelect';
import CoverImageManager from '@/components/CoverImageManager';

import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc as fsDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
} from 'firebase/storage';

const GENRES = ['Fantasy','Sci-Fi','Mystery','Horror','Romance','Adventure',"Children's",'Comedy','Drama','Action','Other'] as const;

const CATEGORIES = [
  { key: 'short',    label: 'Short Story (1–10 slides)', min: 1, max: 10 },
  { key: 'novela',   label: 'Novela (5–20 slides)',      min: 5, max: 20 },
  { key: 'campaign', label: 'Campaign (1–20 slides)',    min: 1, max: 20 },
] as const;

type Draft = {
  storyId?: string; // ✅ canonical id used across Begin/Support/Scenes
  title: string;
  genres: string[];
  synopsis: string;
  category: typeof CATEGORIES[number]['key'];
  pages: number;
  coverUrl?: string;
};

const DRAFT_KEY = 'newStoryDraft';

export default function BeginPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [draft, setDraft] = useState<Draft>({
    title: '',
    genres: [],
    synopsis: '',
    category: 'short',
    pages: 3,
    coverUrl: undefined,
    storyId: undefined,
  });

  // Load / Save local draft
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try { setDraft((d) => ({ ...d, ...JSON.parse(raw) })); } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const cat = CATEGORIES.find(c => c.key === draft.category)!;

  // ---------- Canonical storyId handling ----------
  async function ensureStoryId(): Promise<string> {
    if (!user) throw new Error('Please sign in first.');
    if (draft.storyId) return draft.storyId;

    const docRef = await addDoc(collection(db, 'stories'), {
      ownerUid: user.uid,
      title: draft.title || '(untitled)',
      synopsis: draft.synopsis || '',
      genres: draft.genres || [],
      pageCount: draft.pages || 0,
      coverImageUrl: null,
      visibility: 'private',
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setDraft(d => ({ ...d, storyId: docRef.id }));
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        obj.storyId = docRef.id;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
      } catch {}
    }
    return docRef.id;
  }

  async function uploadCoverIntoStoryPath(userUid: string, storyId: string, srcUrl: string) {
    const path = `users/${userUid}/stories/${storyId}/images/cover.png`;
    const r = ref(storage, path);

    if (srcUrl.startsWith('data:')) {
      await uploadString(r, srcUrl, 'data_url');
    } else {
      const blob = await (await fetch(srcUrl)).blob();
      await uploadBytes(r, blob);
    }
    return await getDownloadURL(r);
  }

  // Called by CoverImageManager after user sets a cover
  const handleCoverImageSaved = async (url: string) => {
    setDraft((d) => ({ ...d, coverUrl: url })); // immediate UI update
    try {
      if (!user) throw new Error('Please sign in first.');
      const id = await ensureStoryId();

      // copy into the canonical story path and update story doc
      const httpsUrl = await uploadCoverIntoStoryPath(user.uid, id, url);
      await updateDoc(fsDoc(db, 'stories', id), {
        coverImageUrl: httpsUrl,
        updatedAt: serverTimestamp(),
      });

      // store canonical URL back to draft/localStorage
      setDraft(d => ({ ...d, coverUrl: httpsUrl }));
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        try {
          const obj = JSON.parse(raw);
          obj.coverUrl = httpsUrl;
          obj.storyId = id;
          localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
        } catch {}
      }
    } catch (e: any) {
      console.error('Failed to persist cover to story path:', e?.message || e);
      // keep local cover for UX; it's not fatal
    }
  };

  // Determine if all mandatory fields are filled (for Next button)
  const isNextButtonEnabled =
    draft.title.trim() !== '' &&
    draft.genres.length > 0 &&
    draft.synopsis.trim() !== '' &&
    draft.coverUrl !== undefined && draft.coverUrl !== null;

  return (
    <div className="min-h-screen p-6 pb-28 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0]">
      <div className="max-w-5xl mx-auto">

        {/* ---- Card: Page Header + Back ---- */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-[#3D4F60]">Begin a New Tale</h1>
          <Link href="/" className="text-sm underline">Back</Link>
        </div>

        {/* ---- Card: Top section (Title/Genres/Synopsis/Category/Pages) ---- */}
        <div className="mb-5 rounded-xl border-2 border-[#3D4F60]/20 bg-white/90 shadow p-6">
          {/* Title + Genres */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold mb-2">Title</label>
              <input
                className="w-full p-3 border-2 rounded-md"
                value={draft.title}
                onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="The Rise of the Shadow Dragon"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Genres</label>
              <GenreMultiSelect
                genresList={GENRES as any}
                selectedGenres={draft.genres}
                onSelectedGenresChange={(genres) => setDraft(d => ({ ...d, genres }))}
              />
            </div>
          </div>

          {/* Synopsis */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">Brief Synopsis</label>
            <textarea
              rows={4}
              className="w-full p-3 border-2 rounded-md"
              value={draft.synopsis}
              onChange={(e) => setDraft(d => ({ ...d, synopsis: e.target.value }))}
              placeholder="A young mage discovers a hidden power that could save or shatter the kingdom..."
            />
          </div>

          {/* Category + Pages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2">Category</label>
              <select
                className="w-full p-3 border-2 rounded-md bg-white"
                value={draft.category}
                onChange={(e) => {
                  const nextKey = e.target.value as Draft['category'];
                  const cfg = CATEGORIES.find(c => c.key === nextKey)!;
                  setDraft(d => ({
                    ...d,
                    category: nextKey,
                    pages: Math.min(Math.max(d.pages, cfg.min), cfg.max),
                  }));
                }}
              >
                {CATEGORIES.map(c => (<option key={c.key} value={c.key}>{c.label}</option>))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Allowed pages: {cat.min}–{cat.max}</p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Number of Pages</label>
              <input
                type="range"
                min={cat.min}
                max={cat.max}
                value={draft.pages}
                onChange={(e) => setDraft(d => ({ ...d, pages: Number(e.target.value) }))}
                className="w-full"
              />
              <div className="text-sm mt-1">Pages: <strong>{draft.pages}</strong></div>
            </div>
          </div>
        </div>

        {/* ---- Card: Bottom section (Cover Image area) ---- */}
        <div className="rounded-xl border-2 border-[#B0C4DE] bg-[#F7F3EC] shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-[#3D4F60]">Book Cover Image</h2>
          <CoverImageManager
            initialCoverUrl={draft.coverUrl}
            onCoverImageSaved={handleCoverImageSaved}
          />
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 mt-5 mb-12">
          <button
            className="px-5 py-2 rounded-md border"
            onClick={() => { localStorage.removeItem(DRAFT_KEY); location.reload(); }}
          >
            Reset
          </button>
          <button
            className="px-6 py-2 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 transition-colors hover:bg-[#D46342]"
            onClick={async () => {
              try { await ensureStoryId(); } catch (e:any) { alert(e.message); return; }
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
