// Core story types kept in sync with Firestore shape and rules

export type StoryCategory = 'short' | 'novela' | 'campaign';
export type StoryVisibility = 'public' | 'private' | 'unlisted';
export type StoryStatus = 'draft' | 'published';

export interface Story {
  id: string;
  ownerUid: string;                 // ✅ rules key
  title: string;
  synopsis: string;
  genres: string[];
  category: StoryCategory;
  pageCount: number;
  coverImageUrl: string | null;
  visibility: StoryVisibility;
  status: StoryStatus;
  createdAt?: any;                  // Firestore Timestamp
  updatedAt?: any;                  // Firestore Timestamp
  publishedAt?: any;                // optional
}

export interface ScenePage {
  pageNumber: number;               // 1-based index is convenient
  text: string;                     // story text for the page
  imagePrompt: string;              // prompt user used (if any)
  imageUrl?: string | null;         // data URL or HTTPS URL
  narrationText?: string;           // explicit TTS text (default to text)
  audioUrl?: string | null;         // HTTPS URL (or blob during edit)
}

// Workspace used by the editor flow (local UI model)
export interface StoryWorkspace {
  storyId: string;
  title: string;
  genres: string[];
  synopsis: string;
  pages: number;
  coverUrl: string;
  characters?: { name: string; imageUrl?: string }[];
  locations?:  { name: string; imageUrl?: string }[];
  pagesData: ScenePage[];
}
