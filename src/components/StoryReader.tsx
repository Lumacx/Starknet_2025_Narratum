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
  /** Si prefieres navegar con link, ignora esto y maneja el back desde la página */
  onBack?: () => void;
}

/* Fondos disponibles (mini picker) */
const BG_CHOICES = [
  "/story_reader_backgrounds/dream-background.png",
  "/story_reader_backgrounds/blockchain-background.png",
  "/story_reader_backgrounds/fantasy-background.png",
  "/story_reader_backgrounds/forest-background.png",
  "/story_reader_backgrounds/space-background.png",
];

/* Evita <img src=""> y errores en Next/React */
function safeSrc(u?: string | null): string | undefined {
  const s = (u || "").trim();
  return s ? s : undefined;
}

const DEFAULT_AVATARS = ["/avatars/Default.png", "/story_reader_avatars/Default.png"];
const DEFAULT_MUSIC = "/story_reader_audio/background-music.mp3";
const PAGE_TURN = "/story_reader_audio/page-flip.mp3";

const StoryReader: React.FC<StoryReaderProps> = ({ story, onBack }) => {
  // 0 = cover
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // UI state
  const [fontScale, setFontScale] = useState(1);
  const [showFonts, setShowFonts] = useState(false);
  const [showBrush, setShowBrush] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // background elegido
  const [bgUrl, setBgUrl] = useState<string>(() => {
    return (
      story.readerBackgroundUrl ||
      BG_CHOICES[0] ||
      "/story_reader_backgrounds/dream-background.png"
    );
  });

  // música / interacción
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const pageTurnSoundRef = useRef<HTMLAudioElement | null>(null);

  // ordenar páginas por pageNumber
  const sortedStoryContent = useMemo(
    () =>
      [...(story.storyContent || [])].sort(
        (a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0)
      ),
    [story.storyContent]
  );

  /* Inicializa audios una vez */
  useEffect(() => {
    backgroundMusicRef.current = document.createElement("audio");
    backgroundMusicRef.current.src =
      safeSrc(story.backgroundMusicUrl) || DEFAULT_MUSIC;
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.18;
    backgroundMusicRef.current.preload = "metadata";

    pageTurnSoundRef.current = document.createElement("audio");
    pageTurnSoundRef.current.src = PAGE_TURN;
    pageTurnSoundRef.current.volume = 0.5;
    pageTurnSoundRef.current.preload = "auto";

    return () => {
      backgroundMusicRef.current?.pause();
      narrationRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserInteraction = () => {
    if (!userInteracted) setUserInteracted(true);
  };

  const toggleBackgroundMusic = async () => {
    handleUserInteraction();
    try {
      if (!backgroundMusicRef.current) return;
      if (musicPlaying) {
        backgroundMusicRef.current.pause();
        setMusicPlaying(false);
      } else {
        await backgroundMusicRef.current.play();
        setMusicPlaying(true);
      }
    } catch {
      // Autoplay bloqueado: solo ignoramos
      setMusicPlaying(false);
    }
  };

  const playNarration = (audioUrl: string) => {
    const src = safeSrc(audioUrl);
    if (!src) return;
    if (narrationRef.current) narrationRef.current.pause();
    narrationRef.current = new Audio(src);
    narrationRef.current.play().catch(() => {});
  };

  const nextPage = () => {
    if (currentPageIndex < sortedStoryContent.length) {
      pageTurnSoundRef.current?.play().catch(() => {});
      const nextIndex = currentPageIndex + 1;
      setCurrentPageIndex(nextIndex);
      const nextPageContent = sortedStoryContent[nextIndex - 1];
      if (nextPageContent?.audioUrl) playNarration(nextPageContent.audioUrl);
    }
  };

  const previousPage = () => {
    if (currentPageIndex > 0) {
      pageTurnSoundRef.current?.play().catch(() => {});
      const prevIndex = currentPageIndex - 1;
      setCurrentPageIndex(prevIndex);
      if (prevIndex > 0) {
        const prevPageContent = sortedStoryContent[prevIndex - 1];
        if (prevPageContent?.audioUrl) playNarration(prevPageContent.audioUrl);
      }
    }
  };

  const startStory = async () => {
    handleUserInteraction();
    if (!musicPlaying) await toggleBackgroundMusic();
    nextPage();
  };

  const currentPageContent =
    currentPageIndex > 0 ? sortedStoryContent[currentPageIndex - 1] : null;

  // --------- skins / fuentes ----------
  const avatarUrl =
    safeSrc(story.readerAvatarUrl) ||
    safeSrc(story.creator?.avatarUrl) ||
    DEFAULT_AVATARS.find(Boolean);

  const backgroundUrl = bgUrl;

  const coverImage = safeSrc(story.coverImageUrl);
  const storyImageSrc = safeSrc(currentPageContent?.imageUrl) || coverImage;

  // --------- estilos responsivos ----------
  const containerStyle: React.CSSProperties = {
    width: "min(1100px, 96vw)",
    marginInline: "auto",
    padding: "16px",
  };

  return (
    <div
      id="app-container"
      onClick={handleUserInteraction}
      style={containerStyle}
    >
      {/* HEADER (arriba) */}
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
          {/* FONT PANEL */}
          <button
            className="header-icon-btn"
            aria-label="Font Settings"
            title="Font Settings"
            onClick={() => {
              setShowFonts((v) => !v);
              setShowBrush(false);
              setShowSettings(false);
            }}
          >
            <FontAwesomeIcon icon={faFont} />
          </button>

          {/* BRUSH: abre picker de fondos */}
          <button
            className="header-icon-btn"
            aria-label="Change Background"
            title="Change Background"
            onClick={() => {
              setShowBrush((v) => !v);
              setShowFonts(false);
              setShowSettings(false);
            }}
          >
            <FontAwesomeIcon icon={faPaintBrush} />
          </button>

          {/* MUSIC */}
          <button
            onClick={toggleBackgroundMusic}
            id="play-music-button"
            className="header-icon-btn"
            aria-label="Toggle Music"
            title="Toggle Music"
          >
            <FontAwesomeIcon icon={musicPlaying ? faVolumeMute : faVolumeUp} />
          </button>

          {/* SETTINGS */}
          <button
            id="options-button-new"
            className="header-icon-btn"
            aria-label="Settings"
            title="Settings"
            onClick={() => {
              setShowSettings((v) => !v);
              setShowBrush(false);
              setShowFonts(false);
            }}
          >
            <FontAwesomeIcon icon={faCog} />
          </button>
        </div>
      </header>

      {/* PANELS flotantes */}
      {(showFonts || showBrush || showSettings) && (
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
            minWidth: 240,
            maxWidth: "min(80vw, 360px)",
          }}
        >
          {showFonts && (
            <>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Font size</div>
              <input
                type="range"
                min={0.85}
                max={1.5}
                step={0.05}
                value={fontScale}
                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                • Scale: {fontScale.toFixed(2)}
              </div>
            </>
          )}

          {showBrush && (
            <>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                Backgrounds
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0,1fr))",
                  gap: 6,
                }}
              >
                {BG_CHOICES.map((u) => (
                  <button
                    key={u}
                    onClick={() => setBgUrl(u)}
                    title={u.split("/").pop() || "bg"}
                    style={{
                      border:
                        bgUrl === u
                          ? "2px solid #34d399"
                          : "1px solid rgba(255,255,255,.35)",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt="bg"
                      style={{ width: "100%", height: 48, objectFit: "cover" }}
                    />
                  </button>
                ))}
              </div>
            </>
          )}

          {showSettings && (
            <>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                Reader Settings
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                • Font scale: {fontScale.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                • Background: {bgUrl.split("/").pop()}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                • Music: {musicPlaying ? "on" : "off"}
              </div>
            </>
          )}
        </div>
      )}

      {/* NAV superior */}
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
          className={`arrow nav-arrow ${
            currentPageIndex === 0 ? "hidden" : ""
          }`}
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

      {/* MAIN (avatar + imagen) */}
      <main
        id="app-main"
        style={{
          marginTop: "6px",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
        }}
      >
        {/* Avatar + start */}
        <div id="avatar-panel">
          {avatarUrl ? (
            <img id="avatar-image" src={avatarUrl} alt="Narrator Avatar" />
          ) : null}
          {currentPageIndex === 0 && (
            <button id="start-story-button" onClick={startStory}>
              Start Story
            </button>
          )}
        </div>

        {/* Imagen con fondo */}
        <div id="image-panel">
          <div
            id="story-background"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          >
            {storyImageSrc ? (
              <img id="story-image" src={storyImageSrc} alt="Story Image" />
            ) : null}
          </div>
        </div>
      </main>

      {/* TEXTO */}
      <div id="text-area" style={{ marginBottom: "20px" }}>
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
          >
            <FontAwesomeIcon icon={faRedo} /> Read it again
          </button>
        )}
      </div>

      {/* FOOTER */}
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
          {currentPageIndex === 0
            ? "Cover"
            : `Page ${currentPageIndex} of ${sortedStoryContent.length}`}
        </div>
      </footer>
    </div>
  );
};

export default StoryReader;
