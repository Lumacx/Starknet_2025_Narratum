'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  setDoc,
  doc as fsDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';
import type { ScenePage } from '@/lib/story-types';
import StoryReader from '@/components/StoryReader';
import ReaderSkinPicker from '@/components/ReaderSkinPicker';

type OutlineItem = { storyText: string; imagePrompt: string };

const DRAFT_KEY = 'newStoryDraft';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function buildPreviewStory(draft: any, pages: ScenePage[]) {
  return {
    id: 'preview',
    title: draft?.title ?? 'Untitled',
    coverImageUrl: draft?.coverUrl ?? null,
    readerAvatarUrl: draft?.readerAvatarUrl ?? null,       // NEW
    readerBackgroundUrl: draft?.readerBackgroundUrl ?? null, // NEW
    storyContent: (pages ?? []).map((p) => ({
      id: `local-${p.pageNumber}`,
      pageNumber: p.pageNumber,
      textContent: p.text ?? '',
      imageUrl: p.imageUrl ?? null,
      audioUrl: p.audioUrl ?? null,
    })),
  };
}

export default function ScenesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [draft, setDraft] = useState<any>(null);
  const [pages, setPages] = useState<ScenePage[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isOutlining, setIsOutlining] = useState(false);
  const [isImgGen, setIsImgGen] = useState(false);
  const [isTTS, setIsTTS] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // NEW: reader skin local state (persisted into draft)
  const [readerAvatarUrl, setReaderAvatarUrl] = useState<string | null>(null);
  const [readerBackgroundUrl, setReaderBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      setDraft(obj);
      if (Array.isArray(obj.scenes) && obj.scenes.length) {
        setPages(obj.scenes);
      }
      setReaderAvatarUrl(obj.readerAvatarUrl ?? null);
      setReaderBackgroundUrl(obj.readerBackgroundUrl ?? null);
    }
  }, []);

  // persist draft changes (pages + skin)
  useEffect(() => {
    if (!draft) return;
    const next = {
      ...draft,
      scenes: pages,
      readerAvatarUrl,
      readerBackgroundUrl,
    };
    setDraft(next);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  }, [pages, readerAvatarUrl, readerBackgroundUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = draft?.pages ?? 0;
  const cur = pages[currentIdx];

  const canPublish =
    pages.length === total &&
    pages.every((p) => p.imageUrl && p.text && p.text.trim().length > 0);

  async function outline() {
    if (!draft?.synopsis || !total) return;
    try {
      setIsOutlining(true);
      const res = await fetch('/api/story-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: draft.synopsis, pages: total }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'outline failed');

      const next: ScenePage[] = (json.pages as OutlineItem[]).map((p, i) => ({
        pageNumber: i + 1,
        text: p.storyText,
        imagePrompt: p.imagePrompt,
        imageUrl: null,
        narrationText: '',
        audioUrl: null,
      }));
      setPages(next);
      setCurrentIdx(0);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to create outline');
    } finally {
      setIsOutlining(false);
    }
  }

  useEffect(() => {
    if (draft && !pages.length) outline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  async function regenerateImage() {
    if (!cur) return;
    try {
      setIsImgGen(true);
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: cur.imagePrompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'image gen failed');
      const dataUrl = json.dataUrl as string;
      setPages((ps) => {
        const copy = [...ps];
        copy[currentIdx] = { ...copy[currentIdx], imageUrl: dataUrl };
        return copy;
      });
    } catch (e: any) {
      alert(e?.message ?? 'Failed to generate image');
    } finally {
      setIsImgGen(false);
    }
  }

  async function generateAudio() {
    if (!cur) return;
    const text = cur.narrationText?.trim() || cur.text;
    try {
      setIsTTS(true);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: 'Kore', tone: 'a normal' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'tts failed');

      const b64 = json.base64 as string;
      const mime = json.mimeType as string;
      const blob = b64ToWavBlob(b64, mime);
      const blobUrl = URL.createObjectURL(blob);
      setPages((ps) => {
        const copy = [...ps];
        copy[currentIdx] = {
          ...copy[currentIdx],
          audioUrl: blobUrl,
          narrationText: text,
        };
        return copy;
      });
    } catch (e: any) {
      alert(e?.message ?? 'Failed to generate audio');
    } finally {
      setIsTTS(false);
    }
  }

  function b64ToWavBlob(base64: string, mime: string) {
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    if (mime.startsWith('audio/wav'))
      return new Blob([bytes], { type: 'audio/wav' });

    const m = mime.match(/rate=(\d+)/);
    const sampleRate = m ? parseInt(m[1], 10) : 24000;

    const view = new DataView(new ArrayBuffer(44 + bytes.length));
    let p = 0;
    function wrStr(s: string) { for (let i = 0; i < s.length; i++) view.setUint8(p++, s.charCodeAt(i)); }
    function wr32(v: number) { view.setUint32(p, v, true); p += 4; }
    function wr16(v: number) { view.setUint16(p, v, true); p += 2; }
    wrStr('RIFF'); wr32(36 + bytes.length); wrStr('WAVE'); wrStr('fmt '); wr32(16);
    wr16(1); wr16(1); wr32(sampleRate); wr32(sampleRate * 2); wr16(2); wr16(16);
    wrStr('data'); wr32(bytes.length);
    const buf = new Uint8Array(view.buffer);
    buf.set(bytes, 44);
    return new Blob([buf], { type: 'audio/wav' });
  }

  function saveEdits(partial: Partial<ScenePage>) {
    setPages((ps) => {
      const copy = [...ps];
      copy[currentIdx] = { ...copy[currentIdx], ...partial };
      return copy;
    });
  }

  function next() { if (currentIdx < pages.length - 1) setCurrentIdx((i) => i + 1); }
  function prev() { if (currentIdx > 0) setCurrentIdx((i) => i - 1); }

  // Helper: upload any image/audio (data URL, blob URL, or https) → returns https URL
  async function uploadAnyToStorage(path: string, sourceUrl: string): Promise<string> {
    const storageRef = ref(storage, path);

    if (sourceUrl.startsWith('data:')) {
      await uploadString(storageRef, sourceUrl, 'data_url');
      return await getDownloadURL(storageRef);
    }

    const resp = await fetch(sourceUrl);
    if (!resp.ok) throw new Error(`Fetch failed for ${sourceUrl}`);
    const blob = await resp.blob();
    const guessed =
    path.endsWith('.png') ? 'image/png' :
    path.endsWith('.mp3') ? 'audio/mpeg' :
    path.endsWith('.wav') ? 'audio/wav' : blob.type || 'application/octet-stream';
    await uploadBytes(storageRef, blob, { contentType: blob.type || guessed });
    return await getDownloadURL(storageRef);
  }

  // Publish: reuse (or create) storyId, upload assets, upsert storyContents, go to /story/[id]
  async function publishStory() {
    if (!user) return alert('Sign in to publish.');
    if (!pages.length) return alert('No pages to publish.');

    setPublishing(true);
    try {
      // 1) Get or create story document (single canonical ID)
      let storyId: string | undefined = draft?.storyId;
      if (!storyId) {
        const storyRef = await addDoc(collection(db, 'stories'), {
          ownerUid: user.uid,
          title: draft.title,
          synopsis: draft.synopsis ?? '',
          genres: draft.genres ?? [],
          pageCount: pages.length,
          visibility: 'private',
          status: 'draft',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        storyId = storyRef.id;

        // persist storyId back into local draft so future steps reuse it
        setDraft((d: any) => ({ ...d, storyId }));
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const obj = JSON.parse(raw); obj.storyId = storyId;
          localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
        }
      }

      const base = `users/${user.uid}/stories/${storyId}`;

      // 2) Ensure cover is uploaded (if user set one in Begin)
      let coverUrlHttps: string | undefined = draft?.coverUrl;
      if (coverUrlHttps?.startsWith('data:') || coverUrlHttps?.startsWith('blob:')) {
        coverUrlHttps = await uploadAnyToStorage(`${base}/images/cover.png`, coverUrlHttps);
      }

      // 2b) save reader UI skin on the story doc
      await updateDoc(fsDoc(db, 'stories', storyId), {
        coverImageUrl: coverUrlHttps ?? draft?.coverUrl ?? null,
        readerAvatarUrl: readerAvatarUrl ?? null,         // NEW
        readerBackgroundUrl: readerBackgroundUrl ?? null, // NEW
        pageCount: pages.length,
        updatedAt: serverTimestamp(),
      });

      // 3) Upload per-page assets & upsert content docs with deterministic ids
      for (const p of pages) {
        let imageUrlHttps: string | undefined;
        let audioUrlHttps: string | undefined;

        if (p.imageUrl) {
          imageUrlHttps = await uploadAnyToStorage(
            `${base}/images/page${p.pageNumber}.png`,
            p.imageUrl
          );
        }

        if (p.audioUrl) {
          const blob = await (await fetch(p.audioUrl)).blob();
          const mime = blob.type || 'audio/wav';
          const ext = mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : 'webm';
          const path = `${base}/audio/narration_${p.pageNumber}.${ext}`;
          await uploadBytes(ref(storage, path), blob, { contentType: mime });
          audioUrlHttps = await getDownloadURL(ref(storage, path));
        }

        await setDoc(
          fsDoc(db, 'storyContents', `${storyId}_${p.pageNumber}`),
          {
            storyId,
            pageNumber: p.pageNumber,
            textContent: p.text ?? '',
            imageUrl: imageUrlHttps ?? null,
            audioUrl: audioUrlHttps ?? null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // 4) Done → navigate to unified reader
      router.push(`/story/${storyId}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  if (!draft) return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0]">
      <div className="max-w-5xl mx-auto">No draft found. <Link href="/create/begin" className="underline">Go back</Link></div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0]">
      <div className="max-w-6xl mx-auto bg-white/80 border-2 border-[#3D4F60] rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#3D4F60]">Scenes Workspace</h1>
          <div className="flex gap-3">
            <Link href="/create/support" className="underline text-sm">← Back</Link>
            <button
              onClick={publishStory}
              disabled={publishing || !pages.length}
              className="px-4 py-2 rounded-md bg-[#E97451] text-white disabled:opacity-50"
              title={!canPublish ? 'Images and text are recommended on each page' : 'Publish'}
            >
              {publishing ? 'Publishing…' : 'Publish → Story'}
            </button>
          </div>
        </div>

        {/* header meta */}
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
          <div><span className="font-semibold">Title:</span> {draft.title}</div>
          <div><span className="font-semibold">Genres:</span> {draft.genres?.join(', ')}</div>
          <div><span className="font-semibold">Pages:</span> {total}</div>
        </div>

        {/* NEW: Reader UI Skin (global, not per scene) */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-[#3D4F60] mb-2">Reader UI (Avatar & Background)</h2>
          <ReaderSkinPicker
            initialAvatarUrl={readerAvatarUrl}
            initialBackgroundUrl={readerBackgroundUrl}
            onChange={({ avatarUrl, backgroundUrl }) => {
              setReaderAvatarUrl(avatarUrl);
              setReaderBackgroundUrl(backgroundUrl);
            }}
          />
        </div>

        {/* main workspace */}
        <div className="mt-8 grid md:grid-cols-2 gap-8">
          {/* left controls */}
          <div>
            <div className="bg-[#F0D1B0]/30 p-4 rounded-lg border">
              <div className="flex justify-between mb-2">
                <div className="font-semibold">Page {currentIdx + 1} / {pages.length || total}</div>
                <div className="space-x-2">
                  <button className="px-2 py-1 rounded border" onClick={prev} disabled={!pages.length || currentIdx===0}>Prev</button>
                  <button className="px-2 py-1 rounded border" onClick={next} disabled={!pages.length || currentIdx===pages.length-1}>Next</button>
                </div>
              </div>

              {/* story text */}
              <label className="text-sm font-semibold">Story Text</label>
              <textarea
                rows={4}
                value={cur?.text || ''}
                onChange={(e) => saveEdits({ text: e.target.value })}
                className="w-full p-2 border rounded mb-4"
                maxLength={500}
              />

              {/* image prompt */}
              <label className="text-sm font-semibold">Image Description</label>
              <textarea
                rows={3}
                value={cur?.imagePrompt || ''}
                onChange={(e) => saveEdits({ imagePrompt: e.target.value })}
                className="w-full p-2 border rounded"
              />

              <div className="mt-3 flex gap-3">
                <button onClick={regenerateImage} disabled={!cur || isImgGen} className="flex-1 py-2 rounded bg-[#3D4F60] text-white disabled:opacity-50">
                  {isImgGen ? 'Generating…' : 'Generate / Regenerate Image'}
                </button>
                <button onClick={() => setShowModal(true)} disabled={!pages.length} className="px-3 py-2 rounded border">
                  Preview Storybook
                </button>
              </div>
            </div>

            {/* narration */}
            <div className="mt-6 bg-[#D4E1EE]/40 p-4 rounded-lg border">
              <div className="font-semibold mb-2">Narration</div>
              <textarea
                rows={3}
                value={cur?.narrationText ?? cur?.text ?? ''}
                onChange={(e) => saveEdits({ narrationText: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <div className="mt-3 flex gap-3">
                <button onClick={generateAudio} disabled={!cur || isTTS} className="flex-1 py-2 rounded bg-[#3D4F60] text-white disabled:opacity-50">
                  {isTTS ? 'Generating…' : 'Generate Audio'}
                </button>
                <button
                  onClick={() => { const url = cur?.audioUrl; if (url) new Audio(url).play(); }}
                  disabled={!cur?.audioUrl}
                  className="px-3 py-2 rounded border"
                >
                  Preview Audio
                </button>
              </div>
            </div>
          </div>

          {/* right preview grid */}
          <div>
            <div className="text-xl font-bold mb-3">Story Preview</div>
            <div className="grid grid-cols-2 gap-3 h-[70vh] overflow-y-auto border rounded p-3 bg-white/70">
              {pages.map((p, i) => (
                <div key={i}
                  className={`relative aspect-square rounded overflow-hidden border cursor-pointer ${i===currentIdx ? 'ring-2 ring-[#E97451]' : ''}`}
                  onClick={() => setCurrentIdx(i)}
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={`Page ${p.pageNumber}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 bg-gray-100">No image yet</div>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    {p.pageNumber}
                  </div>
                  {p.audioUrl && (
                    <div className="absolute bottom-1 right-1 bg-[#E97451] text-white text-[10px] px-1.5 py-0.5 rounded">AUDIO</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* modal with the canonical StoryReader for preview */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
              <div className="p-3 border-b flex justify-between items-center">
                <div className="font-semibold">{draft.title || 'Preview'}</div>
                <button onClick={() => setShowModal(false)} className="px-3 py-1 rounded border">Close</button>
              </div>
              <div className="flex-1 overflow-auto p-0">
                <div className="min-h-full bg-[#F9F6F0] p-4">
                  <StoryReader story={buildPreviewStory({ ...draft, readerAvatarUrl, readerBackgroundUrl }, pages)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
