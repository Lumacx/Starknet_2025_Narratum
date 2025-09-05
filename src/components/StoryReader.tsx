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

  storyContent: ReaderPage[];
  creator?: { avatarUrl?: string | null } | null;

  premium?: {
    convaiAgentId?: string | null;
    teaserVideoUrl?: string | null;
    freeNavigationIndex?: boolean;
  } | null;
};

interface StoryReaderProps {
  story: StoryView;
  /** Para volver desde el lector */
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

  /** Responsive: narrow cuando <1080 */
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

  const hasFreeNav = !!story?.premium?.freeNavigationIndex;

  /* Ordena páginas por pageNumber */
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
    root.classList.add('reader-mode');
    return () => root.classList.remove('reader-mode');
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

  const goToIndex = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex > sortedStoryContent.length) return;
    pageTurnSoundRef.current?.play();
    setCurrentPageIndex(nextIndex);
    const pg = nextIndex > 0 ? sortedStoryContent[nextIndex - 1] : null;
    if (pg?.audioUrl) playNarration(pg.audioUrl);
  };

  const nextPage = () => goToIndex(currentPageIndex + 1);
  const previousPage = () => goToIndex(currentPageIndex - 1);

  const startStory = () => {
    handleUserInteraction();
    toggleBackgroundMusic();
    nextPage();
  };

  const currentPageContent =
    currentPageIndex > 0 ? sortedStoryContent[currentPageIndex - 1] : null;

  /* Skin */
  const avatarUrl =
    story.readerAvatarUrl || story.creator?.avatarUrl || DEFAULT_AVATAR;

  const backgroundUrl =
    story.readerBackgroundUrl || BG_CHOICES[bgIdx] || BG_CHOICES[0];

  /* Portada */
  const coverImage = story.coverImageUrl || sortedStoryContent[0]?.imageUrl || "";
  const storyImageSrc = currentPageContent?.imageUrl || coverImage || "";

  /* 80% width sizing */
  const containerStyle: React.CSSProperties = {
    width: "min(1000px, 80vw)",
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
    gridTemplateColumns: isNarrow
      ? "1fr"
      : hasFreeNav
      ? "minmax(220px, 24%) 1fr"
      : "minmax(220px, 26%) 1fr",
    gap: "clamp(8px, 2vw, 18px)",
    alignItems: "start",
  };

  const avatarPanelStyle: React.CSSProperties = {
    background: "rgba(20,60,60,0.35)",
    borderRadius: 14,
    padding: "clamp(10px, 2vw, 16px)",
    display: "grid",
    gap: 10,
    placeItems: "center",
    minHeight: isNarrow ? 120 : 180,
  };

  const imagePanelStyle: React.CSSProperties = {
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    padding: "clamp(8px, 1.5vw, 14px)",
  };

  const maxImageHeight = isNarrow ? "54vh" : "66vh";

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
              ← Back
            </button>
          )}
          <div style={{ fontWeight: 700, fontSize: 20 }}>
            {story.title ?? "Untitled"}
          </div>
        </div>

        <div id="header-icons" style={{ display: "flex", gap: 8 }}>
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

          <button
            className="header-icon-btn"
            aria-label="Change Background"
            title="Change Background"
            onClick={() => setBgIdx((i) => (i + 1) % BG_CHOICES.length)}
          >
            <FontAwesomeIcon icon={faPaintBrush} />
          </button>

          <button
            onClick={toggleBackgroundMusic}
            id="play-music-button"
            className="header-icon-btn"
            aria-label="Toggle Music"
            title="Toggle Music"
          >
            <FontAwesomeIcon icon={musicPlaying ? faVolumeMute : faVolumeUp} />
          </button>

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

      {/* Tiny settings */}
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

      {/* Main responsive */}
      <main id="app-main" style={{ marginTop: 6, ...gridStyle }}>
        {/* Panel avatar + Start + Free Nav */}
        <div id="avatar-panel" style={avatarPanelStyle}>
          {avatarUrl ? (
            <img
              id="avatar-image"
              src={avatarUrl}
              alt="Narrator Avatar"
              style={{
                width: isNarrow ? 96 : 120,
                height: isNarrow ? 96 : 120,
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
                marginTop: 8,
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

          {/* Free Navigation Index */}
          {hasFreeNav && sortedStoryContent.length > 0 && (
            <div
              style={{
                width: "100%",
                marginTop: 6,
                maxHeight: isNarrow ? 140 : 240,
                overflow: "auto",
                background: "rgba(0,0,0,0.2)",
                borderRadius: 10,
                padding: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#fff" }}>
                Overview Index
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {/* include a chip for cover as 0 */}
                <button
                  onClick={() => goToIndex(0)}
                  className="chip-btn"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: currentPageIndex === 0 ? "rgba(255,255,255,0.25)" : "transparent",
                    color: "#fff",
                    fontSize: 12,
                  }}
                >
                  Cover
                </button>
                {sortedStoryContent.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToIndex(idx + 1)}
                    className="chip-btn"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.25)",
                      background:
                        currentPageIndex === idx + 1 ? "rgba(255,255,255,0.25)" : "transparent",
                      color: "#fff",
                      fontSize: 12,
                    }}
                    title={p.textContent?.slice(0, 50) || `Page ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
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
      <div id="text-area" style={{ margin: "12px 0 20px" }}>
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

      {/* Footer info */}
      <footer
        id="app-footer"
        style={{
          marginTop: 18,
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

      {/* Optional: Convai widget via agent id */}
      {story?.premium?.convaiAgentId && (
        <>
          <elevenlabs-convai agent-id={story.premium.convaiAgentId}></elevenlabs-convai>
          <script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
        </>
      )}
    </div>
  );
};

export default StoryReader;
