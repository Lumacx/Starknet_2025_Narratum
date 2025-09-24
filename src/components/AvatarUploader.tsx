'use client';

import React, { useRef, useState } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { updateProfile, reload } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLocale } from '@/context/LocaleContext';

type Props = {
  className?: string;
  onUploaded?: (url: string) => void; // notifies parent
};

export default function AvatarUploader({ className, onUploaded }: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setErrorKey(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        setErrorKey('avatar.noUser');
        return;
      }

      // Basic validations
      if (!file.type.startsWith('image/')) {
        setErrorKey('avatar.selectImage');
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        setErrorKey('avatar.tooLarge');
        return;
      }

      const uid = user.uid;
      const filePath = `avatars/${uid}/avatar.jpg`; // or .png
      const fileRef = ref(storage, filePath);

      // Upload
      await uploadBytes(fileRef, file, { contentType: file.type });

      // Public URL
      const url = await getDownloadURL(fileRef);

      // Update Auth profile and force-refresh local user
      await updateProfile(user, { photoURL: url });
      await reload(user); // ensures auth.currentUser has latest fields

      // Persist in Firestore too
      await setDoc(
        doc(db, 'users', uid),
        { uid, photoURL: url, lastAvatarUpdate: serverTimestamp() },
        { merge: true }
      );

      // Notify parent to update UI immediately
      onUploaded?.(url);
      setErrorKey(null);
    } catch (_err) {
      setErrorKey('avatar.uploadFailed');
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
        {busy ? t('avatar.uploading') : t('avatar.uploadCta')}
      </button>
      {errorKey && (
        <div className="mt-2 text-sm text-red-600">{t(errorKey)}</div>
      )}
    </div>
  );
}
