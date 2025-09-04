"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFont,
  faPaintBrush,
  faVolumeUp,
  faVolumeMute,
  faCog,
  faChevronLeft,
  faChevronRight,
  faPause,
  faRedo,
} from "@fortawesome/free-solid-svg-icons";
import "../app/story.css";

/** Minimal page shape the reader needs (works for both preview and DB). */
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

interface StoryReaderProps {
  story: StoryView;
  onBack?: () => void; // para volver a Scenes si lo deseas
}

const BG_CHOICES = [
  "/story_reader_backgrounds/dream-background.png",
  "/story_reader_backgrounds/space-1.jpg",
  "/story_reader_backgrounds/forest-1.jpg",
  "/story_reader_backgrounds/paper-1.jpg",
];

const StoryReader: React.FC<StoryReaderProps> = ({ story, onBack }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0); // 0 = cover
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [bgIdx, setBgIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const pageTurnSoundRef = useRef<HTMLAudioElement | null>(null);

  // Order pages
  const sortedStoryContent = useMemo(
    () => [...(story.storyContent || [])].sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0)),
    [story.storyContent]
  );

  useEffect(() => {
    backgroundMusicRef.current = new Audio(story.backgroundMusicUrl || "/story_reader_audio/background-music.mp3");
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.15;

    pageTurnSoundRef.current = new Audio("/story_reader_audio/page-flip.mp3");
    pageTurnSoundRef.current.volume = 0.5;

    return () => {
      backgroundMusicRef.current?.pause();
      narrationRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserInteraction = () => {
    if (!userInteracted) setUserInteracted(true);
  };

  const toggleBackgroundMusic = () => {
    handleUserInteraction();
    if (musicPlaying) backgroundMusicRef.current?.pause();
    else backgroundMusicRef.current?.play();
    setMusicPlaying((v) => !v);
  };

  const playNarration = (audioUrl: string) => {
    if (!audioUrl) return;
    if (narrationRef.current) narrationRef.current.pause();
    narrationRef.current = new Audio(audioUrl);
    narrationRef.current.play().catch((e) => console.error("Narration play failed:", e));
  };

  const nextPage = () => {
    if (currentPageIndex < sortedStoryContent.length) {
      pageTurnSoundRef.current?.play();
      const nextIndex = currentPageIndex + 1;
      setCurrentPageIndex(nextIndex);
      const nextPageContent = sortedStoryContent[nextIndex - 1];
      if (nextPageContent?.audioUrl) playNarration(nextPageContent.audioUrl);
    }
  };

  const previousPage = () => {
    if (currentPageIndex > 0) {
      pageTurnSoundRef.current?.play();
      const prevIndex = currentPageIndex - 1;
      setCurrentPageIndex(prevIndex);
      if (prevIndex > 0) {
        const prevPageContent = sortedStoryContent[prevIndex - 1];
        if (prevPageContent?.audioUrl) playNarration(prevPageContent.audioUrl);
      }
    }
  };

  const startStory = () => {
    handleUserInteraction();
    toggleBackgroundMusic();
    nextPage();
  };

  const currentPageContent =
    currentPageIndex > 0 ? sortedStoryContent[currentPageIndex - 1] : null;

  // Skin defaults
  const avatarUrl =
    story.readerAvatarUrl ||
    story.creator?.avatarUrl ||
    "/story_reader_avatars/Default.png";

  const backgroundUrl =
    story.readerBackgroundUrl ||
    BG_CHOICES[bgIdx] ||
    "/story_reader_backgrounds/dream-background.png";

  const coverImage =
    story.coverImageUrl || sortedStoryContent[0]?.imageUrl || "";

  const storyImageSrc =
    currentPageContent?.imageUrl || coverImage || "";

  return (
    <div
      id="app-container"
      onClick={handleUserInteraction}
      style={{
        maxWidth: 1100,
        margin: "20px auto",
        padding: "16px",
      }}
    >
      {/* Header */}
      <header
        id="app-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.35)",
          color: "white",
          position: "sticky",
          top: 8,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12,
              }}
            >
              ← Back to Scenes
            </button>
          )}
          <div style={{ fontWeight: 700, fontSize: 20 }}>
            {story.title ?? "Untitled"}
          </div>
        </div>

        <div id="header-icons" style={{ display: "flex", gap: 8 }}>
          {/* Font size */}
          <button
            className="header-icon-btn"
            aria-label="Font Settings"
            title="Font Settings"
            onClick={() => setFontScale((s) => (s >= 1.4 ? 1 : +(s + 0.1).toFixed(1)))}
          >
            <FontAwesomeIcon icon={faFont} />
          </button>

          {/* Background picker (ciclo simple) */}
          <button
            className="header-icon-btn"
            aria-label="Change Background"
            title="Change Background"
            onClick={() => setBgIdx((i) => (i + 1) % BG_CHOICES.length)}
          >
            <FontAwesomeIcon icon={faPaintBrush} />
          </button>

          {/* Music */}
          <button
            onClick={toggleBackgroundMusic}
            id="play-music-button"
            className="header-icon-btn"
            aria-label="Toggle Music"
            title="Toggle Music"
          >
            <FontAwesomeIcon icon={musicPlaying ? faVolumeMute : faVolumeUp} />
          </button>

          {/* Simple settings toggle (panel pequeño) */}
          <button
            id="options-button-new"
            className="header-icon-btn"
            aria-label="Settings"
            title="Settings"
            onClick={() => setShowSettings((v) => !v)}
          >
            <FontAwesomeIcon icon={faCog} />
          </button>
        </div>
      </header>

      {/* Settings floating panel */}
      {showSettings && (
        <div
          style={{
            position: "fixed",
            top: 70,
            right: 20,
            background: "rgba(0,0,0,0.6)",
            color: "white",
            padding: 12,
            borderRadius: 12,
            zIndex: 50,
            minWidth: 220,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Reader Settings</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            • Font scale: {fontScale.toFixed(1)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            • Background: {bgIdx + 1}/{BG_CHOICES.length}
          </div>
        </div>
      )}

      {/* Top transport */}
      <div
        id="navigation-controls-bar"
        style={{
          alignItems: "center",
          gap: "12px",
          marginTop: "12px",
          width: "100%",
          padding: "6px 0",
          display: "flex",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <button
          id="arrow-left"
          onClick={previousPage}
          className={`arrow nav-arrow ${currentPageIndex === 0 ? "hidden" : ""}`}
          aria-label="Previous Page"
          title="Previous Page"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <button
          id="narration-pause-play-button"
          className="arrow nav-arrow"
          aria-label="Pause Narration"
          title="Pause Narration"
          onClick={() => {
            if (!narrationRef.current) return;
            if (narrationRef.current.paused) narrationRef.current.play();
            else narrationRef.current.pause();
          }}
        >
          <FontAwesomeIcon icon={faPause} />
        </button>

        <div id="audio-progress-container" style={{ flexGrow: 1, margin: "0 3px" }}>
          <div id="audio-progress-bar"></div>
        </div>

        <button
          id="arrow-right"
          onClick={nextPage}
          className={`arrow nav-arrow ${currentPageIndex === sortedStoryContent.length ? "hidden" : ""}`}
          aria-label="Next Page"
          title="Next Page"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Main */}
      <main id="app-main" style={{ marginTop: "6px" }}>
        <div id="avatar-panel">
          {/* evitar 404 si avatarUrl vacío */}
          {avatarUrl ? (
            <img id="avatar-image" src={avatarUrl} alt="Narrator Avatar" />
          ) : null}
          {currentPageIndex === 0 && (
            <button id="start-story-button" onClick={startStory}>
              Start Story
            </button>
          )}
        </div>
        <div id="image-panel">
          <div id="story-background" style={{ backgroundImage: `url(${backgroundUrl})` }}>
            {/* evitar error de <img src=""> */}
            {storyImageSrc ? (
              <img id="story-image" src={storyImageSrc} alt="Story Image" />
            ) : null}
          </div>
        </div>
      </main>

      {/* Text area */}
      <div id="text-area" style={{ marginBottom: "20px" }}>
        <div
          id="text-bubble"
          style={{ transform: `scale(${fontScale})`, transformOrigin: "left top" }}
        >
          {currentPageIndex === 0
            ? 'Click "Start Story" to begin.'
            : (currentPageContent?.textContent || '')}
        </div>
        {currentPageIndex > 0 && currentPageContent?.audioUrl && (
          <button id="read-again-button" onClick={() => playNarration(currentPageContent.audioUrl!)}>
            <FontAwesomeIcon icon={faRedo} /> Read it again
          </button>
        )}
      </div>

      {/* Footer info */}
      <footer
        id="app-footer"
        style={{
          marginTop: "24px",
          display: "flex",
          justifyContent: "start",
          gap: "10px",
          alignItems: "center",
          padding: "0 6px",
        }}
      >
        <div id="page-info">
          {currentPageIndex === 0 ? "Cover" : `Page ${currentPageIndex} of ${sortedStoryContent.length}`}
        </div>
      </footer>
    </div>
  );
};

export default StoryReader;
