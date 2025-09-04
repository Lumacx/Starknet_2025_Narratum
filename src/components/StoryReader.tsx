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
};

interface StoryReaderProps {
  story: StoryView;
  /** Para volver al editor desde el lector */
  onBack?: () => void;
}

/* Fondos disponibles (puedes añadir más PNGs en /public/story_reader_backgrounds/) */
const BG_CHOICES = [
  "/story_reader_backgrounds/dream-background.png",
  "/story_reader_backgrounds/blockchain-background.png",
  "/story_reader_backgrounds/fantasy-background.png",
  "/story_reader_backgrounds/forest-background.png",
  "/story_reader_backgrounds/space-background.png",
];

const DEFAULT_AVATAR = "/story_reader_avatars/Default.png";

/** Audio fallbacks (cubrimos nombres alternos por si el asset cambia) */
const BGM_CANDIDATES = [
  "/story_reader_audio/background-music.mp3",
  "/story_reader_audio/bgm.mp3",
  "/audio/background-music.mp3",
];
const PAGE_FLIP_CANDIDATES = [
  "/story_reader_audio/page-flip.mp3",
  "/story_reader_audio/page_flip.mp3",
  "/audio/page-flip.mp3",
];

function makeAudioWithFallback(
  urls: string[],
  { loop = false, volume = 1 }: { loop?: boolean; volume?: number } = {}
) {
  const a = new Audio();
  a.loop = loop;
  a.volume = volume;

  let i = 0;
  const trySet = () => {
    a.src = urls[i];
    // Intenta cargar; si el archivo no existe lanzará 'error'
    a.load();
  };
  a.addEventListener("error", () => {
    if (i + 1 < urls.length) {
      i += 1;
      trySet();
    }
  });
  trySet();
  return a;
}

const StoryReader: React.FC<StoryReaderProps> = ({ story, onBack }) => {
  /** 0 = portada */
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  /** UI / estado */
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);

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

  /** --------- AUDIO INIT (single mount) --------- */
  useEffect(() => {
    // BGM: si el story trae URL la usamos como primer candidato
    const bgmCandidates = story.backgroundMusicUrl
      ? [story.backgroundMusicUrl, ...BGM_CANDIDATES]
      : [...BGM_CANDIDATES];
    backgroundMusicRef.current = makeAudioWithFallback(bgmCandidates, {
      loop: true,
      volume: 0.15,
    });

    pageTurnSoundRef.current = makeAudioWithFallback(PAGE_FLIP_CANDIDATES, {
      loop: false,
      volume: 0.5,
    });

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
    try {
      if (musicPlaying) {
        backgroundMusicRef.current?.pause();
      } else {
        // Solo intentamos play tras interacción del usuario (política de autoplay)
        backgroundMusicRef.current?.play().catch(() => {
          // Ignoramos error silenciosamente
        });
      }
      setMusicPlaying((v) => !v);
    } catch {
      /* no-op */
    }
  };

  const playNarration = (audioUrl: string) => {
    if (!audioUrl) return;
    try {
      if (narrationRef.current) narrationRef.current.pause();
      narrationRef.current = new Audio(audioUrl);
      narrationRef.current.play().catch((e) => {
        // Si la URL 404ea o está bloqueada, lo ignoramos
        console.warn("Narration play failed:", e);
      });
    } catch (e) {
      console.warn("Narration init failed:", e);
    }
  };

  const nextPage = () => {
    if (currentPageIndex < sortedStoryContent.length) {
      try {
        pageTurnSoundRef.current?.play().catch(() => {});
      } catch {}
      const nextIndex = currentPageIndex + 1;
      setCurrentPageIndex(nextIndex);
      const nextPageContent = sortedStoryContent[nextIndex - 1];
      if (nextPageContent?.audioUrl) playNarration(nextPageContent.audioUrl);
    }
  };

  const previousPage = () => {
    if (currentPageIndex > 0) {
      try {
        pageTurnSoundRef.current?.play().catch(() => {});
      } catch {}
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

  /* --------- Skin (con defaults seguros) --------- */
  const avatarUrl =
    story.readerAvatarUrl || story.creator?.avatarUrl || DEFAULT_AVATAR;

  // Fondo: permitimos override del usuario (si elige desde el picker)
  const [bgUrl, setBgUrl] = useState<string>(
    story.readerBackgroundUrl || BG_CHOICES[0]
  );
  useEffect(() => {
    // Si el story cambia, re-seed sólo si el usuario no ha cambiado ya manualmente
    setBgUrl((prev) => prev || story.readerBackgroundUrl || BG_CHOICES[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.readerBackgroundUrl]);

  /* Portada: usa cover si existe, si no, primera imagen */
  const coverImage =
    story.coverImageUrl || sortedStoryContent[0]?.imageUrl || "";
  const storyImageSrc = currentPageContent?.imageUrl || coverImage || "";

  /* --------- Estilos responsivos base --------- */
  const containerStyle: React.CSSProperties = {
    width: "min(1200px, 100vw - 16px)",
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

  /* Limitamos la altura del “canvas” para que quepa sin scroll horizontal. */
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

          {/* Background picker */}
          <button
            className="header-icon-btn"
            aria-label="Choose Background"
            title="Choose Background"
            onClick={() => setShowBgPicker((v) => !v)}
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
            • Background: custom
          </div>
        </div>
      )}

      {/* Background picker popover */}
      {showBgPicker && (
        <div
          style={{
            position: "absolute",
            top: 70,
            left: isNarrow ? 12 : 380,
            background: "rgba(0,0,0,0.65)",
            color: "white",
            padding: 12,
            borderRadius: 12,
            zIndex: 45,
            width: isNarrow ? "calc(100% - 24px)" : 320,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Choose background</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            {BG_CHOICES.map((src) => {
              const active = bgUrl === src;
              return (
                <button
                  key={src}
                  onClick={() => setBgUrl(src)}
                  style={{
                    borderRadius: 8,
                    overflow: "hidden",
                    border: active
                      ? "2px solid #BFA071"
                      : "1px solid rgba(255,255,255,0.35)",
                  }}
                >
                  <img
                    src={src}
                    alt="BG"
                    style={{ width: "100%", height: 70, objectFit: "cover", display: "block" }}
                  />
                </button>
              );
            })}
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
            if (narrationRef.current.paused) narrationRef.current.play().catch(() => {});
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
          {/* Evita <img src=""> */}
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
                marginTop: 16,
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

        {/* Panel imagen (mantiene dentro del viewport) */}
        <div id="image-panel" style={imagePanelStyle}>
          <div
            id="story-background"
            style={{
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderRadius: 14,
              padding: "clamp(6px, 1vw, 12px)",
              transition: "background-image 200ms ease",
            }}
          >
            {/* Evita error de <img src=""> */}
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

      {/* Texto + controles de audio adicionales */}
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
            onClick={() => currentPageContent?.audioUrl && playNarration(currentPageContent.audioUrl)}
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
    </div>
  );
};

export default StoryReader;
