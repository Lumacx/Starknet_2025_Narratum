// src/components/GsiScript.tsx
'use client';

import { useEffect, useRef } from 'react';

export default function GsiScript() {
  const injectedRef = useRef(false);

  useEffect(() => {
    if (injectedRef.current) return;
    injectedRef.current = true;

    const id = 'google-accounts-client';
    if (document.getElementById(id)) return;

    const s = document.createElement('script');
    s.id = id;
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  return null;
}
