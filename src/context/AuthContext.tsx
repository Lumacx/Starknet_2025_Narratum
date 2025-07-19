'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { User } from 'firebase/auth'; // ✅ Importa como tipo
import { auth } from '@/lib/firebase';

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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
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
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error signing out from Firebase:', err.message);
    }
    setStarknetLoginStatus(null);
  };

  const value: AuthContextType = {
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
