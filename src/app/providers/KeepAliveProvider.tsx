// src/app/providers/KeepAliveProvider.tsx
'use client';

import { useEffect } from 'react';
import { rtdb, db } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { onSnapshotDebug } from '@/lib/firestoreDebug';
import { useAuth } from '@/context/AuthContext';

export default function KeepAliveProvider({
  children,
  requireAuth = true,
  rtdbPath = '_meta/keepalive',          // RTDB lo dejamos igual
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
  rtdbPath?: string;
}) {
  const { user } = useAuth();

  useEffect(() => {
    if (requireAuth && !user) return;

    // --- RTDB keep-alive ---
    const r = ref(rtdb, rtdbPath);
    const stopRtdb = onValue(r, () => {});


    // --- Firestore keep-alive bajo el usuario ---
    let stopFs: Unsubscribe | undefined;
    try {
      if (user) {
        // const keepDoc = doc(db, 'users', user.uid, '_meta', 'keepalive');
        // stopFs = onSnapshotDebug(keepDoc, () => {});
    
        const keepDoc = doc(db, 'users', user.uid, '_meta', 'keepalive');
        stopFs = onSnapshot(keepDoc, () => {});
      }
    } catch {}

    return () => {
      try { off(r); } catch {}
      try { stopRtdb(); } catch {}
      try { stopFs?.(); } catch {}
    };
  }, [user, requireAuth, rtdbPath]);

  return <>{children}</>;
}
