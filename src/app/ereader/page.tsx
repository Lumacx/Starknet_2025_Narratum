'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import StoryReader from '@/components/StoryReader';
import YoutubeVideoPlayer from '@/components/YoutubeVideoPlayer';
import { Download as DownloadIcon, Film as FilmIcon } from 'lucide-react';
import { storyAssetCol } from '@/lib/firestorePaths';

/* ---------- Types StoryReader uses (extended) ---------- */
type ReaderPage = {
  id?: string | null;
  pageNumber?: number | null;
  textContent?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  youtubeVideoUrl?: string | null; // backward-compat
};

type StoryView = {
  id?: string | null;
  title?: string | null;
  coverImageUrl?: string | null;
  backgroundMusicUrl?: string | null;
  readerAvatarUrl?: string | null;
  readerBackgroundUrl?: string | null;
  storyContent: ReaderPage[];
  creator?: { avatarUrl?: string | null; uid?: string | null } | null;
  premium?: {
    convaiAgentId?: string | null;
    teaserVideoUrl?: string | null;
    freeNavigationIndex?: boolean;
  } | null;
};

/* ---------------- Helpers ---------------- */
function safeStr(x: any): string | undefined {
  const s = typeof x === 'string' ? x.trim() : '';
  return s ? s : undefined;
}

type SceneSrc = {
  id?: string | null;
  index?: number | null;
  text?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  youtubeVideoUrl?: string | null;
};

function toReaderShape(storyId: string, d: any): StoryView {
  const scenesSrc: SceneSrc[] = Array.isArray(d?.scenes) ? d.scenes : [];
  const pages: ReaderPage[] = scenesSrc.map((s: SceneSrc, i: number) => ({
    id: safeStr(s?.id) ?? null,
    pageNumber: Number.isFinite(s?.index) ? (s?.index as number) : i,
    textContent: safeStr(s?.text) ?? '',
    imageUrl: safeStr(s?.imageUrl),
    audioUrl: safeStr(s?.audioUrl),
    youtubeVideoUrl: safeStr(s?.youtubeVideoUrl) ?? null,
  }));

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
    creator: d?.creator
      ? {
          avatarUrl: safeStr(d?.creator?.avatarUrl) ?? null,
          uid: safeStr(d?.creator?.uid) ?? null,
        }
      : null,
    premium: d?.premium
      ? {
          convaiAgentId: safeStr(d?.premium?.convaiAgentId) ?? null,
          teaserVideoUrl: safeStr(d?.premium?.teaserVideoUrl) ?? null,
          freeNavigationIndex: !!d?.premium?.freeNavigationIndex,
        }
      : null,
  };
}

// Helper for YT embeds
function toYoutubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}?rel=0&modestbranding=1`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}?rel=0&modestbranding=1`;
    }
    return url; // fallback
  } catch {
    return url;
  }
}

type VideoAsset = {
  id: string;
  sceneIndex?: number | null;
  pageNumber?: number | null;
  kind?: 'page' | 'teaser' | 'raw';
  source?: 'storage' | 'youtube';
  youtubeUrl?: string | null;
  storagePath?: string | null;
};

/* ---------------- Page ---------------- */
export default function EReaderPage() {
  const params = useSearchParams();
  const router = useRouter();

  const storyId = params.get('storyId') || '';
  const backParam = params.get('back') || params.get('backHref') || '';

  const backHref = useMemo(
    () =>
      backParam ||
      (storyId
        ? `/create/scenes?storyId=${encodeURIComponent(storyId)}`
        : '/discover'),
    [backParam, storyId]
  );

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<StoryView | null>(null);
  const [error, setError] = useState<string>('');

  // Active page index for scene video logic
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // YouTube modal
  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(false);

  // Loaded video assets (new asset-hub model)
  const [videos, setVideos] = useState<VideoAsset[]>([]);

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

  // Load video assets from the new tree once we know the story owner uid
  useEffect(() => {
    (async () => {
      const ownerUid = story?.creator?.uid;
      if (!ownerUid || !story?.id) return;

      try {
        const col = storyAssetCol(db, ownerUid, story.id, 'videos');
        const qv = query(col, orderBy('createdAt', 'asc'));
        const ss = await getDocs(qv);
        const results: VideoAsset[] = ss.docs.map((d) => ({
          id: d.id,
          sceneIndex: d.get('sceneIndex') ?? null,
          pageNumber: d.get('pageNumber') ?? null,
          kind: d.get('kind') ?? 'raw',
          source: d.get('source') ?? 'youtube',
          youtubeUrl: d.get('youtubeUrl') ?? null,
          storagePath: d.get('storagePath') ?? null,
        }));
        setVideos(results);
      } catch (e) {
        console.warn('Failed to load video assets:', e);
      }
    })();
  }, [story?.creator?.uid, story?.id]);

  const handleDownloadPdf = useCallback(() => {
    if (storyId) {
      window.open(
        `/api/download-story-pdf?storyId=${encodeURIComponent(storyId)}`,
        '_blank'
      );
    }
  }, [storyId]);

  // "All Files" route to zip everything
  const handleDownloadAllFiles = useCallback(() => {
    if (!storyId) return;
    const ownerUid = story?.creator?.uid || '';
    const url = `/api/download-story-assets?storyId=${encodeURIComponent(
      storyId
    )}&ownerUid=${encodeURIComponent(ownerUid)}`;
    window.open(url, '_blank');
  }, [storyId, story?.creator?.uid]);

  // Try to subscribe to page changes from StoryReader if it supports it
  const storyReaderProps: any = {
    story,
    onBack: () => {
      router.push(backHref || '/discover');
      setTimeout(() => window.location.reload(), 100);
    },
    onPageChange: (idx: number) => setActiveIndex(idx),
  };

  // Video selection priority:
  // 1) Asset scene match  2) Page field youtubeVideoUrl (legacy)
  // 3) Asset teaser       4) Story premium teaser
  const sceneVideoFromAssets =
    videos.find(
      (v) => (v.sceneIndex ?? v.pageNumber) === activeIndex && v.youtubeUrl
    )?.youtubeUrl || null;

  const sceneVideoFromPage =
    story?.storyContent?.[activeIndex]?.youtubeVideoUrl || null;

  const teaserVideoFromAssets =
    videos.find((v) => v.kind === 'teaser' && v.youtubeUrl)?.youtubeUrl || null;

  const teaserVideoFromStory = story?.premium?.teaserVideoUrl || null;

  const playableUrl =
    sceneVideoFromAssets ||
    sceneVideoFromPage ||
    teaserVideoFromAssets ||
    teaserVideoFromStory ||
    null;

  const playableEmbed = playableUrl ? toYoutubeEmbed(playableUrl) : null;
  const hasAnyVideo = !!playableEmbed;

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
            onClick={() => {
              router.push(backHref);
              setTimeout(() => window.location.reload(), 100);
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }
  if (!story) return null;

  return (
    <div className="w-screen min-h-screen">
      {/* Story Reader */}
      <StoryReader {...storyReaderProps} />

      {/* Bottom-left: PDF + All Files */}
      <div className="fixed bottom-4 left-4 flex items-center gap-2 z-50">
        <button
          onClick={handleDownloadPdf}
          className="px-4 py-2 rounded-md bg-teal-500 text-white flex items-center gap-2"
          aria-label="Download PDF"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>PDF</span>
        </button>
        <button
          onClick={handleDownloadAllFiles}
          className="px-4 py-2 rounded-md bg-teal-500 text-white flex items-center gap-2"
          aria-label="Download all files"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>All Files</span>
        </button>
      </div>

      {/* Bottom-center: Video */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => hasAnyVideo && setIsVideoOpen(true)}
          disabled={!hasAnyVideo}
          className={`px-4 py-2 rounded-md flex items-center gap-2 ${
            hasAnyVideo
              ? 'bg-violet-500 text-white'
              : 'bg-gray-400 text-white opacity-70 cursor-not-allowed'
          }`}
          aria-label="Play video"
          title={hasAnyVideo ? 'Play video' : 'No video available'}
        >
          <FilmIcon className="w-4 h-4" />
          <span>Video</span>
        </button>
      </div>

      {/* Bottom-right: ElevenLabs widget slot */}
      <div id="elevenlabs-widget" className="fixed bottom-4 right-4 z-50" />

      {/* YouTube overlay player */}
      <YoutubeVideoPlayer
        videoUrl={playableEmbed}
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
      />
    </div>
  );
}
