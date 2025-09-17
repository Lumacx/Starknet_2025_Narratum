// src/lib/uploadStoryAsset.ts
// Mark this module as client-only (don’t import it from server routes)
'use client';

import { getStorage, ref, uploadBytesResumable, getMetadata, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from '@/lib/firebase';
import { serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { storyAssetDoc } from '@/lib/firestorePaths';

// Keep in sync with your asset hub types
export type AssetType = 'images' | 'audio' | 'narration' | 'soundfx' | 'videos';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
}

export function buildStoragePath(
  ownerUid: string,
  storyId: string,
  assetType: AssetType,
  originalName: string
) {
  const dot = originalName.lastIndexOf('.');
  const base = dot > -1 ? originalName.slice(0, dot) : originalName;
  const ext  = dot > -1 ? originalName.slice(dot) : '';
  const fname = `${Date.now()}-${slugify(base)}${ext || ''}`;
  return `users/${ownerUid}/stories/${storyId}/${assetType}/${fname}`;
}

/**
 * Upload a file to Storage and index it in the Firestore asset hub.
 * Returns assetId, storagePath, and a downloadURL (if available).
 */
export async function uploadStoryFileAndIndex(opts: {
  file: File | Blob;
  ownerUid: string;
  storyId: string;
  assetType: AssetType;
  assetId: string;                 // e.g. crypto.randomUUID()
  kind?: 'page' | 'teaser' | 'raw';
  sceneIndex?: number | null;
  pageNumber?: number | null;
  name?: string;                   // display name (optional)
  onProgress?: (pct: number) => void;
}) {
  const {
    file,
    ownerUid,
    storyId,
    assetType,
    assetId,
    kind = 'raw',
    sceneIndex = null,
    pageNumber = null,
    name,
    onProgress,
  } = opts;

  const storage = getStorage();
  const filename = (file as File).name ?? 'file.bin';
  const storagePath = buildStoragePath(ownerUid, storyId, assetType, filename);
  const sref = ref(storage, storagePath);

  const task = uploadBytesResumable(sref, file, {
    contentType: (file as File).type || undefined,
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress) {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          onProgress(pct);
        }
      },
      reject,
      () => resolve()
    );
  });

  const meta = await getMetadata(sref);
  let downloadURL: string | null = null;
  try {
    downloadURL = await getDownloadURL(sref);
  } catch {
    // If the file isn’t public, this may fail — that’s fine
    downloadURL = null;
  }

  await setDoc(
    storyAssetDoc(db, ownerUid, storyId, assetType, assetId),
    {
      id: assetId,
      name: name ?? (meta.name || assetId),
      kind,
      assetType,
      sceneIndex,
      pageNumber,
      source: 'storage',
      storagePath,
      mimeType: meta.contentType ?? null,
      bytes: meta.size ?? null,
      createdAt: serverTimestamp(),
      ownerUid,
      storyId,
      tags: [],
      downloadURL: downloadURL ?? null, // optional convenience
    },
    { merge: true }
  );

  return { assetId, storagePath, downloadURL };
}

/** Add a YouTube-only “video” asset (no Storage upload). */
export async function addYoutubeVideoAsset(opts: {
  ownerUid: string;
  storyId: string;
  assetId: string;
  youtubeUrl: string;
  kind?: 'page' | 'teaser' | 'raw';
  sceneIndex?: number | null;
  pageNumber?: number | null;
  name?: string;
}) {
  const { ownerUid, storyId, assetId, youtubeUrl, kind = 'raw', sceneIndex = null, pageNumber = null, name } = opts;

  await setDoc(
    storyAssetDoc(db, ownerUid, storyId, 'videos', assetId),
    {
      id: assetId,
      name: name ?? 'YouTube link',
      kind,
      assetType: 'videos',
      sceneIndex,
      pageNumber,
      source: 'youtube',
      youtubeUrl,
      storagePath: null,
      mimeType: null,
      bytes: null,
      createdAt: serverTimestamp(),
      ownerUid,
      storyId,
      tags: ['youtube'],
    },
    { merge: true }
  );

  return { assetId };
}

/** Optional helper to remove a Storage-backed asset and its Firestore doc. */
export async function deleteStoryStorageAsset(opts: {
  ownerUid: string;
  storyId: string;
  assetType: AssetType;
  assetId: string;
  storagePath: string;
}) {
  const { ownerUid, storyId, assetType, assetId, storagePath } = opts;
  const storage = getStorage();
  await deleteObject(ref(storage, storagePath)).catch(() => {});
  await deleteDoc(storyAssetDoc(db, ownerUid, storyId, assetType, assetId));
}
