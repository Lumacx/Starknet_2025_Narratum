// src/lib/types.ts
// Pure shared interfaces used by both client and server.
// No server-only deps (e.g., firebase-admin) and no circular imports.

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
  authorId: string;     // user who wrote the comment
  storyId: string;      // story this comment belongs to
  createdAt: string;
}

export interface Reaction {
  id: string;
  reactionType: string; // e.g., "like", "love", "wow"
  userId: string;       // who reacted
  commentId: string;    // comment reacted to
  storyId: string;
  createdAt: string;
}

export interface StoryContent {
  id: string;
  storyId: string;      // avoid circular typing; link back by id
  textContent?: string;
  pageNumber?: number;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  createdAt: string;
}

export interface Story {
  id: string;
  title?: string;
  genres?: string[] | null;
  description?: string;
  coverImageUrl?: string;
  authorId: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  // denormalized/derived fields (optional)
  creator?: {
    id?: string;
    displayname?: string;
  };
  views?: number;
  likes?: number;
  commentsCount?: number;
  ratinglevel?: number;

  // nested relations (optional)
  storyContent?: StoryContent[];
  comments?: Comment[];
  reactions?: Reaction[];
}

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
