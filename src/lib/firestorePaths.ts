// src/lib/firestorePaths.ts
import { collection, doc } from 'firebase/firestore';
import type {
  Firestore,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';

/* -----------------------------------------------------------------------------
 * Constants
 * ---------------------------------------------------------------------------*/
export const ASSET_INDEX_DOC_ID = 'default';
export const STORY_ASSETS_DOC_ID = 'default';

/* -----------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------*/
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

/* -----------------------------------------------------------------------------
 * Core path helpers (users → assetIndex → {default} → stories → {storyId})
 * These ensure correct odd/even segment counts for collection/doc refs.
 * ---------------------------------------------------------------------------*/

// users/{uid}
export function userDoc(db: Firestore, uid: string): DocumentReference {
  return doc(db, 'users', uid);
}

// users/{uid}/assetIndex/{ASSET_INDEX_DOC_ID}
export function userAssetIndexDoc(db: Firestore, uid: string): DocumentReference {
  return doc(userDoc(db, uid), 'assetIndex', ASSET_INDEX_DOC_ID);
}

// users/{uid}/assetIndex/{ASSET_INDEX_DOC_ID}/stories
export function storiesCol(db: Firestore, uid: string): CollectionReference {
  return collection(userAssetIndexDoc(db, uid), 'stories');
}

// users/{uid}/assetIndex/{ASSET_INDEX_DOC_ID}/stories/{storyId}
export function storyDoc(
  db: Firestore,
  uid: string,
  storyId: string
): DocumentReference {
  return doc(storiesCol(db, uid), storyId);
}

/* -----------------------------------------------------------------------------
 * Your existing "storyAssets" hub (PRESERVED)
 * users/{uid}/assetIndex/{default}/stories/{storyId}/storyAssets/{default}
 * and nested typed collections under that doc: {images|audio|narration|soundfx|videos}
 * ---------------------------------------------------------------------------*/

export function storyAssetsHubDoc(
  db: Firestore,
  uid: string,
  storyId: string
): DocumentReference {
  return doc(
    storyDoc(db, uid, storyId),
    'storyAssets',
    STORY_ASSETS_DOC_ID
  );
}

export function storyAssetCol(
  db: Firestore,
  uid: string,
  storyId: string,
  assetType: AssetType
): CollectionReference {
  return collection(
    storyAssetsHubDoc(db, uid, storyId),
    assetType
  );
}

export function storyAssetDoc(
  db: Firestore,
  uid: string,
  storyId: string,
  assetType: AssetType,
  assetId: string
): DocumentReference {
  return doc(
    storyAssetCol(db, uid, storyId, assetType),
    assetId
  );
}

/* -----------------------------------------------------------------------------
 * Optional "flat" story subcollections (if you also keep top-level buckets like
 * characters, locations, audioNarrations, audioEffects, videos):
 * users/{uid}/assetIndex/{default}/stories/{storyId}/{subcollection}
 * These match the 6-segment error you saw—now with the required {default} inserted.
 * ---------------------------------------------------------------------------*/

// Generic story subcollection helper
export function storySubcol(
  db: Firestore,
  uid: string,
  storyId: string,
  sub:
    | 'characters'
    | 'locations'
    | 'audioNarrations'
    | 'audioEffects'
    | 'videos'
    | 'images'
): CollectionReference {
  return collection(storyDoc(db, uid, storyId), sub);
}

// Specific conveniences (use any you need)
export const storyCharactersCol = (
  db: Firestore,
  uid: string,
  storyId: string
) => storySubcol(db, uid, storyId, 'characters');

export const storyLocationsCol = (
  db: Firestore,
  uid: string,
  storyId: string
) => storySubcol(db, uid, storyId, 'locations');

export const storyAudioNarrationsCol = (
  db: Firestore,
  uid: string,
  storyId: string
) => storySubcol(db, uid, storyId, 'audioNarrations');

export const storyAudioEffectsCol = (
  db: Firestore,
  uid: string,
  storyId: string
) => storySubcol(db, uid, storyId, 'audioEffects');

/* -----------------------------------------------------------------------------
 * Story-scoped YouTube videos (flat)
 * users/{uid}/assetIndex/{default}/stories/{storyId}/videos/{videoId}
 * ---------------------------------------------------------------------------*/

export function storyVideosCol(
  db: Firestore,
  uid: string,
  storyId: string
): CollectionReference {
  return storySubcol(db, uid, storyId, 'videos');
}

export function storyVideoDoc(
  db: Firestore,
  uid: string,
  storyId: string,
  videoId: string
): DocumentReference {
  return doc(storyVideosCol(db, uid, storyId), videoId);
}

/* -----------------------------------------------------------------------------
 * Uncategorized buckets (global to the user)
 * users/{uid}/assetIndex/{default}/uncategorized/{category}/{docId}
 * ---------------------------------------------------------------------------*/

export function uncatCol(
  db: Firestore,
  uid: string,
  category:
    | 'images'
    | 'audio'
    | 'narration'
    | 'soundfx'
    | 'videos'
    | 'characters'
    | 'locations'
    | 'backgrounds'
    | 'avatars'
    | 'covers'
    | 'generatedImages'
): CollectionReference {
  return collection(userAssetIndexDoc(db, uid), 'uncategorized', category);
}

export function uncatDoc(
  db: Firestore,
  uid: string,
  category:
    | 'images'
    | 'audio'
    | 'narration'
    | 'soundfx'
    | 'videos'
    | 'characters'
    | 'locations'
    | 'backgrounds'
    | 'avatars'
    | 'covers'
    | 'generatedImages',
  id: string
): DocumentReference {
  return doc(uncatCol(db, uid, category), id);
}

// Convenience aliases kept for videos (if you only need videos, use these)
export const uncatVideosCol = (db: Firestore, uid: string) =>
  uncatCol(db, uid, 'videos');
export const uncatVideoDoc = (db: Firestore, uid: string, videoId: string) =>
  uncatDoc(db, uid, 'videos', videoId);

/* -----------------------------------------------------------------------------
 * Index helpers (centralized so components can import these instead of inlining)
 * These match the structure used by UploadImageReference.tsx
 * ---------------------------------------------------------------------------*/

// Firestore index path (collection) for {story-scoped | uncategorized}
export function buildIndexCollectionPath(params: {
  uid: string;
  storyId?: string;
  category: string;
}) {
  return params.storyId
    ? `users/${params.uid}/assetIndex/${ASSET_INDEX_DOC_ID}/stories/${params.storyId}/${params.category}`
    : `users/${params.uid}/assetIndex/${ASSET_INDEX_DOC_ID}/uncategorized/${params.category}`;
}

// Firestore index path (doc) for {story-scoped | uncategorized}
export function buildIndexTarget(params: {
  uid: string;
  storyId?: string;
  category: string;
  docId: string;
}) {
  const base = buildIndexCollectionPath(params);
  return { path: `${base}/${params.docId}` };
}