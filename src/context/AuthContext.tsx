'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, createUserProfile } from '@/lib/userUtils';

interface AuthContextType {
  user: User | null;
  starknetAddress: string | null;
  loading: boolean;
  setStarknetLoginStatus: (address: string | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [starknetAddress, setStarknetAddressInternal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (!userProfile) {
            await createUserProfile({
              userId: firebaseUser.uid,
              email: firebaseUser.email || 'No email provided',
              username: firebaseUser.displayName || 'Anonymous',
              displayname: firebaseUser.displayName || 'Anonymous User',
            });
          }
        } catch (error) {
          console.error("Failed to check or create user profile in AuthContext:", error);
          await firebaseSignOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const setStarknetLoginStatus = (address: string | null) => {
    setStarknetAddressInternal(address);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out from Firebase", error);
    }
    setStarknetLoginStatus(null);
  };

  const value = {
    user,
    starknetAddress,
    loading,
    setStarknetLoginStatus,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
