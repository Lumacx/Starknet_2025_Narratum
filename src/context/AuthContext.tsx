'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
// User profile creation is now handled by a Firebase Function, so these are no longer needed here.
// import { getUserProfile, createUserProfile } from '@/lib/userUtils';

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
    // The onAuthStateChanged listener now only needs to set the user state.
    // The backend Firebase Function handles profile creation automatically.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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
