// src/lib/uploadCover.ts
import { storage, db } from '@/lib/firebase';
import {
  ref as sref,
  uploadBytes,
  uploadString,
  getDownloadURL,
} from 'firebase/storage';
import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';

/**
 * Sube la portada directamente a Firebase Storage (sin pasar por /api)
 * y persiste coverImageUrl en el doc de la historia.
 *
 * Provee UNA de: file | dataUrl | remoteUrl
 */
export async function uploadCoverToStory(opts: {
  uid: string;
  storyId: string;
  file?: File | null;
  dataUrl?: string | null;      // "data:image/png;base64,...."
  remoteUrl?: string | null;    // URL pública (se descargará y re-subirá)
}): Promise<string> {
  const { uid, storyId, file, dataUrl, remoteUrl } = opts;
  if (!uid || !storyId) throw new Error('Missing uid/storyId');
  if (!file && !dataUrl && !remoteUrl) throw new Error('No cover source provided');

  const path = `users/${uid}/stories/${storyId}/images/cover.png`;
  const r = sref(storage, path);

  let downloadURL = '';

  if (file) {
    const contentType = file.type || 'image/png';
    await uploadBytes(r, file, {
      contentType,
      customMetadata: { 'narratum:role': 'cover' },
    });
    downloadURL = await getDownloadURL(r);
  } else if (dataUrl) {
    await uploadString(r, dataUrl, 'data_url', {
      contentType: 'image/png',
      customMetadata: { 'narratum:role': 'cover' },
    });
    downloadURL = await getDownloadURL(r);
  } else if (remoteUrl) {
    // Descarga la imagen y la vuelve a subir; evita CORS con fetch directo a Storage (GET sí está permitido)
    const res = await fetch(remoteUrl, { cache: 'no-cache', mode: 'cors' });
    if (!res.ok) throw new Error(`Fetch cover failed (${res.status})`);
    const blob = await res.blob();
    const type = blob.type || 'image/png';
    await uploadBytes(r, blob, {
      contentType: type,
      customMetadata: { 'narratum:role': 'cover' },
    });
    downloadURL = await getDownloadURL(r);
  }

  // Persiste en Firestore (merge seguro y sin undefined)
  const storyRef = doc(db, 'stories', storyId);
  try {
    await updateDoc(storyRef, {
      coverImageUrl: downloadURL,
      updatedAt: serverTimestamp(),
    });
  } catch {
    await setDoc(storyRef, {
      coverImageUrl: downloadURL,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  return downloadURL;
}
