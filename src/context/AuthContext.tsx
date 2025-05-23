'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Your Firebase auth instance
import { doc, getDoc, setDoc } from 'firebase/firestore'; // For fetching/updating user profile data

interface AuthContextType {
  user: User | null; // Firebase User object
  // firestoreUser: Record<string, any> | null; // Optional: for profile data from Firestore
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // const [firestoreUser, setFirestoreUser] = useState<Record<string, any> | null>(null); // Optional
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Optional: Fetch user profile from Firestore
        // const userDocRef = doc(db, 'users', firebaseUser.uid);
        // const userDocSnap = await getDoc(userDocRef);
        // if (userDocSnap.exists()) {
        //   setFirestoreUser(userDocSnap.data());
        // } else {
        //   // Handle case where Firestore user doc might not exist yet
        //   // This could happen if user signed up but Firestore write failed/is pending
        //   // Or, create a basic profile if essential data is missing
        //   console.warn("User document doesn't exist in Firestore for UID:", firebaseUser.uid);
        //   // Potentially create it here if needed, or rely on login/signup pages to do so.
        // }
        
        // Update lastLoginAt if user is confirmed
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true });
        } catch (error) {
            console.error("Error updating lastLoginAt in AuthProvider:", error);
        }

      } else {
        setUser(null);
        // setFirestoreUser(null); // Optional
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      // setFirestoreUser(null); // Optional
    } catch (error) {
      console.error("Logout Error:", error);
      throw error; // Re-throw to allow calling component to handle
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout /*, firestoreUser */ }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
