'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import StoryReader from '@/components/StoryReader';

type Scene = {
  id?: string | null;
  index?: number | null;
  title?: string | null;
  text?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
};

type StoryDoc = {
  title?: string | null;
  coverImageUrl?: string | null;
  language?: string | null;
  reader?: { avatarUrl?: string | null; backgroundUrl?: string | null } | null;
  scenes?: Scene[];
};

export default function EReaderPage() {
  const params = useSearchParams();
  const router = useRouter();
  const storyId = params.get('storyId');

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<StoryDoc | null>(null);

  useEffect(() => {
    (async () => {
      if (!storyId) { setLoading(false); return; }
      try {
        const ref = doc(db, 'stories', storyId);
        const snap = await getDoc(ref);
        if (!snap.exists()) { setLoading(false); return; }
        const data = (snap.data() || {}) as StoryDoc;
        setStory(data);
      } catch (e) {
        console.error('Failed to load story for reader', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [storyId]);

  const storyView = useMemo(() => {
    const s = story || {};
    const scenes = (s.scenes || [])
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((x, i) => ({
        id: x.id ?? String(i + 1),
        pageNumber: (x.index ?? i) + 1,
        textContent: x.text ?? '',
        imageUrl: x.imageUrl ?? null,
        audioUrl: x.audioUrl ?? null,
      }));

    // Fallback de portada: primera imagen de escenas
    const cover = s.coverImageUrl || scenes[0]?.imageUrl || null;

    return {
      id: storyId,
      title: s.title ?? 'Untitled',
      coverImageUrl: cover,
      readerAvatarUrl: s.reader?.avatarUrl || '/story_reader_avatars/Default.png',
      readerBackgroundUrl: s.reader?.backgroundUrl || '/story_reader_backgrounds/dream-background.png',
      storyContent: scenes,
    };
  }, [story, storyId]);

  if (!storyId) return <div className="p-6">Missing storyId.</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (!story) return <div className="p-6">Story not found.</div>;

  return (
    <div className="w-screen min-h-screen" style={{ background: '#0b1220 url(/story_reader_backgrounds/dream-background.png) center/cover fixed no-repeat' }}>
      <StoryReader
        story={storyView as any}
        onBack={() => router.push(`/create/scenes?storyId=${encodeURIComponent(storyId)}`)}
      />
    </div>
  );
}
