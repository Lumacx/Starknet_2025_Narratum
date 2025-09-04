// src/lib/types.shared.ts
// Re-export the canonical types so there is a single source of truth.

import type { Story } from './types';
export * from './types';

/**
 * Optional convenience shape for places that want the content
 * with a populated Story object instead of just storyId.
 */
export interface StoryContentFull {
  id: string;
  story: Story;           // populated relation
  textContent?: string;
  pageNumber?: number;
  imageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  createdAt?: any;
}
