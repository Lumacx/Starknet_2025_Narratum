'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import StoryReader from '@/components/StoryReader';

/* ---------- Tipos mínimos que usa StoryReader ---------- */
type ReaderPage = {
  id?: string | null;
  pageNumber?: number | null;
  textContent?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
};

type StoryView = {
  id?: string | null;
  title?: string | null;
  coverImageUrl?: string | null;
  backgroundMusicUrl?: string | null;
  readerAvatarUrl?: string | null;
  readerBackgroundUrl?: string | null;
  storyContent: ReaderPage[];
  creator?: { avatarUrl?: string | null } | null;
};

/* ---------------- Helpers de saneo ---------------- */
function safeStr(x: any): string | undefined {
  const s = typeof x === 'string' ? x.trim() : '';
  return s ? s : undefined;
}

function toReaderShape(storyId: string, d: any): StoryView {
  const scenesSrc: any[] = Array.isArray(d?.scenes) ? d.scenes : [];
  const pages: ReaderPage[] = scenesSrc.map((s, i) => ({
    id: safeStr(s?.id) ?? null,
    pageNumber: Number.isFinite(s?.index) ? s.index : i + 1,
    textContent: safeStr(s?.text) ?? '',
    imageUrl: safeStr(s?.imageUrl),
    audioUrl: safeStr(s?.audioUrl),
  }));

  // Asegura orden por pageNumber
  pages.sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));

  const cover =
    safeStr(d?.coverImageUrl) ||
    (pages.length && safeStr(pages[0]?.imageUrl)) ||
    undefined;

  return {
    id: storyId,
    title: safeStr(d?.title) ?? '(untitled)',
    coverImageUrl: cover,
    backgroundMusicUrl: safeStr(d?.backgroundMusicUrl),
    readerAvatarUrl:
      safeStr(d?.reader?.avatarUrl) ||
      safeStr(d?.creator?.avatarUrl) ||
      '/story_reader_avatars/Default.png',
    readerBackgroundUrl:
      safeStr(d?.reader?.backgroundUrl) ||
      '/story_reader_backgrounds/dream-background.png',
    storyContent: pages,
    creator: d?.creator ? { avatarUrl: safeStr(d?.creator?.avatarUrl) ?? null } : null,
  };
}

/* ---------------- Página ---------------- */
export default function EReaderPage() {
  const params = useSearchParams();
  const router = useRouter();

  const storyId = params.get('storyId') || '';
  const backParam = params.get('back') || params.get('backHref') || '';

  // Si no se pasa back, volvemos al editor de escenas
  const backHref = useMemo(
    () =>
      backParam ||
      (storyId ? `/create/scenes?storyId=${encodeURIComponent(storyId)}` : '/'),
    [backParam, storyId]
  );

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<StoryView | null>(null);
  const [error, setError] = useState<string>('');

  // Activa/limpia el modo lector también desde aquí
  useEffect(() => {
    try {
      document.documentElement.classList.add('reader-mode');
      // Opcional: llevar scroll al top
      window.scrollTo({ top: 0, behavior: 'instant' as any });
    } catch {}
    return () => {
      try {
        document.documentElement.classList.remove('reader-mode');
      } catch {}
    };
  }, []);

  // Cargar historia
  useEffect(() => {
    (async () => {
      if (!storyId) {
        setError('Missing storyId');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const ref = doc(db, 'stories', storyId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError('Story not found.');
          setStory(null);
        } else {
          setStory(toReaderShape(snap.id, snap.data()));
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load story.');
        setStory(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [storyId]);

  // Back que limpia la clase y fuerza un refresh para restaurar fondos/estilos de la página previa.
  const handleBack = useCallback(() => {
    try {
      document.documentElement.classList.remove('reader-mode');
    } catch {}
    router.push(backHref);
    // pequeño refresh después de navegar para evitar residuos visuales
    setTimeout(() => {
      try {
        window.location.reload();
      } catch {}
    }, 30);
  }, [backHref, router]);

  if (!storyId) return <div className="p-6">Missing <code>storyId</code>.</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto rounded-lg border p-4 bg-white">
          <h2 className="font-bold mb-2">Preview error</h2>
          <p className="text-sm mb-3">{error}</p>
          <button
            className="px-4 py-2 rounded-md bg-[#3D4F60] text-white"
            onClick={handleBack}
          >
            ← Back to Scenes
          </button>
        </div>
      </div>
    );
  }
  if (!story) return null;

  return (
    <div className="w-screen min-h-screen">
      <StoryReader story={story} onBack={handleBack} />
    </div>
  );
}
