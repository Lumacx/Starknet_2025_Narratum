// src/lib/firestorePaths.ts
import { collection, doc } from 'firebase/firestore';
import type { Firestore, CollectionReference, DocumentReference } from 'firebase/firestore';

export const ASSET_INDEX_DOC_ID = 'default';
export const STORY_ASSETS_DOC_ID = 'default';

export type AssetType = 'images' | 'audio' | 'narration' | 'soundfx' | 'videos';

export type StoryAsset = {
  name: string;
  kind: 'page' | 'teaser' | 'raw';
  assetType: AssetType;            // duplicate for collectionGroup queries
  sceneIndex?: number | null;
  pageNumber?: number | null;
  source: 'storage' | 'youtube';
  storagePath?: string | null;     // e.g. users/{uid}/stories/{storyId}/videos/foo.mp4
  youtubeUrl?: string | null;      // e.g. https://youtu.be/...
  mimeType?: string | null;
  bytes?: number | null;
  createdAt: number;               // Date.now()
  ownerUid: string;                // == uid
  storyId: string;                 // duplicate for collectionGroup queries
  tags?: string[];
};

export function storyAssetsHubDoc(db: Firestore, uid: string, storyId: string): DocumentReference {
  return doc(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'stories', storyId, 'storyAssets', STORY_ASSETS_DOC_ID);
}

export function storyAssetCol(db: Firestore, uid: string, storyId: string, assetType: AssetType): CollectionReference {
  return collection(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'stories', storyId, 'storyAssets', STORY_ASSETS_DOC_ID, assetType);
}

export function storyAssetDoc(
  db: Firestore,
  uid: string,
  storyId: string,
  assetType: AssetType,
  assetId: string
): DocumentReference {
  return doc(db, 'users', uid, 'assetIndex', ASSET_INDEX_DOC_ID, 'stories', storyId, 'storyAssets', STORY_ASSETS_DOC_ID, assetType, assetId);
}
