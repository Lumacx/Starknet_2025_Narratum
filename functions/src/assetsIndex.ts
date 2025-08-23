// functions/src/assetsIndex.ts
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function encodeId(path: string) {
  // Firestore doc ids can't contain '/'; base64url is compact & safe
  return Buffer.from(path).toString('base64url');
}

function parsePath(name?: string) {
  // Expected: users/{uid}/assets/{category}/{filename...}
  if (!name) return null;
  const parts = name.split('/');
  if (parts.length < 5) return null;
  if (parts[0] !== 'users' || parts[2] !== 'assets') return null;
  const uid = parts[1];
  const category = parts[3]; // covers|characters|locations|backgrounds|audio|video|other...
  const filename = parts.slice(4).join('/');
  return { uid, category, filename, fullPath: name };
}

function mediaTypeFrom(ct?: string) {
  if (!ct) return 'other';
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.startsWith('video/')) return 'video';
  return 'other';
}

/** Index on upload */
export const indexAssetOnFinalize = functions
  .region('us-central1')
  .storage.object()
  .onFinalize(async (object) => {
    const parsed = parsePath(object.name || undefined);
    if (!parsed) return null;

    const { uid, category, fullPath, filename } = parsed;
    const id = encodeId(fullPath);

    const displayName =
      object.metadata?.displayName ||
      object.metadata?.['displayName'] ||
      filename;

    await db
      .collection('users').doc(uid)
      .collection('assetsIndex').doc(id)
      .set(
        {
          path: fullPath,
          displayName,
          category,
          mediaType: mediaTypeFrom(object.contentType || undefined),
          size: object.size ? Number(object.size) : null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          // url is computed client-side with getDownloadURL()
        },
        { merge: true }
      );

    return null;
  });

/** Remove index on delete */
export const removeIndexOnDelete = functions
  .region('us-central1')
  .storage.object()
  .onDelete(async (object) => {
    const parsed = parsePath(object.name || undefined);
    if (!parsed) return null;

    const { uid, fullPath } = parsed;
    const id = encodeId(fullPath);

    await db
      .collection('users').doc(uid)
      .collection('assetsIndex').doc(id)
      .delete()
      .catch(() => null);

    return null;
  });
