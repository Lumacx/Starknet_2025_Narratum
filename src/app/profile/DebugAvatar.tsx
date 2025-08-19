// src/app/profile/DebugAvatar.tsx
'use client';
import { auth } from '@/lib/firebase';

export default function DebugAvatar({ computed }: { computed: string | null }) {
  if (process.env.NODE_ENV !== 'development') return null;
  const u = auth.currentUser;
  const raw = u?.photoURL || null;
  const providerPhotos = u?.providerData?.map(p => p?.photoURL).filter(Boolean) as string[] || [];

  return (
    <div className="mt-4 p-3 text-left text-xs rounded-lg bg-yellow-50 text-yellow-900 border border-yellow-200">
      <div className="font-bold mb-2">Avatar Debug (dev only)</div>
      <div>computed (avatarSrc): <a className="underline" href={computed || '#'} target="_blank">{computed || '(null)'}</a></div>
      <div>user.photoURL: <a className="underline" href={raw || '#'} target="_blank">{raw || '(null)'}</a></div>
      <div>providerData photoURLs:</div>
      <ul className="list-disc ml-5">
        {providerPhotos.length ? providerPhotos.map((p,i)=>(<li key={i}><a className="underline" href={p} target="_blank">{p}</a></li>)) : <li>(none)</li>}
      </ul>
      <div className="mt-2 opacity-70">Tip: haz click en los links para ver si abren la imagen correcta o un “círculo azul”.</div>
    </div>
  );
}
