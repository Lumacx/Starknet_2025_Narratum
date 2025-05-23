'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Import the real useAuth
import { auth, db } from '@/lib/firebase';
import {
    createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/'); // Redirect to landing page if user is already logged in
    }
  }, [user, loading, router]);

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth || !db) {
        setMessage("Firebase is not initialized. Cannot sign up.");
        return;
    }
    setMessage('');
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user; // Renamed to avoid conflict with 'user' from useAuth
      const userId = newUser.uid;
      
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.displayName || email.split('@')[0],
        photoURL: newUser.photoURL || null,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        role: 'user',
        isSetupComplete: false,
      });
      
      // setMessage('Account created successfully! You are now logged in.'); // Message can be removed
      // console.log("Account created for:", newUser);
      // No need for router.push('/') here, useEffect will handle it after auth state updates.
    } catch (error: any) {
      console.error("Sign Up Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setMessage('This email address is already in use. Please try another or log in.');
      } else if (error.code === 'auth/weak-password') {
        setMessage('The password is too weak. Please use a stronger password (at least 6 characters).');
      } else {
        setMessage(`Error signing up: ${error.message}`);
      }
    }
  };

  if (loading || (!loading && user)) {
    // Show loading indicator or nothing while redirecting
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-xl font-semibold">Loading...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#D4E1EE] to-[#F0D1B0] p-4 text-center font-sans">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full">
        <div className="mb-8">
          <i className="fas fa-user-plus text-6xl text-[#C1905F] mb-4 inline-block animate-glow"></i>
          <h1 className="font-['Georgia'] text-4xl text-[#475B6D] font-normal tracking-wide">NARRATUM</h1>
        </div>
        <p className="text-lg text-gray-700 mb-8">Create your account to start your story.</p>
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('Error') || message.includes('match') || message.includes('already in use') || message.includes('weak') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSignUp} className="w-full">
          <div className="input-fields-wrapper bg-[#F9F6F2] rounded-lg mb-4 shadow-sm overflow-hidden">
            <div className="input-field flex items-center p-3 border-b border-[#EDE7DF]">
              <i className="fas fa-envelope icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
              <input
                type="email" name="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base" required
              />
            </div>
            <div className="input-field flex items-center p-3 border-b border-[#EDE7DF]">
              <i className="fas fa-lock icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
              <input
                type="password" name="password" placeholder="Password (min. 6 characters)" 
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base" required
              />
            </div>
            <div className="input-field flex items-center p-3">
              <i className="fas fa-lock icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
              <input
                type="password" name="confirmPassword" placeholder="Confirm Password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base" required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-3 px-6 bg-[#627C90] text-white font-semibold rounded-full shadow-md hover:bg-[#536A7D] transition duration-300 uppercase tracking-wide">
            Sign Up
          </button>
        </form>
        <div className="text-sm text-gray-600 mt-8">
          <p className="mb-2">Already have an account? <Link href="/login" className="text-blue-600 hover:underline font-bold">Login</Link></p>
        </div>
        <Link href="/" className="mt-8 inline-block px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</Link>
      </div>
    </div>
  );
};

export default SignUpPage;
