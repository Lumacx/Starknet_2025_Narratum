// src/app/providers/KeepAliveProvider.tsx
'use client';

import { useEffect } from 'react';
import { rtdb, db } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

/**
 * Keeps Firebase sockets warm during idle UI.
 * - Runs only when user is authenticated (default).
 */
export default function KeepAliveProvider({
  children,
  requireAuth = true,
  rtdbPath = '_meta/keepalive',
  firestoreDocPath = '_meta/keepalive',
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
  rtdbPath?: string;          // e.g. '_meta/keepalive'
  firestoreDocPath?: string;  // e.g. '_meta/keepalive'
}) {
  const { user } = useAuth();

  useEffect(() => {
    if (requireAuth && !user) return;

    // --- RTDB keep-alive ---
    const r = ref(rtdb, rtdbPath);
    const stopRtdb = onValue(r, () => { /* no-op */ });

    // --- Firestore keep-alive (optional tiny doc) ---
    let stopFs: Unsubscribe | undefined;
    try {
      const [c, d] = firestoreDocPath.split('/');
      if (c && d) {
        const keepDoc = doc(db, c, d);
        stopFs = onSnapshot(keepDoc, () => { /* no-op */ });
      }
    } catch { /* ignore */ }

    return () => {
      try { off(r); } catch {}
      try { stopRtdb(); } catch {}
      try { stopFs?.(); } catch {}
    };
  }, [user, requireAuth, rtdbPath, firestoreDocPath]);

  return <>{children}</>;
}
