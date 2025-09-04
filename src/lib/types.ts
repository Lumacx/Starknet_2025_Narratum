// src/lib/types.ts
// Canonical app-wide types. Import these everywhere else.

export type StoryCategory   = 'short' | 'novela' | 'campaign';
export type StoryVisibility = 'public' | 'private' | 'unlisted';
export type StoryStatus     = 'draft' | 'published';

export interface ReaderSkin {
  avatarUrl?: string | null;        // e.g. "/avatars/Default.png" or HTTPS
  backgroundUrl?: string | null;    // e.g. "/story_reader_backgrounds/..."
  backgroundMusicUrl?: string | null;
}

export interface PremiumConfig {
  /** ElevenLabs Convai widget agent id to enable the assistant on Reader */
  convaiAgentId?: string | null;

  /** Reserved flags for upcoming features (songs, SFX, videos, etc.) */
  features?: {
    songs?: boolean;
    sfx?: boolean;
    videos?: boolean;
  };
}

export interface Story {
  id: string;

  // Ownership & visibility
  ownerUid: string;                      // required by security rules
  visibility?: StoryVisibility;          // 'public' | 'private' | 'unlisted'
  status?: StoryStatus;                  // 'draft' | 'published'
  /** Legacy/compatibility flag some code still checks */
  isPublic?: boolean;

  // Main metadata
  title?: string;
  synopsis?: string;                     // editor uses this
  description?: string;                  // discover uses this alias in some places
  genres?: string[] | null;
  category?: StoryCategory;
  pageCount?: number;

  // Media
  coverImageUrl?: string | null;
  /** A convenience copy used by the Reader for background music */
  backgroundMusicUrl?: string | null;

  // Reader skin and premium features (Convai widget, etc.)
  reader?: ReaderSkin | null;
  premium?: PremiumConfig | null;

  // Timestamps (Firestore Timestamp or ISO string)
  createdAt?: any;
  updatedAt?: any;
  publishedAt?: any;

  // Denormalized creator (used in Discover/Reader)
  creator?: {
    id?: string;
    displayname?: string;
    avatarUrl?: string | null;
  };

  // Aggregates / analytics
  views?: number;
  likes?: number;
  commentsCount?: number;
  ratinglevel?: number;
  ratingSum?: number;
  ratingCount?: number;
  averageRating?: number;

  // Nested relations (optional; often loaded separately)
  storyContent?: StoryContent[];
  comments?: Comment[];
  reactions?: Reaction[];
}

export interface StoryContent {
  id: string;
  storyId: string;          // reference back to Story by id (avoid circular typing)
  textContent?: string;
  pageNumber?: number;
  imageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  createdAt?: any;
}

/* ------------ Community / user entities ------------ */

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  displayname: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;       // user who wrote the comment
  storyId: string;        // story this comment belongs to
  createdAt: string;
}

export interface Reaction {
  id: string;
  reactionType: string;   // e.g., "like", "love", "wow"
  userId: string;
  commentId: string;
  storyId: string;
  createdAt: string;
}

/* ------------ Misc app models (unchanged) ------------ */

export interface AppSubscription {
  id: string;
  name: string;
  price?: number;
  featuresJson?: string;
  createdAt: string;
}

export interface Template {
  id: string;
  title?: string;
  structureJson?: string;
  exampleStory?: Story;
  createdAt: string;
}

export interface AiGeneratedImage {
  id: string;
  user: User;
  promptText?: string;
  sketchUrl?: string;
  generatedImageUrl?: string;
  status: string;
  createdAt: string;
}

export interface AiGeneratedGif {
  id: string;
  image: AiGeneratedImage;
  gifUrl?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  user: User;
  appSubscription: AppSubscription;
  amount?: number;
  paymentDate: string;
  status: string;
  createdAt: string;
}

export interface AdminAction {
  id: string;
  admin: User;
  actionType: string;
  targetId?: string;
  description?: string;
  actionDate: string;
}

export interface Analytics {
  id: string;
  user: User;
  story: Story;
  action: string;
  actionTimestamp: string;
}

export interface LegalDisclaimer {
  id: string;
  user: User;
  accepted: boolean;
  acceptedDate?: string;
  createdAt: string;
}
