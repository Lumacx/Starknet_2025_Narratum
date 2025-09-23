// functions/src/assetsIndex.ts
// Gen2 Storage indexer — ONLY index under users/{uid}/assetIndex/(stories|uncategorized)/{category}/...

import * as functions from 'firebase-functions';
import { db, Timestamp } from './firebaseAdmin';

/**
 * Ruta válida:
 * users/{uid}/assetIndex/(stories/{storyId}|uncategorized)/{category}/{filename...}
 */
const NEW_PATH_RE =
  /^users\/([^/]+)\/assetIndex\/(?:(?:stories\/([^/]+))|uncategorized)\/([^/]+)\/(.+)$/;

// Lista blanca de categorías para evitar indexar carpetas inesperadas
const ALLOWED_CATEGORIES = new Set([
  'covers',
  'avatars',
  'characters',
  'locations',
  'backgrounds',
  'audioNarrations',
  'audioEffects',
  'videos',
  'generatedImages',
  'others',
]);

function inferMediaType(contentType?: string | null): 'image' | 'audio' | 'video' | 'other' {
  if (!contentType) return 'other';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('video/')) return 'video';
  return 'other';
}

export const indexAssetOnFinalize = functions
  .region('us-central1')
  .storage.object()
  .onFinalize(async (obj) => {
    const path = obj.name || '';

    // Aceptamos SOLO la nueva convención
    const m = path.match(NEW_PATH_RE);
    if (!m) {
      console.log('[assetsIndex] skip (non-assetIndex path):', path);
      return null;
    }

    const uid = m[1];
    const storyId = m[2] || null; // null cuando es 'uncategorized'
    const category = m[3];
    const fileName = m[4];

    if (!ALLOWED_CATEGORIES.has(category)) {
      console.log('[assetsIndex] skip (unknown category):', category, 'path:', path);
      return null;
    }

    const md = obj.metadata || {};
    const contentType = obj.contentType || null;

    // Permite override por metadata si la envías, si no infiere del contentType
    const mediaType =
      (md.mediaType as string) ||
      inferMediaType(contentType as string | null);

    const size = obj.size ? Number(obj.size) : null;

    // Fuente opcional (upload | ai | migrate | etc.)
    const source =
      md['narratum:source'] ||
      md.source ||
      'upload';

    // createdAt consistente
    const createdAt = obj.timeCreated
      ? Timestamp.fromDate(new Date(obj.timeCreated))
      : Timestamp.now();

    // Campo storyId también puede venir como metadata y lo priorizamos si es coherente
    const mdStoryId = (md['narratum:storyId'] as string | undefined)?.trim() || null;
    const finalStoryId = mdStoryId && storyId ? storyId : (storyId || mdStoryId || null);

    await db.collection('assetsIndex').add({
      uid,
      storyId: finalStoryId, // null si uncategorized
      category,              // p.ej. covers | characters | ...
      fileName,              // nombre relativo dentro de la categoría
      path,                  // ruta completa en Storage
      mediaType,             // image | audio | video | other
      contentType: contentType || null,
      size,
      source,
      displayName: md.displayName || null,
      createdAt,
    });

    console.log('[assetsIndex] indexed:', { uid, storyId: finalStoryId, category, fileName });
    return null;
  });

export const removeIndexOnDelete = functions
  .region('us-central1')
  .storage.object()
  .onDelete(async (obj) => {
    const path = obj.name || '';

    // Solo borramos índices de objetos que siguen la nueva convención
    const m = path.match(NEW_PATH_RE);
    if (!m) {
      console.log('[assetsIndex] delete skip (non-assetIndex path):', path);
      return null;
    }

    const snap = await db
      .collection('assetsIndex')
      .where('path', '==', path)
      .get();

    if (snap.empty) {
      console.log('[assetsIndex] delete: no index docs for', path);
      return null;
    }

    const batch = db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    console.log('[assetsIndex] delete: removed', snap.size, 'docs for', path);
    return null;
  });
