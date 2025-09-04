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
  faStar, // ⭐ premium toggle
} from "@fortawesome/free-solid-svg-icons";
import ElevenLabsConvai from "@/components/premium/ElevenLabsConvai";
import "../app/story.css";

/** Mínimo que necesita el reader (sirve para preview y DB). */
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

  /** Skin global del reader (no por escena) */
  readerAvatarUrl?: string | null;
  readerBackgroundUrl?: string | null;

  /** Premium features (optional) */
  premium?: {
    convaiAgentId?: string | null;
  } | null;

  storyContent: ReaderPage[];
  creator?: { avatarUrl?: string | null } | null;
};

interface StoryReaderProps {
  story: StoryView;
  /** Para volver al editor/descubrir desde el lector */
  onBack?: () => void;
}

/* Fondos disponibles */
const BG_CHOICES = [
  "/story_reader_backgrounds/dream-background.png",
  "/story_reader_backgrounds/blockchain-background.png",
  "/story_reader_backgrounds/fantasy-background.png",
  "/story_reader_backgrounds/forest-background.png",
  "/story_reader_backgrounds/space-background.png",
];

const DEFAULT_AVATAR = "/story_reader_avatars/Default.png";
const DEFAULT_BGM = "/story_reader_audio/background-music.mp3";
const PAGE_FLIP_SFX = "/story_reader_audio/page-flip.mp3";

const StoryReader: React.FC<StoryReaderProps> = ({ story, onBack }) => {
  /** 0 = portada */
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  /** UI / estado */
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [bgIdx, setBgIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  /** Premium toggle UI */
  const [showPremium, setShowPremium] = useState(true);

  /** Responsive: “narrow” cuando el viewport es menor a ~1080 px */
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1080);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** Audio refs */
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const pageTurnSoundRef = useRef<HTMLAudioElement | null>(null);

  /* Ordena páginas por pageNumber de forma segura */
  const sortedStoryContent = useMemo(
    () =>
      [...(story.storyContent || [])].sort(
        (a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0)
      ),
    [story.storyContent]
  );

  /* Init audios una sola vez */
  useEffect(() => {
    backgroundMusicRef.current = new Audio(
      story.backgroundMusicUrl || DEFAULT_BGM
    );
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.15;

    pageTurnSoundRef.current = new Audio(PAGE_FLIP_SFX);
    pageTurnSoundRef.current.volume = 0.5;

    return () => {
      backgroundMusicRef.current?.pause();
      narrationRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ocultar chrome del sitio mientras el reader está montado
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("reader-mode");
    return () => root.classList.remove("reader-mode");
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
    narrationRef.current
      .play()
      .catch((e) => console.error("Narration play failed:", e));
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

  /* Skin (con defaults seguros) */
  const avatarUrl =
    story.readerAvatarUrl || story.creator?.avatarUrl || DEFAULT_AVATAR;

  const backgroundUrl =
    story.readerBackgroundUrl || BG_CHOICES[bgIdx] || BG_CHOICES[0];

  /* Portada: usa cover si existe, si no, primera imagen */
  const coverImage = story.coverImageUrl || sortedStoryContent[0]?.imageUrl || "";
  const storyImageSrc = currentPageContent?.imageUrl || coverImage || "";

  /* Premium config (if present) */
  const premiumAgentId = story.premium?.convaiAgentId || undefined;

  /* === 80% sizing tweaks === */
  const containerStyle: React.CSSProperties = {
    width: "min(960px, 100vw - 16px)", // was 1200px → 960px (~80%)
    margin: "0 auto",
    padding: "clamp(8px, 2vw, 20px)",
  };

  const headerStyle: React.CSSProperties = {
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
  };

  const gridStyle: React.CSSProperties = {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "minmax(220px, 26%) 1fr",
    gap: "clamp(8px, 2vw, 18px)",
    alignItems: "start",
  };

  const avatarPanelStyle: React.CSSProperties = {
    background: "rgba(20,60,60,0.35)",
    borderRadius: 14,
    padding: "clamp(10px, 2vw, 16px)",
    display: "grid",
    placeItems: "center",
    minHeight: isNarrow ? 120 : 180,
  };

  const imagePanelStyle: React.CSSProperties = {
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    padding: "clamp(8px, 1.5vw, 14px)",
  };

  // Reduce image height budget proportionally (~80%)
  const maxImageHeight = isNarrow ? "43vh" : "53vh";

  return (
    <div id="app-container" onClick={handleUserInteraction} style={containerStyle}>
      {/* Header */}
      <header id="app-header" style={headerStyle}>
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
            onClick={() =>
              setFontScale((s) => (s >= 1.4 ? 1 : +(s + 0.1).toFixed(1)))
            }
          >
            <FontAwesomeIcon icon={faFont} />
          </button>

          {/* Background picker (ciclo) */}
          <button
            className="header-icon-btn"
            aria-label="Change Background"
            title="Change Background"
            onClick={() => setBgIdx((i) => (i + 1) % BG_CHOICES.length)}
          >
            <FontAwesomeIcon icon={faPaintBrush} />
          </button>

          {/* Música */}
          <button
            onClick={toggleBackgroundMusic}
            id="play-music-button"
            className="header-icon-btn"
            aria-label="Toggle Music"
            title="Toggle Music"
          >
            <FontAwesomeIcon icon={musicPlaying ? faVolumeMute : faVolumeUp} />
          </button>

          {/* Premium toggle (only if there is something premium to show) */}
          {premiumAgentId && (
            <button
              className="header-icon-btn"
              aria-label="Premium features"
              title={showPremium ? "Hide premium features" : "Show premium features"}
              onClick={() => setShowPremium((v) => !v)}
            >
              <FontAwesomeIcon icon={faStar} />
            </button>
          )}

          {/* Settings panel pequeño */}
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

      {/* Settings flotante */}
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
          <div style={{ fontSize: 12, opacity: 0.85 }}>• Font scale: {fontScale.toFixed(1)}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            • Background: {bgIdx + 1}/{BG_CHOICES.length}
          </div>
        </div>
      )}

      {/* Barra de transporte superior */}
      <div
        id="navigation-controls-bar"
        style={{
          alignItems: "center",
          gap: "12px",
          marginTop: "10px",
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
          className={`arrow nav-arrow ${
            currentPageIndex === sortedStoryContent.length ? "hidden" : ""
          }`}
          aria-label="Next Page"
          title="Next Page"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Main responsive: grid 1col (móvil) / 2col (desktop) */}
      <main id="app-main" style={{ marginTop: 6, ...gridStyle }}>
        {/* Panel avatar / Start */}
        <div id="avatar-panel" style={avatarPanelStyle}>
          {avatarUrl ? (
            <img
              id="avatar-image"
              src={avatarUrl}
              alt="Narrator Avatar"
              style={{
                width: isNarrow ? 96 : 110,
                height: isNarrow ? 96 : 110,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid rgba(255,255,255,0.3)",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
          ) : null}

          {currentPageIndex === 0 && (
            <button
              id="start-story-button"
              onClick={startStory}
              style={{
                marginTop: 14,
                padding: "10px 16px",
                borderRadius: 10,
                background: "#2d3f50",
                color: "white",
                fontWeight: 600,
              }}
            >
              Start Story
            </button>
          )}
        </div>

        {/* Panel imagen */}
        <div id="image-panel" style={imagePanelStyle}>
          <div
            id="story-background"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderRadius: 14,
              padding: "clamp(6px, 1vw, 12px)",
            }}
          >
            {storyImageSrc ? (
              <img
                id="story-image"
                src={storyImageSrc}
                alt="Story Image"
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: maxImageHeight,
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.12)",
                }}
              />
            ) : null}
          </div>
        </div>
      </main>

      {/* Texto */}
      <div id="text-area" style={{ margin: "12px 0 12px" }}>
        <div
          id="text-bubble"
          style={{
            transform: `scale(${fontScale})`,
            transformOrigin: "left top",
          }}
        >
          {currentPageIndex === 0
            ? 'Click "Start Story" to begin.'
            : currentPageContent?.textContent || ""}
        </div>

        {currentPageIndex > 0 && currentPageContent?.audioUrl && (
          <button
            id="read-again-button"
            onClick={() => playNarration(currentPageContent.audioUrl!)}
            style={{ marginTop: 8 }}
          >
            <FontAwesomeIcon icon={faRedo} /> Read it again
          </button>
        )}
      </div>

      {/* Premium section (below main content, like a feature area) */}
      {premiumAgentId && (
        <div style={{ marginTop: 8 }}>
          {/* only renders when showPremium is true */}
          <ElevenLabsConvai agentId={premiumAgentId} hidden={!showPremium} />
        </div>
      )}

      {/* Footer info */}
      <footer
        id="app-footer"
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "flex-start",
          gap: 10,
          alignItems: "center",
          padding: "0 6px",
        }}
      >
        <div id="page-info">
          {currentPageIndex === 0
            ? "Cover"
            : `Page ${currentPageIndex} of ${sortedStoryContent.length}`}
        </div>
      </footer>
    </div>
  );
};

export default StoryReader;
