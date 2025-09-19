'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, signInAnonymously, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  starknetAddress: string | null;
  loading: boolean;
  credits: number | null;
  setStarknetLoginStatus: (address: string | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps { children: React.ReactNode; }

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [starknetAddress, setStarknetAddressInternal] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoaded, setCreditsLoaded] = useState<boolean>(false); // New state for credit loading

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Always set loading to true when auth state changes
      if (firebaseUser) {
        try { await firebaseUser.reload(); } catch (e) {console.error("Error reloading user",e)}
        setUser(auth.currentUser ?? firebaseUser);

        // Set up Firestore listener for user credits
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeCredits = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setCredits(userData.credits || 0);
          } else {
            setCredits(0);
          }
          setCreditsLoaded(true); // Credits are loaded (or defaulted)
        }, (error) => {
          console.error('Error listening to user credits:', error);
          setCredits(null);
          setCreditsLoaded(true); // Credits loading failed, but it's still "resolved"
        });

        // Return a cleanup function for the credits listener
        return () => {
          unsubscribeCredits();
        };

      } else {
        setUser(null);
        setCredits(null);
        setCreditsLoaded(true); // No user, so no credits to load. Mark as loaded.
        setLoading(false); // No user, no credits listener to wait for, so set loading to false here.
      }
    });

    // Return a cleanup function for the auth listener
    return () => unsubscribeAuth();
  }, []);

  // Effect to set global loading state once both user and credits are resolved
  useEffect(() => {
    if (user !== null && creditsLoaded) {
      setLoading(false);
    } else if (user === null && creditsLoaded) {
      // If no user and creditsLoaded is true (from previous non-user branch), then we are done loading.
      setLoading(false);
    }
  }, [user, creditsLoaded]);

// 🔐 Si el usuario solo conectó Starknet, crea sesión anónima antes de cualquier lectura
 useEffect(() => {
     if (loading) return;
     if (user) return;
     if (!starknetAddress) return;
     signInAnonymously(auth).catch((e) => {
       console.warn('Anonymous sign-in failed:', e?.message || e);
     });
   }, [loading, user, starknetAddress]);

  const setStarknetLoginStatus = (address: string | null) => {
    setStarknetAddressInternal(address);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setCredits(null);
      setCreditsLoaded(false); // Reset credits loaded state on logout
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error signing out from Firebase:', err.message);
    }
    setStarknetLoginStatus(null);
  };

  const value: AuthContextType = { user, starknetAddress, loading, credits, setStarknetLoginStatus, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
