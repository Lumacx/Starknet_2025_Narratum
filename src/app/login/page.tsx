'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Import the real useAuth
import { auth, db } from '@/lib/firebase';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

const LoginPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/'); // Redirect to landing page if user is already logged in
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    if (!auth || !db) {
        setMessage("Firebase is not initialized. Cannot log in.");
        return;
    }
    setMessage('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;
      const userId = loggedInUser.uid;
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: loggedInUser.uid, email: loggedInUser.email, displayName: loggedInUser.displayName, photoURL: loggedInUser.photoURL,
          createdAt: new Date(), lastLoginAt: new Date(), role: 'user', isSetupComplete: false,
        });
        // setMessage('Successfully signed in and created user profile!'); // Message can be removed as page will redirect
      } else {
        await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true });
        // setMessage('Successfully signed in!'); // Message can be removed
      }
      // console.log("Signed in with Google successfully!", loggedInUser);
      // No need for router.push('/') here, useEffect will handle it.
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      setMessage(`Error signing in with Google: ${error.message}`);
    }
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth || !db) {
        setMessage("Firebase is not initialized. Cannot log in.");
        return;
    }
    setMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // const loggedInUser = userCredential.user;
      // const userId = loggedInUser.uid;
      // const userDocRef = doc(db, 'users', userId);
      // await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true });
      // setMessage('Successfully logged in with email!'); // Message can be removed
      // No need for router.push('/') here, useEffect will handle it.
    } catch (error: any) {
      console.error("Email Login Error:", error);
      setMessage(`Error logging in: ${error.message}`);
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
          <i className="fas fa-book-open text-6xl text-[#C1905F] mb-4 inline-block animate-glow"></i>
          <h1 className="font-['Georgia'] text-4xl text-[#475B6D] font-normal tracking-wide">NARRATUM</h1>
        </div>
        <p className="text-lg text-gray-700 mb-8">Connect with your favorite social accounts to get started.</p>
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
        <div className="flex flex-col space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 px-6 bg-white text-gray-700 font-semibold rounded-full shadow-md hover:bg-gray-50 transition duration-300 flex items-center justify-center border border-gray-300"
          >
            <i className="fab fa-google mr-3 text-xl text-red-500"></i> Log in with Google
          </button>
          <button
            className="w-full py-3 px-6 bg-[#1877F2] text-white font-semibold rounded-full shadow-md hover:bg-[#166FE5] transition duration-300 flex items-center justify-center"
            onClick={() => setMessage('Facebook Sign-In not yet implemented.')}
          >
            <i className="fab fa-facebook-f mr-3 text-xl"></i> Log in with Facebook
          </button>
          <div className="social-divider flex items-center text-center text-gray-500 text-sm my-4">
            <span className="flex-grow border-b border-gray-300"></span>
            <span className="mx-4">OR</span>
            <span className="flex-grow border-b border-gray-300"></span>
          </div>
          <form onSubmit={handleEmailLogin} className="w-full">
            <div className="input-fields-wrapper bg-[#F9F6F2] rounded-lg mb-4 shadow-sm overflow-hidden">
              <div className="input-field flex items-center p-3 border-b border-[#EDE7DF]">
                <i className="fas fa-envelope icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
                <input
                  type="email" name="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base" required
                />
              </div>
              <div className="input-field flex items-center p-3">
                <i className="fas fa-lock icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
                <input
                  type="password" name="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base" required
                />
              </div>
            </div>
            <button type="submit" className="w-full py-3 px-6 bg-[#627C90] text-white font-semibold rounded-full shadow-md hover:bg-[#536A7D] transition duration-300 uppercase tracking-wide">
              Log in with Email
            </button>
          </form>
        </div>
        <div className="text-sm text-gray-600 mt-8">
          <p className="mb-2">New to Narratum? <Link href="/signup" className="text-blue-600 hover:underline font-bold">Sign up</Link></p>
          <a href="#" onClick={(e) => {e.preventDefault(); setMessage('Forgot password functionality not yet implemented.')}} className="text-blue-600 hover:underline">Forgot password?</a>
        </div>
        <Link href="/" className="mt-8 inline-block px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</Link>
      </div>
    </div>
  );
};

export default LoginPage;
