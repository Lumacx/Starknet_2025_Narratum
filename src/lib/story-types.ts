// src/lib/story-types.ts
// Editor/Workspace-only shapes + re-exports of core Story types.

export * from './types';  // re-export core models (Story, StoryContent, etc.)
export type { Story, ReaderSkin, PremiumConfig, StoryCategory, StoryVisibility, StoryStatus } from './types';

// Scene/page units for the editor workflow
export interface ScenePage {
  pageNumber: number;           // 1-based index is convenient
  text: string;                 // story text for the page
  imagePrompt: string;          // prompt user used (if any)
  imageUrl?: string | null;     // data URL or HTTPS URL
  narrationText?: string;       // explicit TTS text (default to text)
  audioUrl?: string | null;     // HTTPS URL (or blob during edit)
}

// Workspace used by the editor flow (local UI state)
// Note: This is not necessarily identical to Firestore doc – it's a UI model.
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
  reader?: {
    avatarUrl?: string | null;
    backgroundUrl?: string | null;
    backgroundMusicUrl?: string | null;
  };

  // Premium options edited in Begin page (e.g., Convai agent)
  premium?: {
    convaiAgentId?: string | null;
    features?: {
      songs?: boolean;
      sfx?: boolean;
      videos?: boolean;
    };
  };
}
