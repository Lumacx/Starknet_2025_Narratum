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

  // font size multiplier (drives CSS var --font-size-multiplier)
  const [fontScale, setFontScale] = useState<number>(1);

  // background index cycles: 0 = story’s default (if any), 1..N = BG_CHOICES
  const [bgIdx, setBgIdx] = useState<number>(0);

  const [showSettings, setShowSettings] = useState(false);

  /** Responsive: narrow cuando <1080 */
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1080);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** Refs */
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const pageTurnSoundRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

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
    root.classList.add("reader-mode");
    return () => root.classList.remove("reader-mode");
  }, []);

  // keep CSS var in sync with fontScale (so the "A" button works)
  useEffect(() => {
    rootRef.current?.style.setProperty(
      "--font-size-multiplier",
      String(fontScale)
    );
  }, [fontScale]);

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

  const bumpFont = () => {
    setFontScale((s) => (s >= 1.6 ? 1 : +(s + 0.1).toFixed(1)));
  };

  // cycle through backgrounds: 0 = default (story.readerBackgroundUrl || first choice), then choices
  const cycleBackground = () => {
    // total states = default + choices
    const total = BG_CHOICES.length + 1;
    setBgIdx((i) => (i + 1) % total);
  };

  const currentPageContent =
    currentPageIndex > 0 ? sortedStoryContent[currentPageIndex - 1] : null;

  /* Skin */
  const avatarUrl =
    story.readerAvatarUrl || story.creator?.avatarUrl || DEFAULT_AVATAR;

  // compute background prioritizing story default when bgIdx=0
  const defaultBg = story.readerBackgroundUrl || BG_CHOICES[0];
  const backgroundUrl =
    bgIdx === 0 ? defaultBg : BG_CHOICES[((bgIdx - 1) % BG_CHOICES.length + BG_CHOICES.length) % BG_CHOICES.length];

  /* Portada */
  const coverImage = story.coverImageUrl || sortedStoryContent[0]?.imageUrl || "";
  const storyImageSrc = currentPageContent?.imageUrl || coverImage || "";

  return (
    <div id="app-container" ref={rootRef}>
      {/* Header */}
      <header id="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button
              onClick={onBack}
              className="header-icon-btn"
              aria-label="Back"
              title="Back"
            >
              ← Back
            </button>
          )}
          <div id="welcome-text">{story.title ?? "Untitled"}</div>
        </div>

        <div id="header-icons">
          <button
            className="header-icon-btn"
            aria-label="Font size"
            title="Font size"
            onClick={bumpFont}
          >
            <FontAwesomeIcon icon={faFont} />
          </button>

          <button
            className="header-icon-btn"
            aria-label="Change background"
            title="Change background"
            onClick={cycleBackground}
          >
            <FontAwesomeIcon icon={faPaintBrush} />
          </button>

          <button
            onClick={toggleBackgroundMusic}
            id="play-music-button"
            className="header-icon-btn"
            aria-label="Toggle music"
            title="Toggle music"
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
          id="options-popup"
          className="visible"
          role="dialog"
          aria-label="Reader Settings"
        >
          <button id="close-popup-button" onClick={() => setShowSettings(false)}>
            ×
          </button>
          <h4>Reader Settings</h4>
          <div className="popup-option">
            <label>Font scale</label>
            <div>{fontScale.toFixed(1)}</div>
          </div>
          <div className="popup-option">
            <label>Background</label>
            <div>
              {bgIdx === 0
                ? "Story default"
                : `Choice ${((bgIdx - 1 + BG_CHOICES.length) % BG_CHOICES.length) + 1}/${BG_CHOICES.length}`}
            </div>
          </div>
        </div>
      )}

      {/* Barra de transporte superior */}
      <div id="navigation-controls-bar">
        <button
          id="arrow-left"
          onClick={previousPage}
          className={`nav-arrow ${currentPageIndex === 0 ? "hidden" : ""}`}
          aria-label="Previous Page"
          title="Previous Page"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <button
          id="narration-pause-play-button"
          className="nav-arrow"
          aria-label="Pause/Play Narration"
          title="Pause/Play Narration"
          onClick={() => {
            if (!narrationRef.current) return;
            if (narrationRef.current.paused) narrationRef.current.play();
            else narrationRef.current.pause();
          }}
        >
          <FontAwesomeIcon icon={faPause} />
        </button>

        <div id="audio-progress-container">
          <div id="audio-progress-bar"></div>
        </div>

        <button
          id="arrow-right"
          onClick={nextPage}
          className={`nav-arrow ${
            currentPageIndex === sortedStoryContent.length ? "hidden" : ""
          }`}
          aria-label="Next Page"
          title="Next Page"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Main grid */}
      <main id="app-main">
        {/* Sidebar / Avatar */}
        <aside id="avatar-panel">
          {avatarUrl ? (
            <img
              id="avatar-image"
              src={avatarUrl}
              alt="Narrator Avatar"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
          ) : null}

          {currentPageIndex === 0 && (
            <button id="start-story-button" onClick={startStory}>
              Start Story
            </button>
          )}

          {/* Overview Index (chips) */}
          {hasFreeNav && sortedStoryContent.length > 0 && (
            <div className="index-box" style={{ width: "100%" }}>
              <div className="index-title">Overview Index</div>
              <div className="index-grid">
                <button
                  onClick={() => goToIndex(0)}
                  className={`chip-btn ${currentPageIndex === 0 ? "active" : ""}`}
                >
                  Cover
                </button>
                {sortedStoryContent.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToIndex(idx + 1)}
                    className={`chip-btn ${
                      currentPageIndex === idx + 1 ? "active" : ""
                    }`}
                    title={p.textContent?.slice(0, 50) || `Page ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Image frame */}
        <section id="image-panel">
          <div
            id="story-background"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
            }}
          >
            {storyImageSrc ? (
              <img id="story-image" src={storyImageSrc} alt="Story Image" />
            ) : null}
          </div>
        </section>
      </main>

      {/* Texto */}
      <div id="text-area" style={{ marginTop: "min(2.4vh, 20px)" }}>
        <div id="text-bubble">
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

      {/* Footer */}
      <footer id="app-footer">
        <div id="page-info">
          {currentPageIndex === 0
            ? "Page 0 of " + sortedStoryContent.length
            : `Page ${currentPageIndex} of ${sortedStoryContent.length}`}
        </div>
      </footer>

      {/* Optional: Convai widget via agent id */}
      {story?.premium?.convaiAgentId && (
        <>
          <elevenlabs-convai agent-id={story.premium.convaiAgentId}></elevenlabs-convai>
          <script
            src="https://unpkg.com/@elevenlabs/convai-widget-embed"
            async
            type="text/javascript"
          ></script>
        </>
      )}
    </div>
  );
};

export default StoryReader;
