'use client';

import React, { useRef, useState } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { updateProfile, reload } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type Props = {
  className?: string;
  onUploaded?: (url: string) => void; // notifies parent
};

export default function AvatarUploader({ className, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No Firebase user (did you call signInAnonymously for Starknet?)');

      // Basic validations
      if (!file.type.startsWith('image/')) throw new Error('Please select an image.');
      if (file.size > 4 * 1024 * 1024) throw new Error('Image too large (max 4 MB).');

      const uid = user.uid;
      const filePath = `avatars/${uid}/avatar.jpg`; // or .png
      const fileRef = ref(storage, filePath);

      // Upload
      await uploadBytes(fileRef, file, { contentType: file.type });

      // Public URL
      const url = await getDownloadURL(fileRef);

      // Update Auth profile and force-refresh local user
      await updateProfile(user, { photoURL: url });
      await reload(user); // <- ensures auth.currentUser has latest fields

      // Persist in Firestore too
      await setDoc(
        doc(db, 'users', uid),
        { uid, photoURL: url, lastAvatarUpdate: serverTimestamp() },
        { merge: true }
      );

      // Notify parent to update UI immediately
      onUploaded?.(url);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {busy ? 'Uploading...' : 'Upload new photo (Max 4MB)'}
      </button>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
}
