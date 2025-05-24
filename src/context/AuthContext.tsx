'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Assuming db is not directly needed for auth state management here

// Updated AuthContextType
interface AuthContextType {
  user: User | null; // Firebase User object
  starknetAddress: string | null; // To store the Starknet wallet address
  loading: boolean;
  setStarknetLoginStatus: (address: string | null) => void; // Function to set Starknet address
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null); // Firebase user
  const [starknetAddress, setStarknetAddressInternal] = useState<string | null>(null); // Internal state for Starknet address
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // If a Firebase user logs in/out, we don't automatically change Starknet status here.
      // Logout function will handle clearing both.
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const setStarknetLoginStatus = (address: string | null) => {
    setStarknetAddressInternal(address);
    if (address) {
      console.log(`AuthContext: Starknet login status set for address ${address}`);
    } else {
      console.log("AuthContext: Starknet login status cleared.");
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth); // Sign out from Firebase
      setUser(null);
      console.log("AuthContext: Firebase user signed out.");
    } catch (error) {
      console.error("AuthContext: Error signing out from Firebase", error);
    }
    setStarknetLoginStatus(null); // Clear Starknet address
  };

  const value = {
    user, // Firebase user
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
