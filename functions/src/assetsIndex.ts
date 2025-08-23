// Gen1 Storage indexer — functions/src/assetsIndex.ts
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

// Only index files under users/{uid}/assets/**
const USER_ASSET_RE = /^users\/([^/]+)\/assets\/(.+)$/;

export const indexAssetOnFinalize = functions
  .region('us-central1')
  .storage.object()
  .onFinalize(async (obj) => {
    const path = obj.name || '';
    const match = path.match(USER_ASSET_RE);
    if (!match) return null;

    const uid = match[1];
    const fileName = match[2];

    const md = obj.metadata || {};
    const contentType = obj.contentType || '';
    const category = (md.category as string) || 'uncategorized';
    const mediaType =
      (md.mediaType as string) ||
      (contentType ? contentType.split('/')[0] : null) ||
      null;

    await db.collection('assetsIndex').add({
      uid,
      path,                       // e.g. users/{uid}/assets/covers/foo.png
      fileName,                   // e.g. covers/foo.png
      displayName: md.displayName || null,
      category,                   // covers|avatars|locations|characters|backgrounds|audioNarrations|audioEffects|others
      mediaType,                  // image|audio|video|null
      size: obj.size ? Number(obj.size) : null,
      contentType: contentType || null,
      source: md.source || 'upload',
      createdAt: obj.timeCreated
        ? Timestamp.fromDate(new Date(obj.timeCreated))
        : Timestamp.now(),
    });

    return null;
  });

export const removeIndexOnDelete = functions
  .region('us-central1')
  .storage.object()
  .onDelete(async (obj) => {
    const path = obj.name || '';
    const match = path.match(USER_ASSET_RE);
    if (!match) return null;

    const snap = await db
      .collection('assetsIndex')
      .where('path', '==', path)
      .get();

    if (snap.empty) return null;

    const batch = db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return null;
  });
