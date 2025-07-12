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
    authorId: string;       // Agrega este campo para los resolvers
    storyId: string;        // Importante para reacciones
    createdAt: string;
  }

  export interface Reaction {
      id: string;
      reactionType: string;  // e.g., "like", "love", "wow"
      userId: string;        // Referencia al usuario que reacciona
      commentId: string;     // Comentario al que se aplica la reacción
      storyId: string;
      createdAt: string;
  }
  
  export interface Story {
    id: string;
    title?: string;
    genre?: string;
    description?: string;
    coverImageUrl?: string;
    authorId: string;           // <- 🔑 necesario para resolver `author`
    status: string;
    createdAt: string;
    updatedAt: string;
    creator?: {
      id?: string;
      displayname?: string;
    };
      // Estos campos NO deben ser requeridos directamente
     storyContent?: StoryContent[];
      comments?: Comment[];
      reactions?: Reaction[];
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
  
  import type { Auth } from 'firebase-admin/auth';
  import type { Firestore } from 'firebase-admin/firestore';

  export interface GraphQLContext {
  db: Firestore;
  auth: Auth;
  user?: User; // <- ya definido en tu types
  }