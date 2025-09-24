'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';

const PUBLIC_AVATARS = [
  '/story_reader_avatars/Default.png',
  '/story_reader_avatars/Wizard.png',
  '/story_reader_avatars/Robot.png',
];

const PUBLIC_BACKGROUNDS = [
  '/story_reader_backgrounds/dream-background.png',
  '/story_reader_backgrounds/forest.png',
  '/story_reader_backgrounds/castle.png',
];

type Item = { url: string; name: string; fullPath?: string };

type Props = {
  initialAvatarUrl?: string | null;
  initialBackgroundUrl?: string | null;
  onChange: (v: { avatarUrl: string | null; backgroundUrl: string | null }) => void;
};

type Tab = 'public' | 'my';

export default function ReaderSkinPicker({
  initialAvatarUrl,
  initialBackgroundUrl,
  onChange,
}: Props) {
  const { t } = useLocale();
  const { user } = useAuth();
  const [tabAva, setTabAva] = useState<Tab>('public');
  const [tabBg, setTabBg] = useState<Tab>('public');

  const [myAvatars, setMyAvatars] = useState<Item[]>([]);
  const [myBackgrounds, setMyBackgrounds] = useState<Item[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(initialBackgroundUrl ?? null);
  const uploadARef = useRef<HTMLInputElement | null>(null);
  const uploadBRef = useRef<HTMLInputElement | null>(null);

  const loadMine = useCallback(async () => {
    if (!user) return;
    // avatars
    const a = ref(storage, `users/${user.uid}/reader/avatars`);
    const aList = await listAll(a).catch(() => ({ items: [] as any[] }));
    const aItems: Item[] = await Promise.all(
      (aList.items || []).map(async (i) => ({ url: await getDownloadURL(i), name: i.name, fullPath: i.fullPath }))
    );
    setMyAvatars(aItems);

    // backgrounds
    const b = ref(storage, `users/${user.uid}/reader/backgrounds`);
    const bList = await listAll(b).catch(() => ({ items: [] as any[] }));
    const bItems: Item[] = await Promise.all(
      (bList.items || []).map(async (i) => ({ url: await getDownloadURL(i), name: i.name, fullPath: i.fullPath }))
    );
    setMyBackgrounds(bItems);
  }, [user]);

  useEffect(() => { loadMine(); }, [loadMine]);

  useEffect(() => { onChange({ avatarUrl, backgroundUrl }); }, [avatarUrl, backgroundUrl, onChange]);

  async function upload(kind: 'avatar' | 'background', file: File) {
    if (!user) return alert(t('readerSkin.signInToUpload'));
    const base = `users/${user.uid}/reader/${kind === 'avatar' ? 'avatars' : 'backgrounds'}`;
    const dest = ref(storage, `${base}/${file.name}`);
    await uploadBytes(dest, file);
    const url = await getDownloadURL(dest);
    if (kind === 'avatar') {
      setMyAvatars((g) => [{ url, name: file.name, fullPath: dest.fullPath }, ...g]);
      setAvatarUrl(url);
    } else {
      setMyBackgrounds((g) => [{ url, name: file.name, fullPath: dest.fullPath }, ...g]);
      setBackgroundUrl(url);
    }
  }

  async function remove(fullPath?: string) {
    if (!fullPath) return;
    if (!confirm(t('readerSkin.deleteConfirm'))) return;
    await deleteObject(ref(storage, fullPath));
    setMyAvatars((g) => g.filter((x) => x.fullPath !== fullPath));
    setMyBackgrounds((g) => g.filter((x) => x.fullPath !== fullPath));
  }

  return (
    <div className="space-y-6">
      {/* AVATAR */}
      <div className="border rounded-xl p-4 bg-white/80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3D4F60]">{t('readerSkin.readerAvatar')}</h3>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded ${tabAva === 'public' ? 'bg-[#E97451] text-white' : 'border'}`}
              onClick={() => setTabAva('public')}
            >
              {t('readerSkin.tab.public')}
            </button>
            <button
              className={`px-3 py-1 rounded ${tabAva === 'my' ? 'bg-[#E97451] text-white' : 'border'}`}
              onClick={() => setTabAva('my')}
            >
              {t('readerSkin.tab.myUploads')}
            </button>
          </div>
        </div>

        {tabAva === 'public' ? (
          <div className="grid grid-cols-4 gap-3">
            {PUBLIC_AVATARS.map((u) => (
              <button
                key={u}
                onClick={() => setAvatarUrl(u)}
                className={`border rounded overflow-hidden ${avatarUrl === u ? 'ring-2 ring-[#E97451]' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={t('readerSkin.alt.avatar')} className="w-full h-20 object-cover" />
              </button>
            ))}
            <button onClick={() => setAvatarUrl(null)} className="border rounded p-2 text-sm">
              {t('readerSkin.none')}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <input
                ref={uploadARef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload('avatar', e.target.files[0])}
              />
              <button className="border rounded px-3 py-1" onClick={() => uploadARef.current?.click()}>
                {t('readerSkin.uploadAvatar')}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {myAvatars.map((it) => (
                <div key={it.url} className={`border rounded overflow-hidden ${avatarUrl === it.url ? 'ring-2 ring-[#E97451]' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.url}
                    alt={it.name}
                    className="w-full h-20 object-cover cursor-pointer"
                    onClick={() => setAvatarUrl(it.url)}
                  />
                  <div className="flex items-center justify-between text-xs p-1">
                    <span className="truncate">{it.name}</span>
                    <button className="text-red-600" onClick={() => remove(it.fullPath)} aria-label="delete">✕</button>
                  </div>
                </div>
              ))}
              <button onClick={() => setAvatarUrl(null)} className="border rounded p-2 text-sm">
                {t('readerSkin.none')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BACKGROUND */}
      <div className="border rounded-xl p-4 bg-white/80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3D4F60]">{t('readerSkin.readerBackground')}</h3>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded ${tabBg === 'public' ? 'bg-[#E97451] text-white' : 'border'}`}
              onClick={() => setTabBg('public')}
            >
              {t('readerSkin.tab.public')}
            </button>
            <button
              className={`px-3 py-1 rounded ${tabBg === 'my' ? 'bg-[#E97451] text-white' : 'border'}`}
              onClick={() => setTabBg('my')}
            >
              {t('readerSkin.tab.myUploads')}
            </button>
          </div>
        </div>

        {tabBg === 'public' ? (
          <div className="grid grid-cols-4 gap-3">
            {PUBLIC_BACKGROUNDS.map((u) => (
              <button
                key={u}
                onClick={() => setBackgroundUrl(u)}
                className={`border rounded overflow-hidden ${backgroundUrl === u ? 'ring-2 ring-[#E97451]' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={t('readerSkin.alt.background')} className="w-full h-20 object-cover" />
              </button>
            ))}
            <button onClick={() => setBackgroundUrl(null)} className="border rounded p-2 text-sm">
              {t('readerSkin.none')}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <input
                ref={uploadBRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload('background', e.target.files[0])}
              />
              <button className="border rounded px-3 py-1" onClick={() => uploadBRef.current?.click()}>
                {t('readerSkin.uploadBackground')}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {myBackgrounds.map((it) => (
                <div key={it.url} className={`border rounded overflow-hidden ${backgroundUrl === it.url ? 'ring-2 ring-[#E97451]' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.url}
                    alt={it.name}
                    className="w-full h-20 object-cover cursor-pointer"
                    onClick={() => setBackgroundUrl(it.url)}
                  />
                  <div className="flex items-center justify-between text-xs p-1">
                    <span className="truncate">{it.name}</span>
                    <button className="text-red-600" onClick={() => remove(it.fullPath)} aria-label="delete">✕</button>
                  </div>
                </div>
              ))}
              <button onClick={() => setBackgroundUrl(null)} className="border rounded p-2 text-sm">
                {t('readerSkin.none')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
