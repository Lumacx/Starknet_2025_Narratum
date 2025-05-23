// src/App.tsx
'use client'; // Required for Next.js App Router when using client-side hooks

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
// Firebase imports will now come from our centralized firebase.ts
import { auth, db, firestoreAppId as firebaseAppIdFromConfig } from '@/lib/firebase'; // Adjusted path
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    signInWithCustomToken,
    signInAnonymously,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';


// --- Placeholder for CreateStoryPage (using the one from your latest full App.tsx snippet) ---
const CreateStoryPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    title: '',
    genre: 'Fantasy',
    characters: [], // Array to hold character data/names
    setting: 'Forest',
    beginning: false,
    conflict: false,
    climax: false,
    ending: false,
  });
  const [message, setMessage] = useState('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement; // Type assertion for checkbox
    const { name, value, type } = target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? target.checked : value,
    }));
  };

  const handleCharacterAdd = () => {
    setMessage('Character addition functionality not yet implemented.');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Story Data Submitted:', formData);
    setMessage('Story data submitted! (Functionality not yet implemented)');
  };

  const characterPlaceholders = [
    'https://placehold.co/80x80/C1A98A/FFFFFF?text=Char1',
    'https://placehold.co/80x80/A9834F/FFFFFF?text=Char2',
    'https://placehold.co/80x80/8B6F4E/FFFFFF?text=Char3',
  ];


  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-5 md:p-10 bg-gradient-to-br from-[#D4E1EE] via-[#F3E4D7] to-[#F0D1B0] text-[#4A3B31] font-sans">
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => onNavigate('landing')}
          className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Back to Landing
        </button>
      </div>
      <div className="w-full max-w-5xl bg-[#F9F6F0] border-2 border-[#C1A98A] rounded-2xl shadow-xl p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        <i className="fas fa-feather-alt absolute top-4 right-4 text-6xl text-[#A9834F] opacity-30 rotate-12 -z-0 hidden md:block"></i>
        <div className="md:col-span-2 text-center md:text-left">
          <h1 className="font-['Merriweather'] text-5xl md:text-6xl font-extrabold text-[#5D4037] mb-8 uppercase tracking-wide">SUMMON YOUR<br />STORY</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-xl font-bold text-[#4A3B31] mb-2">Title</label>
              <input
                type="text" id="title" name="title" value={formData.title} onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#C1A98A] rounded-lg bg-[#FDFBF5] text-[#4A3B31] focus:outline-none focus:border-[#A9834F]"
                placeholder="Enter your story title" required
              />
            </div>
            <div>
              <label htmlFor="genre" className="block text-xl font-bold text-[#4A3B31] mb-2">Genre</label>
              <select
                id="genre" name="genre" value={formData.genre} onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#C1A98A] rounded-lg bg-[#FDFBF5] text-[#4A3B31] focus:outline-none focus:border-[#A9834F]"
              >
                <option>Fantasy</option><option>Science Fiction</option><option>Mystery</option><option>Romance</option><option>Thriller</option><option>Historical</option>
              </select>
            </div>
            <div>
              <label className="block text-xl font-bold text-[#4A3B31] mb-2">Characters</label>
              <div className="flex items-center gap-4 flex-wrap">
                {characterPlaceholders.map((src, index) => (
                  <div key={index} className="w-20 h-20 rounded-full border-2 border-[#A9834F] overflow-hidden flex-shrink-0">
                    <img src={src} alt={`Character ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                <button
                  type="button" onClick={handleCharacterAdd}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-[#C1A98A] text-[#A9834F] text-4xl flex items-center justify-center bg-[#FDFBF5] hover:bg-[#F0E6D2] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#A9834F]"
                  title="Add Character"
                ><i className="fas fa-plus"></i></button>
              </div>
            </div>
            <div>
              <label htmlFor="setting" className="block text-xl font-bold text-[#4A3B31] mb-2">Setting</label>
              <select
                id="setting" name="setting" value={formData.setting} onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#C1A98A] rounded-lg bg-[#FDFBF5] text-[#4A3B31] focus:outline-none focus:border-[#A9834F]"
              >
                <option>Forest</option><option>City</option><option>Space</option><option>Underwater</option><option>Desert</option>
              </select>
            </div>
            <div>
              <label className="block text-xl font-bold text-[#4A3B31] mb-2">Story Structure</label>
              <div className="grid grid-cols-2 gap-4 text-left">
                <label className="flex items-center text-lg text-[#4A3B31]">
                  <input type="checkbox" name="beginning" checked={formData.beginning} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-[#A9834F] rounded-md border-gray-300 focus:ring-[#A9834F]" />
                  <span className="ml-2">Beginning</span>
                </label>
                <label className="flex items-center text-lg text-[#4A3B31]">
                  <input type="checkbox" name="conflict" checked={formData.conflict} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-[#A9834F] rounded-md border-gray-300 focus:ring-[#A9834F]" />
                  <span className="ml-2">Conflict</span>
                </label>
                <label className="flex items-center text-lg text-[#4A3B31]">
                  <input type="checkbox" name="climax" checked={formData.climax} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-[#A9834F] rounded-md border-gray-300 focus:ring-[#A9834F]" />
                  <span className="ml-2">Climax</span>
                </label>
                <label className="flex items-center text-lg text-[#4A3B31]">
                  <input type="checkbox" name="ending" checked={formData.ending} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-[#A9834F] rounded-md border-gray-300 focus:ring-[#A9834F]" />
                  <span className="ml-2">Ending</span>
                </label>
              </div>
            </div>
            {message && (<div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{message}</div>)}
            <button type="submit" className="w-full py-3 px-6 bg-[#A9834F] text-white font-bold rounded-lg shadow-md hover:bg-[#8B6F4E] transition duration-300 focus:outline-none focus:ring-4 focus:ring-[#A9834F]">
              SUMMON STORY
            </button>
          </form>
        </div>
        <div className="md:col-span-1 space-y-6 md:space-y-8 mt-8 md:mt-0">
          <div className="bg-[#E0C9A0] border-2 border-[#C1A98A] rounded-xl p-6 shadow-md">
            <h3 className="font-['Merriweather'] text-xl font-bold text-[#4A3B31] mb-3 uppercase">TIPS</h3>
            <p className="text-base text-[#5C4B3E]">Start with an intriguing hook to capture attention.</p>
          </div>
          <div className="bg-[#E0C9A0] border-2 border-[#C1A98A] rounded-xl p-6 shadow-md">
            <h3 className="font-['Merriweather'] text-xl font-bold text-[#4A3B31] mb-3 uppercase">TIPS</h3>
            <p className="text-base text-[#5C4B3E]">Focus on vivid, sensory details to bring scenes to life.</p>
          </div>
          <div className="bg-[#E0C9A0] border-2 border-[#C1A98A] rounded-xl p-6 shadow-md">
            <h3 className="font-['Merriweather'] text-xl font-bold text-[#4A3B31] mb-3 uppercase">TIPS</h3>
            <p className="text-base text-[#5C4B3E]">Develop well-rounded characters with clear motivations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
// --- End CreateStoryPage ---


interface LandingPageProps {
  onNavigate: (page: string) => void;
  isLoggedIn: boolean;
  user: User | null;
  onLogout: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, isLoggedIn, user, onLogout }) => {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-5 md:p-10 bg-gradient-to-br from-[#D4E1EE] via-[#F3E4D7] to-[#F0D1B0] text-[#3A4B5C] font-sans">
      <div className="max-w-4xl w-full text-center pb-24">
        <div className="absolute top-4 right-4 z-10">
          {isLoggedIn ? (
            <button
              onClick={onLogout}
              className="px-6 py-2 bg-red-500 text-white font-semibold rounded-full shadow-md hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              Logout ({user?.displayName || user?.email || 'User'})
            </button>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              Login
            </button>
          )}
        </div>
        <header className="mb-10 md:mb-16">
          <p className="font-['Lato'] text-xl md:text-2xl font-light tracking-widest mb-1 text-shadow-sm">WELCOME TO</p>
          <h1 className="font-['Georgia'] text-6xl md:text-7xl lg:text-8xl font-bold m-0 text-shadow-md">NARRATUM</h1>
        </header>
        <nav className="flex flex-wrap justify-center gap-6 md:gap-8 mb-12 md:mb-16">
          <button
            onClick={() => onNavigate('discover')}
            className="flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]"
          >
            <i className="fas fa-book-open text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">DISCOVER</span>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">STORIES</span>
          </button>
          <button
            onClick={() => onNavigate('create')}
            className="flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]"
          >
            <i className="fas fa-feather-alt text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">CREATE</span>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">STORY</span>
          </button>
          <button
            onClick={() => onNavigate('profile')}
            className="flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]"
          >
            <i className="fas fa-user-circle text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">MY</span>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">PROFILE</span>
          </button>
        </nav>
        <footer className="font-['Georgia'] italic text-xl md:text-2xl text-[#3A4B5C] text-shadow-sm mt-8">
          <p>Where your words come to life</p>
        </footer>
        <button
          onClick={() => onNavigate('subscription')}
          className="mt-8 px-8 py-4 bg-purple-600 text-white font-semibold rounded-full shadow-lg hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
        >
          View Subscriptions
        </button>
      </div>
    </div>
  );
};

interface LoginPageProps {
  onNavigate: (page: string) => void;
  onLoginSuccess: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    if (!auth || !db) { // Use imported auth and db
        setMessage("Firebase is not initialized. Cannot log in.");
        return;
    }
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider); // Use imported auth
      const user = result.user;
      const userId = user.uid;
      // Using simpler Firestore path from _app.js example
      const userDocRef = doc(db, 'users', userId); // Use imported db
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL,
          createdAt: new Date(), lastLoginAt: new Date(), role: 'user', isSetupComplete: false,
        });
        setMessage('Successfully signed in and created user profile!');
      } else {
        await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true });
        setMessage('Successfully signed in!');
      }
      console.log("Signed in with Google successfully!", user);
      onLoginSuccess(user);
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      setMessage(`Error signing in with Google: ${error.message}`);
    }
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth || !db) { // Use imported auth and db
        setMessage("Firebase is not initialized. Cannot log in.");
        return;
    }
    setMessage('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password); // Use imported auth
      const user = userCredential.user;
      const userId = user.uid;
      // Using simpler Firestore path
      const userDocRef = doc(db, 'users', userId); // Use imported db
      await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true });
      setMessage('Successfully logged in with email!');
      onLoginSuccess(user);
    } catch (error: any) {
      console.error("Email Login Error:", error);
      setMessage(`Error logging in: ${error.message}`);
    }
  };

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
          <p className="mb-2">New to Narratum? <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('signUp');}} className="text-blue-600 hover:underline font-bold">Sign up</a></p>
          <a href="#" onClick={(e) => {e.preventDefault(); setMessage('Forgot password functionality not yet implemented.')}} className="text-blue-600 hover:underline">Forgot password?</a>
        </div>
        <button onClick={() => onNavigate('landing')} className="mt-8 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</button>
      </div>
    </div>
  );
};

interface SignUpPageProps {
  onNavigate: (page: string) => void;
  onLoginSuccess: (user: User) => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
     if (!auth || !db) { // Use imported auth and db
        setMessage("Firebase is not initialized. Cannot sign up.");
        return;
    }
    setMessage('');
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password); // Use imported auth
      const user = userCredential.user;
      const userId = user.uid;
      // Using simpler Firestore path
      const userDocRef = doc(db, 'users', userId); // Use imported db
      await setDoc(userDocRef, {
        uid: user.uid, email: user.email, displayName: user.displayName || 'New User', photoURL: user.photoURL || null,
        createdAt: new Date(), lastLoginAt: new Date(), role: 'user', isSetupComplete: false,
      });
      setMessage('Account created successfully! You are now logged in.');
      onLoginSuccess(user);
    } catch (error: any) {
      console.error("Sign Up Error:", error);
      setMessage(`Error signing up: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#D4E1EE] to-[#F0D1B0] p-4 text-center font-sans">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full">
        <div className="mb-8">
          <i className="fas fa-book-open text-6xl text-[#C1905F] mb-4 inline-block animate-glow"></i>
          <h1 className="font-['Georgia'] text-4xl text-[#475B6D] font-normal tracking-wide">NARRATUM</h1>
        </div>
        <p className="text-lg text-gray-700 mb-8">Create your account to start your story.</p>
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('Error') || message.includes('match') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSignUp} className="w-full">
          <div className="input-fields-wrapper bg-[#F9F6F2] rounded-lg mb-4 shadow-sm overflow-hidden">
            <div className="input-field flex items-center p-3 border-b border-[#EDE7DF]">
              <i className="fas fa-envelope icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
              <input
                type="email" name="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base"              />
                </div>
                <div className="input-field flex items-center p-3">
                  <i className="fas fa-lock icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
                  <input
                    type="password" name="password" placeholder="Password"
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
              <p className="mb-2">Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} className="text-blue-600 hover:underline font-bold">Login</a></p>
            </div>
            <button onClick={() => onNavigate('landing')} className="mt-8 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</button>
          </div>
        </div>
      );
    };
    
