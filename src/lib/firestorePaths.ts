// src/lib/firestorePaths.ts
import { collection, doc } from 'firebase/firestore';
import type { Firestore, CollectionReference, DocumentReference } from 'firebase/firestore';

export const ASSET_INDEX_DOC_ID = 'default';
export const STORY_ASSETS_DOC_ID = 'default';

export type AssetType = 'images' | 'audio' | 'narration' | 'soundfx' | 'videos';

export type StoryAsset = {
  name: string;
  kind: 'page' | 'teaser' | 'raw';
  assetType: AssetType;
  sceneIndex?: number | null;
  pageNumber?: number | null;
  source: 'storage' | 'youtube';
  storagePath?: string | null;
  youtubeUrl?: string | null;
  mimeType?: string | null;
  bytes?: number | null;
  createdAt: number;
  ownerUid: string;
  storyId: string;
  tags?: string[];
};

/* ---------- existing helpers (leave as-is) ---------- */
export function storyAssetsHubDoc(db: Firestore, uid: string, storyId: string): DocumentReference {
  return doc(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'stories', storyId, 'storyAssets', STORY_ASSETS_DOC_ID);
}
export function storyAssetCol(db: Firestore, uid: string, storyId: string, assetType: AssetType): CollectionReference {
  return collection(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'stories', storyId, 'storyAssets', STORY_ASSETS_DOC_ID, assetType);
}
export function storyAssetDoc(
  db: Firestore, uid: string, storyId: string, assetType: AssetType, assetId: string
): DocumentReference {
  return doc(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'stories', storyId, 'storyAssets', STORY_ASSETS_DOC_ID, assetType, assetId);
}

/* ---------- ADD THESE for the 7-segment “videos” collections ---------- */

// Story-scoped YouTube links:
// users/{uid}/assetIndex/{ASSET_INDEX_DOC_ID}/stories/{storyId}/videos/{videoId}
export function storyVideosCol(db: Firestore, uid: string, storyId: string): CollectionReference {
  return collection(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'stories', storyId, 'videos');
}
export function storyVideoDoc(db: Firestore, uid: string, storyId: string, videoId: string): DocumentReference {
  return doc(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'stories', storyId, 'videos', videoId);
}

// Uncategorized YouTube links:
// users/{uid}/assetIndex/{ASSET_INDEX_DOC_ID}/uncategorized/videos/{videoId}
export function uncatVideosCol(db: Firestore, uid: string): CollectionReference {
  return collection(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'uncategorized', 'videos');
}
export function uncatVideoDoc(db: Firestore, uid: string, videoId: string): DocumentReference {
  return doc(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'uncategorized', 'videos', videoId);
}
