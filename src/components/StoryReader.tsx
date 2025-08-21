// src/components/StoryReader.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Story, StoryContent } from "../lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFont,
  faPaintBrush,
  faVolumeUp,
  faCog,
  faChevronLeft,
  faChevronRight,
  faPause,
  faRedo,
  faVolumeMute,
} from "@fortawesome/free-solid-svg-icons";
import "../app/story.css";

// Extiende el tipo base con los campos opcionales que usa el componente
type StoryView = Story & {
  storyContent: StoryContent[];
  backgroundMusicUrl?: string | null;
  coverImageUrl?: string | null;
  creator?: { avatarUrl?: string | null } | null;
};

// Props
interface StoryReaderProps {
  story: StoryView;
}

const StoryReader: React.FC<StoryReaderProps> = ({ story }) => {
  // 0 = portada
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const pageTurnSoundRef = useRef<HTMLAudioElement | null>(null);

  // Evita mutar props: clona y ordena
  const sortedStoryContent = [...story.storyContent].sort(
    (a: StoryContent, b: StoryContent) => (a.pageNumber || 0) - (b.pageNumber || 0)
  );

  useEffect(() => {
    // Inicializa audio
    backgroundMusicRef.current = new Audio(
      story.backgroundMusicUrl || "/story_reader_audio/background-music.mp3"
    );
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.15;

    pageTurnSoundRef.current = new Audio("/story_reader_audio/page-flip.mp3");
    pageTurnSoundRef.current.volume = 0.5;

    setIsLoading(false);

    return () => {
      backgroundMusicRef.current?.pause();
      narrationRef.current?.pause();
    };
    // no dependencias: se configura una vez al montar
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
    if (narrationRef.current) narrationRef.current.pause();
    narrationRef.current = new Audio(audioUrl);
    narrationRef.current.play().catch((e) => console.error("Narration play failed:", e));
  };

  const nextPage = () => {
    if (currentPageIndex < sortedStoryContent.length) {
      pageTurnSoundRef.current?.play();
      const nextIndex = currentPageIndex + 1;
      setCurrentPageIndex(nextIndex);
      const nextPageContent = sortedStoryContent[nextIndex - 1]; // página que acabamos de abrir
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

  if (isLoading) return <div>Loading...</div>;

  // Fallbacks seguros para campos opcionales
  const avatarUrl =
    story.creator?.avatarUrl || "/story_reader_avatars/Default.png";
  const backgroundUrl =
    (currentPageContent as any)?.backgroundUrl ||
    "/story_reader_backgrounds/dream-background.png";
  const storyImageSrc = currentPageContent?.imageUrl || story.coverImageUrl || "";

  return (
    <div id="app-container" onClick={handleUserInteraction}>
      <header id="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginTop: "5px" }}>
          <div id="welcome-text">{story.title}</div>
        </div>
        <div id="header-icons">
          <button className="header-icon-btn" aria-label="Font Settings" title="Font Settings">
            <FontAwesomeIcon icon={faFont} />
          </button>
          <button className="header-icon-btn" aria-label="Drawing Tools" title="Drawing Tools">
            <FontAwesomeIcon icon={faPaintBrush} />
          </button>
          <button
            onClick={toggleBackgroundMusic}
            id="play-music-button"
            className="header-icon-btn"
            aria-label="Play Music"
            title="Play Music"
          >
            <FontAwesomeIcon icon={musicPlaying ? faVolumeMute : faVolumeUp} />
          </button>
          <button id="options-button-new" className="header-icon-btn" aria-label="Settings" title="Settings">
            <FontAwesomeIcon icon={faCog} />
          </button>
        </div>
      </header>

      <div
        id="navigation-controls-bar"
        style={{
          alignItems: "center",
          gap: "15px",
          marginTop: "10px",
          width: "calc(100% - 40px)",
          padding: "5px 0",
          display: "flex",
          justifyContent: "space-between",
          // ❌ 'border-sizing' no existe → ✅ 'border-box'
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

      <main id="app-main" style={{ marginTop: "2px" }}>
        <div id="avatar-panel">
          <img id="avatar-image" src={avatarUrl} alt="Narrator Avatar" />
          {currentPageIndex === 0 && (
            <button id="start-story-button" onClick={startStory}>
              Start Story
            </button>
          )}
        </div>
        <div id="image-panel">
          {/* Fondo dinámico de la página */}
          <div id="story-background" style={{ backgroundImage: `url(${backgroundUrl})` }}>
            <img id="story-image" src={storyImageSrc} alt="Story Image" />
          </div>
        </div>
      </main>

      <div id="text-area" style={{ marginBottom: "20px" }}>
        <div id="text-bubble">
          {currentPageContent?.textContent || 'Click "Start Story" to begin.'}
        </div>
        {currentPageIndex > 0 && currentPageContent?.audioUrl && (
          <button id="read-again-button" onClick={() => playNarration(currentPageContent.audioUrl!)}>
            <FontAwesomeIcon icon={faRedo} /> Read it again
          </button>
        )}
      </div>

      <footer
        id="app-footer"
        style={{
          marginTop: "40px",
          display: "flex",
          justifyContent: "start",
          gap: "10px",
          alignItems: "center",
          padding: "0 20px",
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
