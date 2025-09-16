// src/lib/story-types.ts
// Editor/Workspace-only shapes + re-exports of core Story types.

// Re-export ONLY the core models that actually exist in ./types
export type {
  Story,
  StoryCategory,
  StoryVisibility,
  StoryStatus,
} from './types';

// If you also want to re-export all runtime values from './types', keep this:
export * from './types';

/* ------------------------------------------------------------------ */
/* Local editor-only types (not present in ./types)                    */
/* ------------------------------------------------------------------ */

export interface ReaderSkin {
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  backgroundMusicUrl?: string | null;
}

export interface PremiumConfig {
  convaiAgentId?: string | null;
  features?: {
    songs?: boolean;
    sfx?: boolean;
    videos?: boolean;
  };
}

/* ------------------------------------------------------------------ */
/* Scene/page units for the editor workflow                            */
/* ------------------------------------------------------------------ */

export interface ScenePage {
  // 1-based index is convenient for UI
  pageNumber: number;
  text: string;                 // story text for the page
  imagePrompt: string;          // prompt user used (if any)
  imageUrl?: string | null;     // data URL or HTTPS URL
  narrationText?: string;       // explicit TTS text (default to text)
  audioUrl?: string | null;     // HTTPS URL (or blob during edit)
  youtubeVideoUrl?: string | null; // YouTube video URL for the scene
}

/* ------------------------------------------------------------------ */
/* Workspace used by the editor flow (local UI state)                  */
/* Note: This is a UI model, not necessarily identical to Firestore.  */
/* ------------------------------------------------------------------ */

export interface StoryWorkspace {
  storyId: string;
  title: string;
  genres: string[];
  synopsis: string;
  pages: number;
  coverUrl: string;

  // Optional asset sections
  characters?: { name: string; imageUrl?: string }[];
  locations?:  { name: string; imageUrl?: string }[];

  // Page data
  pagesData: ScenePage[];

  // Reader skin (avatar/background/BGM) shown in preview
  reader?: ReaderSkin;

  // Premium options edited in Begin page (e.g., Convai agent)
  premium?: PremiumConfig;

  // YouTube teaser video URL for the story
  teaserYoutubeUrl?: string | null;
}
