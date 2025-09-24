// src/components/StoryReader.tsx
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

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/context/LocaleContext";

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
  const { t } = useLocale();

  /** 0 = cover */
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  /** UI state */
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  /* Text scale */
  const [fontScale, setFontScale] = useState<number>(0.8);

  /* Background cycle (0 = story default) */
  const [bgIdx, setBgIdx] = useState<number>(0);

  const [showSettings, setShowSettings] = useState(false);

  /* ✅ Glow state for the right arrow */
  const [showNextHint, setShowNextHint] = useState(false);

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
  // Use a simple ref for the *current* narration audio element
  const currentNarrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const pageTurnSoundRef = useRef<HTMLAudioElement | null>(null);

  // progress bar fill + rAF book-keeping
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const endedTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For the fallback timeout

  /* Root ref to expose CSS var for font scale */
  const rootRef = useRef<HTMLDivElement | null>(null);

  const hasFreeNav = !!story?.premium?.freeNavigationIndex;

  /* ---------- IMPORTANT: compute sorted pages BEFORE callbacks that use it ---------- */
  const sortedStoryContent = useMemo(
    () =>
      [...(story.storyContent || [])].sort(
        (a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0)
      ),
    [story.storyContent]
  );

  // compute % and set width of the green bar
  const updateProgress = React.useCallback(() => {
    const a = currentNarrationAudioRef.current;
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

  /** 🔔 When narration ends, show green glow on next arrow */
  const onEnded = React.useCallback(() => {
    if (endedTimeoutRef.current) {
      clearTimeout(endedTimeoutRef.current);
      endedTimeoutRef.current = null;
    }
    stopRaf();
    updateProgress(); // ensure it ends at 100%
    if (currentPageIndex > 0 && currentPageIndex < sortedStoryContent.length) {
      setShowNextHint(true);
    }
  }, [stopRaf, updateProgress, currentPageIndex, sortedStoryContent.length]);

  // attach listeners to the *current* narration element
  function wireNarration(audio: HTMLAudioElement) {
    if (currentNarrationAudioRef.current && currentNarrationAudioRef.current !== audio) {
      const prev = currentNarrationAudioRef.current;
      prev.removeEventListener("play", startRaf);
      prev.removeEventListener("pause", stopRaf);
      prev.removeEventListener("loadedmetadata", () => {});
      prev.removeEventListener("ended", onEnded);
    }

    if (endedTimeoutRef.current) {
      clearTimeout(endedTimeoutRef.current);
      endedTimeoutRef.current = null;
    }

    currentNarrationAudioRef.current = audio;

    audio.addEventListener("play", () => {
      setShowNextHint(false);
      startRaf();
    });
    audio.addEventListener("pause", stopRaf);
    audio.addEventListener("loadedmetadata", () => {
      updateProgress();

      if (audio.duration && Number.isFinite(audio.duration)) {
        const delay = audio.duration * 1000 + 500;
        if (endedTimeoutRef.current) clearTimeout(endedTimeoutRef.current);
        endedTimeoutRef.current = setTimeout(() => {
          onEnded();
        }, delay);
      }
    });
    audio.addEventListener("ended", onEnded);

    updateProgress();
  }

  // allow click-to-seek on the bar
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = currentNarrationAudioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    a.currentTime = ratio * a.duration;
    updateProgress();
  };

  const router = useRouter();
  const sp = useSearchParams();

  const handleBackClick = React.useCallback(() => {
    const back = sp?.get("back") ? decodeURIComponent(sp.get("back")!) : null;
    const storyIdQ = sp?.get("storyId");

    if (back === "/discover") {
      router.push("/discover");
      return;
    }
    if (back === "/create/scenes") {
      const q = storyIdQ ? `?storyId=${encodeURIComponent(storyIdQ)}` : "";
      router.push(`/create/scenes${q}`);
      return;
    }

    if (onBack) {
      onBack();
      return;
    }
    router.back();
  }, [router, sp, onBack]);

  /* ------------------------------------------------------------------ */
  /* Effects                                                            */
  /* ------------------------------------------------------------------ */

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopRaf();
      if (currentNarrationAudioRef.current) {
        const a = currentNarrationAudioRef.current;
        a.removeEventListener("play", startRaf);
        a.removeEventListener("pause", stopRaf);
        a.removeEventListener("loadedmetadata", () => {});
        a.removeEventListener("ended", onEnded);
      }
      if (endedTimeoutRef.current) {
        clearTimeout(endedTimeoutRef.current);
        endedTimeoutRef.current = null;
      }
    };
  }, [stopRaf, startRaf, onEnded]);

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
      currentNarrationAudioRef.current?.pause();
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

  // ===== Overview Index pagination (2 rows) =====
  const [indexPage, setIndexPage] = useState(0);
  const [indexCols, setIndexCols] = useState(4); // desktop default

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setIndexCols(w <= 380 ? 2 : w <= 768 ? 3 : 4);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const pageSize = indexCols * 2; // exactly 2 rows
  const indexItems = useMemo(
    () => [
      { label: t("reader.index.cover"), idx: 0 },
      ...sortedStoryContent.map((_, i) => ({ label: String(i + 1), idx: i + 1 })),
    ],
    [sortedStoryContent, t]
  );
  const totalIndexPages = Math.max(1, Math.ceil(indexItems.length / pageSize));
  const pageStart = indexPage * pageSize;
  const visibleIndexItems = indexItems.slice(pageStart, pageStart + pageSize);
  const canPrevIndex = indexPage > 0;
  const canNextIndex = indexPage < totalIndexPages - 1;

  useEffect(() => {
    const cur = currentPageIndex; // 0..N
    const requiredPage = Math.floor(cur / pageSize);
    if (requiredPage !== indexPage) setIndexPage(requiredPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageIndex, pageSize]);

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
    if (currentNarrationAudioRef.current) currentNarrationAudioRef.current.pause();

    const newAudio = new Audio(audioUrl);
    currentNarrationAudioRef.current = newAudio;
    setShowNextHint(false);
    wireNarration(newAudio);
    newAudio.play().catch(() => {});
  };

  const goToIndex = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex > sortedStoryContent.length) return;
    pageTurnSoundRef.current?.play();
    setCurrentPageIndex(nextIndex);
    setShowNextHint(false);
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

  /* Font grow button: cycle 0.8 → 1.2 then wrap */
  const bumpFont = () => {
    setFontScale((s) => {
      const next = +(Math.min(1.2, s + 0.1)).toFixed(1);
      return next >= 1.2 ? 0.8 : next;
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

  const startLabel = t("reader.startStory");

  return (
    <div id="app-container" ref={rootRef} onClick={handleUserInteraction}>
      {/* ----------------------- Header ----------------------- */}
      <header id="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleBackClick}
            className="header-icon-btn"
            aria-label={t("reader.back")}
            title={t("reader.back")}
          >
            ← {t("reader.back")}
          </button>

          <div id="welcome-text">{story.title ?? t("reader.untitled")}</div>
        </div>

        <div id="header-icons">
          <button
            className="header-icon-btn"
            aria-label={t("reader.icon.fontSize")}
            title={t("reader.icon.fontSize")}
            onClick={bumpFont}
          >
            <FontAwesomeIcon icon={faFont} />
          </button>

          <button
            className="header-icon-btn"
            aria-label={t("reader.icon.changeBackground")}
            title={t("reader.icon.changeBackground")}
            onClick={cycleBackground}
          >
            <FontAwesomeIcon icon={faPaintBrush} />
          </button>

          <button
            onClick={toggleBackgroundMusic}
            id="play-music-button"
            className="header-icon-btn"
            aria-label={t("reader.icon.toggleMusic")}
            title={t("reader.icon.toggleMusic")}
          >
            <FontAwesomeIcon icon={musicPlaying ? faVolumeMute : faVolumeUp} />
          </button>

          <button
            id="options-button-new"
            className="header-icon-btn"
            aria-label={t("reader.icon.settings")}
            title={t("reader.icon.settings")}
            onClick={() => setShowSettings((v) => !v)}
          >
            <FontAwesomeIcon icon={faCog} />
          </button>
        </div>
      </header>

      {/* -------------------- Settings Pop -------------------- */}
      {showSettings && (
        <div
          id="options-popup"
          className="visible"
          role="dialog"
          aria-label={t("reader.settings.aria")}
        >
          <button id="close-popup-button" onClick={() => setShowSettings(false)}>
            ×
          </button>
          <h4>{t("reader.settings.title")}</h4>
          <div className="popup-option">
            <label>{t("reader.settings.fontScale")}</label>
            <div>
              {fontScale.toFixed(1)}{" "}
              {t("reader.settings.maxLabel").replace("{max}", "1.2")}
            </div>
          </div>
          <div className="popup-option">
            <label>{t("reader.settings.background")}</label>
            <div>
              {bgIdx === 0
                ? t("reader.settings.storyDefault")
                : t("reader.settings.choiceOf")
                    .replace(
                      "{current}",
                      String(
                        (bgIdx - 1 + BG_CHOICES.length) % BG_CHOICES.length + 1
                      )
                    )
                    .replace("{total}", String(BG_CHOICES.length))}
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
          aria-label={t("reader.nav.prevPage")}
          title={t("reader.nav.prevPage")}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <button
          id="narration-pause-play-button"
          className="nav-arrow"
          aria-label={t("reader.nav.pausePlayNarration")}
          title={t("reader.nav.pausePlayNarration")}
          onClick={() => {
            if (!currentNarrationAudioRef.current) return;
            if (currentNarrationAudioRef.current.paused)
              currentNarrationAudioRef.current.play();
            else currentNarrationAudioRef.current.pause();
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
          } ${showNextHint ? "glow-next" : ""}`}
          aria-label={t("reader.nav.nextPage")}
          title={t("reader.nav.nextPage")}
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
              alt={t("reader.alt.narratorAvatar")}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
          ) : null}

          {currentPageIndex === 0 && (
            <button id="start-story-button" onClick={startStory}>
              {startLabel}
            </button>
          )}

          {hasFreeNav && sortedStoryContent.length > 0 && (
            <div className="index-box" style={{ width: "100%" }}>
              <div className="index-title">{t("reader.index.title")}</div>

              {totalIndexPages > 1 && (
                <div className="index-pager">
                  <button
                    className="index-nav"
                    disabled={!canPrevIndex}
                    onClick={() => setIndexPage((p) => Math.max(0, p - 1))}
                    aria-label={t("reader.index.prevAria")}
                    title={t("reader.index.prev")}
                  >
                    ‹
                  </button>
                  <div className="index-page-indicator">
                    {indexPage + 1} / {totalIndexPages}
                  </div>
                  <button
                    className="index-nav"
                    disabled={!canNextIndex}
                    onClick={() =>
                      setIndexPage((p) => Math.min(totalIndexPages - 1, p + 1))
                    }
                    aria-label={t("reader.index.nextAria")}
                    title={t("reader.index.next")}
                  >
                    ›
                  </button>
                </div>
              )}

              <div
                className="index-grid"
                style={{
                  gridTemplateColumns: `repeat(${indexCols}, minmax(0, 1fr))`,
                }}
              >
                {visibleIndexItems.map((it) => (
                  <button
                    key={it.idx}
                    onClick={() => goToIndex(it.idx)}
                    className={`chip-btn ${
                      currentPageIndex === it.idx ? "active" : ""
                    }`}
                    title={
                      it.idx === 0
                        ? t("reader.index.cover")
                        : t("reader.index.page").replace("{num}", String(it.idx))
                    }
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right: image display box */}
        <section id="image-panel" className="image-panel">
          <div className="image-frame">
            {storyImageSrc ? (
              <img
                id="story-image"
                className="story-img"
                src={storyImageSrc}
                alt={t("reader.alt.storyImage")}
              />
            ) : null}
          </div>
        </section>
      </main>

      {/* ---------------- Text ---------------- */}
      <div id="text-area" style={{ marginTop: "min(2.4vh, 20px)" }}>
        <div id="text-bubble">
          {currentPageIndex === 0
            ? t("reader.text.clickToStart").replace("{startLabel}", startLabel)
            : currentPageContent?.textContent || ""}
        </div>

        {currentPageIndex > 0 && currentPageContent?.audioUrl && (
          <button
            id="read-again-button"
            onClick={() => playNarration(currentPageContent.audioUrl!)}
          >
            <FontAwesomeIcon icon={faRedo} /> {t("reader.readAgain")}
          </button>
        )}
      </div>

      {/* ------------------------ Footer ---------------------- */}
      <footer id="app-footer">
        <div id="page-info">
          {t("reader.pageInfo")
            .replace("{current}", String(currentPageIndex))
            .replace("{total}", String(sortedStoryContent.length))}
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
