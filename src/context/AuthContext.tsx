'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, signInAnonymously, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore'; // Import doc and onSnapshot
import { auth, db } from '@/lib/firebase'; // Import db

interface AuthContextType {
  user: User | null;
  starknetAddress: string | null;
  loading: boolean;
  credits: number | null; // Added credits field
  setStarknetLoginStatus: (address: string | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps { children: React.ReactNode; }

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [starknetAddress, setStarknetAddressInternal] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [credits, setCredits] = useState<number | null>(null); // New state for credits

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try { await firebaseUser.reload(); } catch (e) {console.error("Error reloading user",e)}
        setUser(auth.currentUser ?? firebaseUser);

        // Set up Firestore listener for user credits
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeCredits = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setCredits(userData.credits || 0); // Default to 0 if not set
          } else {
            setCredits(0); // User document might not exist yet
          }
        }, (error) => {
          console.error('Error listening to user credits:', error);
          setCredits(null); // Reset credits on error
        });

        return () => {
          unsubscribeCredits(); // Clean up credits listener
          unsubscribeAuth(); // Clean up auth listener
        };

      } else {
        setUser(null);
        setCredits(null); // Clear credits when user logs out
      }
      setLoading(false);
    });
    return () => unsubscribeAuth(); // Cleanup auth listener on unmount
  }, []);

// 🔐 Si el usuario solo conectó Starknet, crea sesión anónima antes de cualquier lectura
 useEffect(() => {
     if (loading) return;
     if (user) return;                 // ya hay sesión
     if (!starknetAddress) return;     // no hay Starknet => no hagas nada
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
      setCredits(null); // Clear credits on logout
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
