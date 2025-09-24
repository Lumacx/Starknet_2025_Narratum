// src/lib/types.ts
// Pure shared interfaces used by both client and server.
// No React imports, no runtime code — types only.

/* =========================
   Core enums / aliases
   ========================= */
   export type StoryCategory = 'short' | 'novela' | 'campaign';
   export type StoryVisibility = 'public' | 'private' | 'unlisted';
   export type StoryStatus = 'draft' | 'published';
   
   /* =========================
      Common models
      ========================= */
   export interface User {
     id: string;
     username?: string;
     email?: string;
     avatarUrl?: string;
     displayname?: string;
     role?: string;
     createdAt?: string;
     updatedAt?: string;
   }
   
   export interface Comment {
     id: string;
     content: string;
     author: User;          // 👈 Change authorId to this line     // user who wrote the comment
     storyId: string;      // story this comment belongs to
     createdAt: string;
   }
   
   export interface Reaction {
     id: string;
     reactionType: string; // e.g., "like", "love", "wow"
     userId: string;       // who reacted
     commentId?: string;   // if reacting to a comment
     storyId: string;
     createdAt: string;
   }
   
   export interface StoryContent {
     id: string;
     storyId: string;      // link back by id
     pageNumber?: number;
     textContent?: string;
     imageUrl?: string;
     audioUrl?: string;
     videoUrl?: string;
     createdAt: string;
   }
   
   /* =========================
      Premium options per story
      ========================= */
   export interface StoryPremium {
     /** ElevenLabs Convai widget agent (optional). */
     convaiAgentId?: string | null;
   
     /** Public teaser video (YouTube URL). */
     teaserVideoUrl?: string | null;
   
     /** If true, show left-side navigation index in the reader. */
     freeNavigationIndex?: boolean;
   }
   
   /* =========================
      Story
      ========================= */
   export interface Story {
     id: string;
   
     // Ownership / access
     ownerUid?: string;                 // used by Firestore rules
     authorId?: string;                 // legacy/alternate field
     visibility?: StoryVisibility;      // 'public' | 'private' | 'unlisted'
     status?: StoryStatus;              // 'draft' | 'published'
   
     // Core details
     title?: string;
     synopsis?: string;
     description?: string;
     genres?: string[] | null;
     category?: StoryCategory;
     pageCount?: number;
     language?: string;
   
     // Media
     coverImageUrl?: string | null;
   
     // Timestamps
     createdAt?: any;                   // Firestore Timestamp or ISO string
     updatedAt?: any;
     publishedAt?: any;
   
     // Denormalized/derived
     creator?: {
       id?: string;
       displayname?: string;
       avatarUrl?: string;
     };
     views?: number;
     likes?: number;
     commentsCount?: number;
   
     // Ratings (both raw and computed supported)
     ratingCount?: number;
     ratingSum?: number;
     averageRating?: number | null;
   
     // Relations (optional)
     storyContent?: StoryContent[];
     comments?: Comment[];
     reactions?: Reaction[];
   
     // Premium config
     premium?: StoryPremium;
   
     // Extra metadata bucket (e.g., { campaignName })
     metadata?: Record<string, any>;
   }
   
   /* =========================
      Other app models (optional)
      ========================= */
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
   