// src/components/YoutubeVideoPlayer.tsx
'use client';

import React from 'react';
import { useLocale } from '@/context/LocaleContext';

interface YoutubeVideoPlayerProps {
  videoUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const YoutubeVideoPlayer: React.FC<YoutubeVideoPlayerProps> = ({ videoUrl, isOpen, onClose }) => {
  const { t } = useLocale();

  if (!isOpen || !videoUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="relative bg-black rounded-2xl shadow-lg w-full max-w-4xl aspect-video">
        <iframe
          src={videoUrl}
          title={t('yt.title')}
          className="w-full h-full rounded-2xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-red-700"
          aria-label={t('yt.close')}
          title={t('yt.close')}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default YoutubeVideoPlayer;
