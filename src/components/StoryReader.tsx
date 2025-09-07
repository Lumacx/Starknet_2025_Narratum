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
  faBars,
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
  const [menuOpen, setMenuOpen] = useState(false); // mobile accordion

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

  return (
    <div
      id="app-container"
      onClick={handleUserInteraction}
      className="reader-app"
      style={
        {
          // CSS vars drive sizing from CSS; inline fallback here:
          // @ts-ignore
          "--app-max-w": "80vw",
          "--app-max-h": "80vh",
          "--image-max-vw": "80vw",
          "--image-max-vh": "45vh",
          "--text-max-width": "72ch",
          "--text-font-scale": String(fontScale),
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header id="app-header" className="reader-header">
        <div className="reader-header__left">
          {onBack && (
            <button onClick={onBack} className="btn back-btn" aria-label="Back">
              ← Back
            </button>
          )}
          <div className="reader-title">{story.title ?? "Untitled"}</div>
        </div>

        {/* Controls wrap automatically; hamburger toggles sidebar on small screens */}
        <div className="reader-header__right">
          <button
            className="header-icon-btn"
            aria-label="Font size"
            title="Font size"
            onClick={() =>
              setFontScale((s) => (s >= 1.6 ? 1 : +(s + 0.1).toFixed(1)))
            }
          >
            <FontAwesomeIcon icon={faFont} />
          </button>

          <button
            className="header-icon-btn"
            aria-label="Change background"
            title="Change background"
            onClick={() => setBgIdx((i) => (i + 1) % BG_CHOICES.length)}
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

          {/* Mobile menu button */}
          <button
            className="header-icon-btn show-on-narrow"
            aria-label="Menu"
            title="Menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>
      </header>

      {/* Tiny settings */}
      {showSettings && (
        <div className="settings-pop">
          <div className="settings-pop__title">Reader Settings</div>
          <div className="settings-pop__row">• Font scale: {fontScale.toFixed(1)}</div>
          <div className="settings-pop__row">• Background: {bgIdx + 1}/{BG_CHOICES.length}</div>
        </div>
      )}

      {/* Mobile accordion: Avatar + Free Index */}
      {isNarrow && menuOpen && (
        <div className="mobile-accordion">
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Narrator Avatar"
              className="avatar-img"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
          ) : null}

          {/* Start on cover only */}
          {currentPageIndex === 0 && (
            <button id="start-story-button" className="btn primary" onClick={startStory}>
              Start Story
            </button>
          )}

          {/* Free Navigation Index */}
          {hasFreeNav && sortedStoryContent.length > 0 && (
            <>
              <div className="acc-title">Overview Index</div>
              <div className="chip-row">
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
                    className={`chip-btn ${currentPageIndex === idx + 1 ? "active" : ""}`}
                    title={p.textContent?.slice(0, 50) || `Page ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Barra de transporte superior */}
      <div id="navigation-controls-bar" className="nav-bar">
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

        <div id="audio-progress-container" className="audio-progress-wrap">
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

      {/* Main: grid on desktop, single column on mobile */}
      <main id="app-main" className={`reader-main ${isNarrow ? "single" : ""}`}>
        {/* Sidebar (desktop/tablet only) */}
        {!isNarrow && (
          <aside id="avatar-panel" className="avatar-panel">
            {avatarUrl ? (
              <img
                id="avatar-image"
                src={avatarUrl}
                alt="Narrator Avatar"
                className="avatar-img"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
            ) : null}

            {currentPageIndex === 0 && (
              <button id="start-story-button" className="btn primary" onClick={startStory}>
                Start Story
              </button>
            )}

            {/* Free Navigation Index */}
            {hasFreeNav && sortedStoryContent.length > 0 && (
              <div className="index-box">
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
                      className={`chip-btn ${currentPageIndex === idx + 1 ? "active" : ""}`}
                      title={p.textContent?.slice(0, 50) || `Page ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Image frame (always letterboxed / never overlaps) */}
        <section id="image-panel" className="image-panel">
          <div
            id="story-background"
            className="story-bg"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          >
            <div className="image-frame">
              {storyImageSrc ? (
                <img
                  id="story-image"
                  src={storyImageSrc}
                  alt="Story Image"
                  className="story-img"
                />
              ) : null}
            </div>
          </div>
        </section>
      </main>

      {/* Texto (centered, max-width, scrollable if long) */}
      <div id="text-area" className="text-area">
        <div id="text-bubble" className="text-bubble">
          {currentPageIndex === 0
            ? 'Click "Start Story" to begin.'
            : currentPageContent?.textContent || ""}
        </div>

        {currentPageIndex > 0 && currentPageContent?.audioUrl && (
          <button
            id="read-again-button"
            className="btn"
            onClick={() => playNarration(currentPageContent.audioUrl!)}
          >
            <FontAwesomeIcon icon={faRedo} /> Read it again
          </button>
        )}
      </div>

      {/* Footer */}
      <footer id="app-footer" className="reader-footer">
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
