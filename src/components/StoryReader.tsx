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

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
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

  /* Global reader skin (not per scene) */
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
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
const StoryReader: React.FC<StoryReaderProps> = ({ story, onBack }) => {
  /** 0 = cover */
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  /** UI state */
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  /* (2) Text: start a bit smaller (0.8) and cap increases at 1.4 */
  const [fontScale, setFontScale] = useState<number>(0.8);

  /* (4) Background: 0 = story default (if any), 1..N cycle built-ins */
  const [bgIdx, setBgIdx] = useState<number>(0);

  const [showSettings, setShowSettings] = useState(false);

  /* Responsive helper */
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1080);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Audio refs */
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const pageTurnSoundRef = useRef<HTMLAudioElement | null>(null);

// progress bar fill + rAF book-keeping
const progressFillRef = useRef<HTMLDivElement | null>(null);
const rafIdRef = useRef<number | null>(null);
const wiredAudioRef = useRef<HTMLAudioElement | null>(null);

// compute % and set width of the green bar
const updateProgress = React.useCallback(() => {
  const a = narrationRef.current;
  const fill = progressFillRef.current;
  if (!a || !fill) return;
  const pct = a.duration > 0 ? (a.currentTime / a.duration) * 100 : 0;
  fill.style.width = `${pct}%`;
}, []);

// smooth updates while playing
const startRaf = React.useCallback(() => {
  const tick = () => {
    updateProgress();
    rafIdRef.current = requestAnimationFrame(tick);
  };
  if (rafIdRef.current == null) rafIdRef.current = requestAnimationFrame(tick);
}, [updateProgress]);

const stopRaf = React.useCallback(() => {
  if (rafIdRef.current != null) {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
  }
}, []);

const onEnded = React.useCallback(() => {
  stopRaf();
  updateProgress(); // ensure it ends at 100%
}, [stopRaf, updateProgress]);

// attach listeners to the *current* narration element
function wireNarration(audio: HTMLAudioElement) {
  // remove from previous
  if (wiredAudioRef.current) {
    const prev = wiredAudioRef.current;
    prev.removeEventListener("play", startRaf);
    prev.removeEventListener("pause", stopRaf);
    prev.removeEventListener("loadedmetadata", updateProgress);
    prev.removeEventListener("ended", onEnded);
  }
  wiredAudioRef.current = audio;

  // attach to new
  audio.addEventListener("play", startRaf);
  audio.addEventListener("pause", stopRaf);
  audio.addEventListener("loadedmetadata", updateProgress);
  audio.addEventListener("ended", onEnded);

  // reset bar (0% until metadata lands, then we update)
  updateProgress();
}

// allow click-to-seek on the bar
const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
  const a = narrationRef.current;
  if (!a || !a.duration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
  a.currentTime = ratio * a.duration;
  updateProgress();
};

// cleanup on unmount
useEffect(() => {
  return () => {
    stopRaf();
    if (wiredAudioRef.current) {
      const a = wiredAudioRef.current;
      a.removeEventListener("play", startRaf);
      a.removeEventListener("pause", stopRaf);
      a.removeEventListener("loadedmetadata", updateProgress);
      a.removeEventListener("ended", onEnded);
    }
  };
}, [stopRaf, startRaf, updateProgress, onEnded]);

  /* Root ref to expose CSS var for font scale */
  const rootRef = useRef<HTMLDivElement | null>(null);

  const hasFreeNav = !!story?.premium?.freeNavigationIndex;

  /* Sort pages by pageNumber */
  const sortedStoryContent = useMemo(
    () =>
      [...(story.storyContent || [])].sort(
        (a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0)
      ),
    [story.storyContent]
  );

  /* Init SFX once */
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

  /* Hide host app chrome while mounted */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("reader-mode");
    return () => root.classList.remove("reader-mode");
  }, []);

  /* Keep CSS var synced with state so the text grows from center */
  useEffect(() => {
    rootRef.current?.style.setProperty(
      "--font-size-multiplier",
      String(fontScale)
    );
  }, [fontScale]);

  /* (4) Apply background image to the PAGE (html & body), not the inner box */
  const defaultBg = story.readerBackgroundUrl || BG_CHOICES[0];
  const backgroundUrl =
    bgIdx === 0
      ? defaultBg
      : BG_CHOICES[(bgIdx - 1 + BG_CHOICES.length) % BG_CHOICES.length];

  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    const prevHtmlBg = htmlEl.style.backgroundImage;
    const prevBodyBg = bodyEl.style.backgroundImage;

    const url = `url("${backgroundUrl}")`;
    htmlEl.style.backgroundImage = url;
    bodyEl.style.backgroundImage = url;

    return () => {
      htmlEl.style.backgroundImage = prevHtmlBg;
      bodyEl.style.backgroundImage = prevBodyBg;
    };
  }, [backgroundUrl]);

  /* Helpers */
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

    wireNarration(narrationRef.current); // ← hook up progress listeners

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

  /* (2) Font grow button: cycle 0.8 → 1.4 then wrap */
  const bumpFont = () => {
    setFontScale((s) => {
      const next = +(Math.min(1.4, s + 0.1)).toFixed(1);
      return next >= 1.4 ? 0.8 : next;
    });
  };

  /* Background cycle button */
  const cycleBackground = () => {
    const total = BG_CHOICES.length + 1; // +1 for default
    setBgIdx((i) => (i + 1) % total);
  };

  /* Page model */
  const currentPageContent =
    currentPageIndex > 0 ? sortedStoryContent[currentPageIndex - 1] : null;

  /* Skin */
  const avatarUrl =
    story.readerAvatarUrl || story.creator?.avatarUrl || DEFAULT_AVATAR;

  /* Cover vs current page image */
  const coverImage =
    story.coverImageUrl || sortedStoryContent[0]?.imageUrl || "";
  const storyImageSrc = currentPageContent?.imageUrl || coverImage || "";

  /* ------------------------------------------------------------------ */
  /* Inline frame styles (to guarantee “no crop & no spill”)             */
  /* ------------------------------------------------------------------ */
  // Outer image panel remains your light card.
  const imagePanelStyle: React.CSSProperties = {
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    padding: "clamp(8px, 1.5vw, 14px)",
  };

  // (1 & 3) Strict, letterboxed frame with NO CROP and NO BLEED.
  // - Fixed canvas via aspect-ratio + caps (maxHeight = 45vh)
  // - The <img> will be object-fit: contain; centered; never cropped.
  const imageFrameStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    maxHeight: "45vh",
    display: "grid",
    placeItems: "center",
    background: "rgba(0,0,0,0.55)", // translucent black “display box”
    borderRadius: 14,
    overflow: "hidden", // ensure the image never projects outside
  };

  const imageStyle: React.CSSProperties = {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",           // keep natural proportions
    height: "auto",
    objectFit: "contain",    // (3) NEVER crop
    objectPosition: "center",
    display: "block",
    borderRadius: 10,
  };

  // Give some breathing room so text never bumps the image
  const textAreaExtraMargin: React.CSSProperties = {
    marginTop: "min(2.4vh, 20px)",
  };

  return (
    <div id="app-container" ref={rootRef} onClick={handleUserInteraction}>
      {/* ----------------------- Header ----------------------- */}
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

      {/* -------------------- Settings Pop -------------------- */}
      {showSettings && (
        <div id="options-popup" className="visible" role="dialog" aria-label="Reader Settings">
          <button id="close-popup-button" onClick={() => setShowSettings(false)}>
            ×
          </button>
          <h4>Reader Settings</h4>
          <div className="popup-option">
            <label>Font scale</label>
            <div>{fontScale.toFixed(1)} (max 1.4)</div>
          </div>
          <div className="popup-option">
            <label>Background</label>
            <div>
              {bgIdx === 0
                ? "Story default"
                : `Choice ${(bgIdx - 1 + BG_CHOICES.length) % BG_CHOICES.length + 1}/${BG_CHOICES.length}`}
            </div>
          </div>
        </div>
      )}

      {/* --------------- Top transport controls --------------- */}
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

        <div
          id="audio-progress-container"
          onClick={handleSeek}
          style={{ flexGrow: 1, margin: "0 3px" }}
              >
          <div id="audio-progress-bar" ref={progressFillRef}></div>
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

      {/* -------------------- Main (Grid) --------------------- */}
      <main id="app-main">
        {/* Left: avatar + index */}
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

        {/* Right: image display box (strict, letterboxed) */}
        <section id="image-panel" className="image-panel">
          <div className="image-frame">
            {storyImageSrc ? (
              <img id="story-image" className="story-img" src={storyImageSrc} alt="Story Image" />
            ) : null}
          </div>
        </section>
        </main>

      {/* ---------------- Text (centered, scrollable) --------- */}
      <div id="text-area" style={textAreaExtraMargin}>
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

      {/* ------------------------ Footer ---------------------- */}
      <footer id="app-footer">
        <div id="page-info">
          {currentPageIndex === 0
            ? `Page 0 of ${sortedStoryContent.length}`
            : `Page ${currentPageIndex} of ${sortedStoryContent.length}`}
        </div>
      </footer>

      {/* Optional: ElevenLabs Convai */}
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
