// src/lib/types.ts

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
    author: User;
    createdAt: string;
  }

  export interface Reaction {
      id: string;
      reactionType: string;
      user: User;
  }
  
  export interface Story {
    id: string;
    title?: string;
    genre?: string;
    description?: string;
    coverImageUrl?: string;
    creator: User;
    status: string;
    createdAt: string;
    updatedAt: string;
    storyContent: StoryContent[];
    comments: Comment[];
    reactions: Reaction[];
  }
  
  export interface StoryContent {
    id: string;
    story: Story;
    textContent?: string;
    pageNumber?: number;
    imageUrl?: string;
    audioUrl?: string;
    videoUrl?: string;
    createdAt: string;
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
  
  export interface AIGeneratedImage {
    id: string;
    user: User;
    promptText?: string;
    sketchUrl?: string;
    generatedImageUrl?: string;
    status: string;
    createdAt: string;
  }
  
  export interface AIGeneratedGIF {
    id: string;
    image: AIGeneratedImage;
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
  