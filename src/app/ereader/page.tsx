// src/app/ereader/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import StoryReader from '@/components/StoryReader';
import { Loader2 } from 'lucide-react';

type LangCode = 'en'|'es'|'pt'|'fr'|'de'|'it'|'ja'|'ko'|'zh'|'hi'|'ar';

type Scene = {
  id?: string;
  index?: number;
  title?: string;
  text?: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
};

export default function EReaderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storyId = searchParams.get('storyId') || undefined;

  const [loading, setLoading] = useState(true);
  const [storyView, setStoryView] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      if (!storyId) { setLoading(false); return; }
      try {
        const ref = doc(db, 'stories', storyId);
        const snap = await getDoc(ref);
        if (!snap.exists()) { setLoading(false); return; }
        const data = snap.data() as any;

        const scenes: Scene[] = Array.isArray(data.scenes) ? data.scenes : [];
        const ordered = scenes
          .map((s: any, i: number) => ({
            pageNumber: Number.isFinite(s?.index) ? Number(s.index) + 1 : i + 1,
            textContent: String(s?.text ?? ''),
            imageUrl: s?.imageUrl || null,
            audioUrl: s?.audioUrl || null,
            id: String(s?.id || `${i}`),
          }))
          .sort((a: any, b: any) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));

        const view = {
          id: storyId,
          title: String(data.title || 'Untitled'),
          coverImageUrl: ordered[0]?.imageUrl || null,
          backgroundMusicUrl: null, // si luego guardas música global, mapéala aquí
          readerAvatarUrl: data?.reader?.avatarUrl || null,
          readerBackgroundUrl: data?.reader?.backgroundUrl || null,
          storyContent: ordered,
          creator: { avatarUrl: data?.reader?.avatarUrl || null },
        };

        setStoryView(view);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [storyId]);

  if (!storyId) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-center">
          <p className="mb-3">Missing <code>storyId</code>.</p>
          <button onClick={() => router.back()} className="underline">Go back</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm opacity-70">
        <Loader2 className="animate-spin mr-2" /> Loading story…
      </div>
    );
  }

  if (!storyView) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Story not found</h1>
          <p className="opacity-70 mb-4">Check the storyId or save/publish the story first.</p>
          <button onClick={() => router.back()} className="px-4 py-2 rounded border">← Back</button>
        </div>
      </div>
    );
  }

  return <StoryReader story={storyView} />;
}
