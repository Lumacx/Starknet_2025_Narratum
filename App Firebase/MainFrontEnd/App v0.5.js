import React, { useState, useEffect } from 'react';
// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithCustomToken, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'; // Import Firestore for user data persistence

// IMPORTANT: Ensure Font Awesome and Google Fonts are loaded globally in your public/index.html.
// Example lines to be in your index.html <head>:
// <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
// <link href="https://fonts.googleapis.com/css2?family=Georgia:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
// <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap" rel="stylesheet"> {/* Added Merriweather */}
// <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&display=swap" rel="stylesheet"> {/* Added Cinzel Decorative */}
// <script src="https://cdn.tailwindcss.com"></script>


/**
 * LandingPage Component
 * This component displays the main welcome screen with navigation cards.
 * It also includes a dynamic Login/Logout button in the top-right.
 * The "View Subscriptions" button is now below the tagline.
 *
 * @param {object} props - Component props
 * @param {function} props.onNavigate - Function to call when a navigation card is clicked.
 * @param {boolean} props.isLoggedIn - True if a user is logged in.
 * @param {object|null} props.user - The Firebase user object if logged in, otherwise null.
 * @param {function} props.onLogout - Function to call when the logout button is clicked.
 */
const LandingPage = ({ onNavigate, isLoggedIn, user, onLogout }) => {
  return (
    // Main container with responsive styling and background gradient
    <div className="min-h-screen relative flex flex-col items-center justify-center p-5 md:p-10 bg-gradient-to-br from-[#D4E1EE] via-[#F3E4D7] to-[#F0D1B0] text-[#3A4B5C] font-sans">
      <div className="max-w-4xl w-full text-center pb-24"> {/* Added padding-bottom for floating footer */}
        {/* Login/Logout Button in top-right corner */}
        <div className="absolute top-4 right-4 z-10"> {/* Added z-index to ensure it's above other content */}
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

        {/* Welcome Header */}
        <header className="mb-10 md:mb-16">
          <p className="font-['Lato'] text-xl md:text-2xl font-light tracking-widest mb-1 text-shadow-sm">WELCOME TO</p>
          <h1 className="font-['Georgia'] text-6xl md:text-7xl lg:text-8xl font-bold m-0 text-shadow-md">NARRATUM</h1>
        </header>

        {/* Navigation Cards */}
        <nav className="flex flex-wrap justify-center gap-6 md:gap-8 mb-12 md:mb-16">
          {/* Discover Stories Card */}
          <button
            onClick={() => onNavigate('discover')}
            className="flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg
                       text-[#3A4B5C] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]"
          >
            <i className="fas fa-book-open text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">DISCOVER</span>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">STORIES</span>
          </button>

          {/* Create Story Card */}
          <button
            onClick={() => onNavigate('create')}
            className="flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg
                       text-[#3A4B5C] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]"
          >
            <i className="fas fa-feather-alt text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">CREATE</span>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">STORY</span>
          </button>

          {/* My Profile Card */}
          <button
            onClick={() => onNavigate('profile')}
            className="flex flex-col items-center justify-center p-6 md:p-8 w-48 h-60 md:w-56 md:h-72 bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg
                       text-[#3A4B5C] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]"
          >
            <i className="fas fa-user-circle text-5xl md:text-6xl text-[#A9834F] mb-6 md:mb-8"></i>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight mb-0.5">MY</span>
            <span className="font-['Georgia'] font-bold text-lg md:text-xl uppercase leading-tight">PROFILE</span>
          </button>
        </nav>

        {/* Tagline Footer */}
        <footer className="font-['Georgia'] italic text-xl md:text-2xl text-[#3A4B5C] text-shadow-sm mt-8">
          <p>Where your words come to life</p>
        </footer>

        {/* Subscription Button - Moved below tagline */}
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

/**
 * LoginPage Component
 * Handles social logins (Google implemented) and provides link to Sign Up.
 *
 * @param {object} props - Component props
 * @param {function} props.onNavigate - Function to navigate to other pages.
 * @param {function} props.onLoginSuccess - Callback function after successful login.
 */
const LoginPage = ({ onNavigate, onLoginSuccess }) => {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /**
   * Handles Google Sign-In using Firebase.
   */
  const handleGoogleLogin = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists in Firestore and create if not
      const db = getFirestore();
      const userId = user.uid;
      const userDocRef = doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', 'users', userId, 'userData', 'profile'); // Using 'profile' as a subcollection for user data
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Create a new user document if it doesn't exist
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          role: 'user', // Default role
          isSetupComplete: false,
        });
        setMessage('Successfully signed in and created user profile!');
      } else {
        // Update last login time if user exists
        await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true });
        setMessage('Successfully signed in!');
      }

      console.log("Signed in with Google successfully!", user);
      onLoginSuccess(user); // Notify parent App component of successful login
      onNavigate('landing'); // Navigate back to landing page after login
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      setMessage(`Error signing in with Google: ${error.message}`);
    }
  };

  /**
   * Handles Email/Password Login using Firebase.
   */
  const handleEmailLogin = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setMessage('');
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login time
      const db = getFirestore();
      const userId = user.uid;
      const userDocRef = doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', 'users', userId, 'userData', 'profile');
      await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true });

      setMessage('Successfully logged in with email!');
      onLoginSuccess(user);
      onNavigate('landing');
    } catch (error) {
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
          {/* Placeholder for Facebook Sign-In */}
          <button
            className="w-full py-3 px-6 bg-[#1877F2] text-white font-semibold rounded-full shadow-md hover:bg-[#166FE5] transition duration-300 flex items-center justify-center"
            onClick={() => setMessage('Facebook Sign-In not yet implemented. Please configure in Firebase and add code.')}
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
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base"
                  required
                />
              </div>
              <div className="input-field flex items-center p-3">
                <i className="fas fa-lock icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base"
                  required
                />
              </div>
            </div>
            <button type="submit" className="w-full py-3 px-6 bg-[#627C90] text-white font-semibold rounded-full shadow-md hover:bg-[#536A7D] transition duration-300 uppercase tracking-wide">
              Log in with Email
            </button>
          </form>
        </div>

        <div className="text-sm text-gray-600 mt-8">
          <p className="mb-2">New to Narratum? <a href="#" onClick={() => onNavigate('signUp')} className="text-blue-600 hover:underline font-bold">Sign up</a></p>
          <a href="#" onClick={() => setMessage('Forgot password functionality not yet implemented.')} className="text-blue-600 hover:underline">Forgot password?</a>
        </div>

        <button onClick={() => onNavigate('landing')} className="mt-8 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</button>
      </div>
    </div>
  );
};

/**
 * SignUpPage Component
 * Allows users to create a new account with email and password.
 *
 * @param {object} props - Component props
 * @param {function} props.onNavigate - Function to navigate to other pages.
 * @param {function} props.onLoginSuccess - Callback function after successful sign-up/login.
 */
const SignUpPage = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage('');

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      const db = getFirestore();
      const userId = user.uid;
      const userDocRef = doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', 'users', userId, 'userData', 'profile');
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'New User',
        photoURL: user.photoURL || null,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        role: 'user',
        isSetupComplete: false,
      });

      setMessage('Account created successfully! You are now logged in.');
      onLoginSuccess(user); // Log in the user after sign-up
      onNavigate('landing'); // Navigate to landing page
    } catch (error) {
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
                type="email"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base"
                required
              />
            </div>
            <hr className="separator border-0 h-px bg-[#EDE7DF]" />
            <div className="input-field flex items-center p-3 border-b border-[#EDE7DF]">
              <i className="fas fa-lock icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base"
                required
              />
            </div>
            <hr className="separator border-0 h-px bg-[#EDE7DF]" />
            <div className="input-field flex items-center p-3">
              <i className="fas fa-lock icon text-gray-500 mr-3 text-lg w-5 text-center"></i>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-3 px-6 bg-[#627C90] text-white font-semibold rounded-full shadow-md hover:bg-[#536A7D] transition duration-300 uppercase tracking-wide">
            SIGN UP
          </button>
        </form>

        <div className="text-sm text-gray-600 mt-8">
          <p className="mb-2">Already have an account? <a href="#" onClick={() => onNavigate('login')} className="text-blue-600 hover:underline font-bold">Log in</a></p>
        </div>

        <button onClick={() => onNavigate('landing')} className="mt-8 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</button>
      </div>
    </div>
  );
};


/**
 * LogoutPage Component
 * Handles the logout process and displays a confirmation message.
 *
 * @param {object} props - Component props
 * @param {function} props.onNavigate - Function to navigate to other pages.
 * @param {function} props.onLogoutSuccess - Callback function after successful logout.
 */
const LogoutPage = ({ onNavigate, onLogoutSuccess }) => {
  const [message, setMessage] = useState('Logging out...');

  useEffect(() => {
    const handleLogout = async () => {
      try {
        const auth = getAuth();
        await signOut(auth);
        setMessage('You have been successfully logged out.');
        onLogoutSuccess(); // Notify parent App component of successful logout
        // Automatically navigate back to landing after a short delay
        setTimeout(() => {
          onNavigate('landing');
        }, 2000);
      } catch (error) {
        console.error("Logout Error:", error);
        setMessage(`Error during logout: ${error.message}`);
      }
    };

    handleLogout();
  }, [onNavigate, onLogoutSuccess]); // Re-run effect if onNavigate or onLogoutSuccess changes

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#E0F2F7] to-[#C8E6C9] p-4 text-center font-sans">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">Logout</h2>
        <p className="text-lg text-gray-600 mb-10">{message}</p>
        <button onClick={() => onNavigate('landing')} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300">Return to Landing Page</button>
      </div>
    </div>
  );
};

/**
 * ProfilePage Component
 * Displays user profile information and content cards.
 *
 * @param {object} props - Component props
 *
 * @param {object|null} props.user - The Firebase user object.
 * @param {function} props.onNavigate - Function to navigate to other pages.
 */
const ProfilePage = ({ user, onNavigate }) => {
  const [message, setMessage] = useState('');

  // Placeholder image URLs for content cards
  const contentImages = [
    'https://placehold.co/160x160/A88F72/FFFFFF?text=Story+1',
    'https://placehold.co/160x160/8B6F4E/FFFFFF?text=Story+2',
    'https://placehold.co/160x160/CBBBA0/FFFFFF?text=Story+3',
    'https://placehold.co/160x160/F0E6D2/4A3B31?text=Story+4',
    'https://placehold.co/160x160/D4E1EE/4A3B31?text=Story+5',
    'https://placehold.co/160x160/F3E4D7/4A3B31?text=Story+6',
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#F5EFE3] text-[#4A3B31] font-['Georgia'] p-5 md:p-10 box-border">
      <div className="profile-container w-full max-w-3xl text-center">
        <header className="profile-header mb-8">
          <div className="avatar-section relative inline-block mb-4">
            <div className="avatar-frame w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-[#8B6F4E] p-1.5 bg-[#F5EFE3] flex justify-center items-center shadow-md">
              <img
                src={user?.photoURL || 'https://placehold.co/160x160/A88F72/FFFFFF?text=User'}
                alt="User Avatar"
                className="avatar-image w-full h-full rounded-full border-3 border-[#A88F72] object-cover"
              />
            </div>
          </div>
          <h1 className="user-name text-4xl md:text-5xl font-bold text-[#3D2B1F] m-0">
            {user?.displayName || user?.email || 'Guest User'}
          </h1>
        </header>

        <hr className="separator border-0 h-0.5 bg-[#B09A7A] my-8" />

        <nav className="profile-navigation flex justify-around items-center mb-8 px-2 md:px-4 flex-wrap gap-y-4">
          <button onClick={() => setMessage('My Stories section clicked!')} className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#5C4B3E] transition-colors duration-300 hover:text-[#8B6F4E] focus:outline-none">MY STORIES</button>
          <button onClick={() => setMessage('Drafts section clicked!')} className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#5C4B3E] transition-colors duration-300 hover:text-[#8B6F4E] focus:outline-none">DRAFTS</button>
          <button onClick={() => setMessage('Favorites section clicked!')} className="nav-link text-lg font-bold uppercase tracking-wide px-3 py-1.5 text-[#5C4B3E] transition-colors duration-300 hover:text-[#8B6F4E] focus:outline-none">FAVORITES</button>
        </nav>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-blue-100 text-blue-700">
            {message}
          </div>
        )}

        <main className="content-grid flex justify-center gap-5 flex-wrap">
          {contentImages.map((src, index) => (
            <a key={index} href={`#story${index + 1}`} className="content-card w-40 bg-[#F0E6D2] border-3 border-[#A88F72] rounded-lg p-1.5 block shadow-sm transition-transform duration-200 ease-in-out hover:translate-y-[-4px] hover:shadow-md">
              <img src={src} alt={`Story ${index + 1}`} className="w-full h-auto block rounded-sm" />
            </a>
          ))}
        </main>

        <hr className="separator bottom-separator border-0 h-0.5 bg-[#B09A7A] my-10" />

        <button onClick={() => onNavigate('landing')} className="mt-8 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</button>
      </div>
    </div>
  );
};

/**
 * SubscriptionPage Component
 * Displays different subscription plans.
 *
 * @param {object} props - Component props
 * @param {function} props.onNavigate - Function to navigate to other pages.
 */
const SubscriptionPage = ({ onNavigate }) => {
  const [message, setMessage] = useState('');

  const handleSubscribe = (planName) => {
    setMessage(`You clicked to subscribe to the ${planName} plan! (Functionality not yet implemented)`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 md:p-10 bg-gradient-to-br from-[#D4E1EE] via-[#F3E4D7] to-[#F0D1B0] text-[#4A3B31] font-sans">
      <div className="subscription-container w-full max-w-5xl text-center">
        <header className="page-header mb-12 md:mb-16">
          {/* Using text for Narratum Logo for consistency with LandingPage */}
          <h1 className="font-['Georgia'] text-5xl md:text-6xl font-bold text-[#2C3E50] mb-6 filter drop-shadow-md">NARRATUM</h1>
          <h1 className="font-['Merriweather'] text-3xl md:text-4xl font-bold uppercase tracking-wide text-[#2C3E50] mb-1">CHOOSE YOUR PATH</h1>
          <h2 className="font-['Merriweather'] text-2xl md:text-3xl font-normal uppercase tracking-wide text-[#2C3E50]">IN NARRATUM</h2>
        </header>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-blue-100 text-blue-700">
            {message}
          </div>
        )}

        <main className="pricing-plans flex justify-center gap-8 md:gap-10 flex-wrap">
          {/* Free Plan Card */}
          <div className="plan-card bg-[#F9F6F0] border-2 border-[#C1A98A] rounded-xl p-8 md:p-10 w-64 flex flex-col items-center shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
            <i className="fas fa-feather-alt text-6xl text-[#A9834F] mb-6"></i>
            <h3 className="font-['Merriweather'] text-2xl font-extrabold uppercase text-[#4A3B31] mb-2">FREE</h3>
            <p className="font-['Merriweather'] text-3xl font-bold text-[#3D2B1F] mb-6">Free</p>
            <button
              onClick={() => handleSubscribe('Free')}
              className="font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-6 text-base font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 ease-in-out w-4/5 shadow-md hover:bg-[#4E5C6A] hover:translate-y-[-2px]"
            >
              SUBSCRIBE
            </button>
          </div>

          {/* Plus Plan Card (Featured) */}
          <div className="plan-card featured-plan bg-[#F9F6F0] border-2 border-[#A9834F] rounded-xl p-8 md:p-10 w-64 flex flex-col items-center shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl transform scale-100"> {/* Removed initial scale(1.05) to avoid CLS */}
            <i className="fas fa-star text-6xl text-[#A9834F] mb-6"></i>
            <h3 className="font-['Merriweather'] text-2xl font-extrabold uppercase text-[#4A3B31] mb-2">PLUS</h3>
            <p className="font-['Merriweather'] text-3xl font-bold text-[#3D2B1F] mb-6">$10 <span className="text-base font-normal block leading-none mt-0.5 text-[#5C4B3E]">month</span></p>
            <button
              onClick={() => handleSubscribe('Plus')}
              className="font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-6 text-base font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 ease-in-out w-4/5 shadow-md hover:bg-[#4E5C6A] hover:translate-y-[-2px]"
            >
              SUBSCRIBE
            </button>
          </div>

          {/* Master Plan Card */}
          <div className="plan-card bg-[#F9F6F0] border-2 border-[#C1A98A] rounded-xl p-8 md:p-10 w-64 flex flex-col items-center shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
            <i className="fas fa-dragon text-6xl text-[#A9834F] mb-6"></i>
            <h3 className="font-['Merriweather'] text-2xl font-extrabold uppercase text-[#4A3B31] mb-2">MASTER</h3>
            <p className="font-['Merriweather'] text-3xl font-bold text-[#3D2B1F] mb-6">$25 <span className="text-base font-normal block leading-none mt-0.5 text-[#5C4B3E]">month</span></p>
            <button
              onClick={() => handleSubscribe('Master')}
              className="font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-6 text-base font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 ease-in-out w-4/5 shadow-md hover:bg-[#4E5C6A] hover:translate-y-[-2px]"
            >
              SUBSCRIBE
            </button>
          </div>
        </main>

        <button onClick={() => onNavigate('landing')} className="mt-12 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</button>
      </div>
    </div>
  );
};

/**
 * AboutUsPage Component
 * Displays information about Narratum.
 *
 * @param {object} props - Component props
 * @param {function} props.onNavigate - Function to navigate to other pages.
 */
const AboutUsPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5EFE3] text-[#4A3B31] font-['Georgia'] p-5 md:p-10 box-border text-center">
      <div className="about-container w-full max-w-3xl">
        <header className="page-title mb-10 md:mb-12">
          <h1 className="font-['Merriweather'] text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-[#5D4037] m-0">ABOUT US</h1>
        </header>

        <section className="quote-section mb-12 md:mb-16">
          <div className="quote-box bg-[#FAF6EE] border-2 border-[#C1A98A] rounded-xl p-6 md:p-8 inline-block max-w-[80%] shadow-md">
            <p className="font-['Georgia'] text-xl md:text-2xl leading-relaxed text-[#4A3B31] m-0">
              Narratum is a gateway between worlds, where every voice finds its story.
            </p>
          </div>
        </section>

        <section className="image-section">
          <img
            src="https://placehold.co/350x250/C1A98A/FFFFFF?text=Book+Tree"
            alt="Narratum - Book of Worlds"
            className="main-image max-w-xs md:max-w-md w-full h-auto block mx-auto filter drop-shadow-lg"
          />
        </section>
        <button onClick={() => onNavigate('landing')} className="mt-12 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</button>
      </div>
    </div>
  );
};

/**
 * LegalDisclaimerPage Component
 * Displays legal disclaimer and requires acceptance.
 *
 * @param {object} props - Component props
 * @param {function} props.onNavigate - Function to navigate to other pages.
 */
const LegalDisclaimerPage = ({ onNavigate }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [message, setMessage] = useState('');

  const handleCheckboxChange = (event) => {
    setIsChecked(event.target.checked);
    setMessage(''); // Clear message on checkbox change
  };

  const handleAccept = () => {
    if (isChecked) {
      // In a real application, you would send this agreement to your backend
      console.log("Agreement accepted. User ID (placeholder): USER_ID_HERE");
      setMessage("Thank you for accepting the terms and conditions.");
      // Optionally navigate away after acceptance
      // setTimeout(() => onNavigate('landing'), 1500);
    } else {
      setMessage("Please accept the terms and conditions to proceed.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5EFE3] text-[#4A3B31] font-['Georgia'] p-5 md:p-10 box-border text-center">
      <div className="disclaimer-container w-full max-w-xl">
        <header className="page-title mb-10 md:mb-12">
          <h1 className="font-['Merriweather'] text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-[#3E5062] leading-tight m-0">
            LEGAL<br />DISCLAIMER
          </h1>
        </header>

        <section className="disclaimer-content mb-8">
          <div className="text-box bg-[#FAF6EE] border-2 border-[#C1A98A] rounded-xl p-6 md:p-8 inline-block max-w-[90%] shadow-md">
            <p className="font-['Georgia'] text-lg md:text-xl leading-relaxed text-[#4A3B31] m-0">
              By accessing or using this website, you agree to our <a href="#" onClick={() => setMessage('Terms and Conditions link clicked!')} className="text-[#3E5062] underline font-bold hover:text-[#2C3E50]">Terms and Conditions</a>.
            </p>
          </div>
        </section>

        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm ${message.includes('Error') || message.includes('Please') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <section className="acceptance-section mb-8 flex justify-center items-center">
          <input
            type="checkbox"
            id="accept-checkbox"
            name="accept-terms"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="appearance-none w-5 h-5 border-2 border-[#A88F72] rounded-sm bg-[#FDFBF5] mr-2 cursor-pointer checked:bg-[#A88F72] checked:border-[#8B6F4E] focus:outline-none focus:ring-2 focus:ring-[#A88F72]"
          />
          <label htmlFor="accept-checkbox" className="font-['Georgia'] text-base text-[#5C4B3E] cursor-pointer">
            I accept the terms and conditions
          </label>
        </section>

        <section className="action-section">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!isChecked}
            className={`font-['Merriweather'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-xl py-3 px-10 text-lg font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 shadow-md
              ${!isChecked ? 'opacity-50 cursor-not-allowed bg-[#85929E] text-[#CDD3D8] shadow-none' : 'hover:bg-[#4E5C6A]'}`}
          >
            ACCEPT
          </button>
        </section>
        <button onClick={() => onNavigate('landing')} className="mt-12 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</button>
      </div>
    </div>
  );
};


/**
 * DashboardPage Component
 * Displays admin dashboard statistics and navigation.
 *
 * @param {object} props - Component props
 * @param {function} props.onNavigate - Function to navigate to other pages.
 */
const DashboardPage = ({ onNavigate }) => {
  const [message, setMessage] = useState('');
  const [activeUsers, setActiveUsers] = useState(0);
  const [storiesCreated, setStoriesCreated] = useState(0);
  const [paidUsers, setPaidUsers] = useState(0);

  // Animation function for counters
  const animateValue = (setter, start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setter(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  useEffect(() => {
    // Target values for the counters (replace with actual data fetching if needed)
    const targetActiveUsers = 1200;
    const targetStoriesCreated = 3500;
    const targetPaidUsers = 120;

    animateValue(setActiveUsers, 0, targetActiveUsers, 1500);
    animateValue(setStoriesCreated, 0, targetStoriesCreated, 1500);
    animateValue(setPaidUsers, 0, targetPaidUsers, 1500);
  }, []); // Run animation once on component mount

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F5EFE3] text-[#3E5062] font-sans">
      {/* Sidebar */}
      <aside className="sidebar bg-[#3E5062] w-full md:w-20 pt-8 flex flex-row md:flex-col items-center justify-around md:justify-start flex-shrink-0 p-4 md:p-0">
        <nav className="sidebar-nav flex flex-row md:flex-col gap-4 md:gap-6">
          <button onClick={() => setMessage('Analytics clicked!')} className="nav-item text-[#D4DDE4] text-2xl md:text-3xl p-2 md:p-3 rounded-md transition-colors duration-200 hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none">
            <i className="fas fa-chart-bar"></i>
          </button>
          <button onClick={() => setMessage('Manage Stories clicked!')} className="nav-item text-[#D4DDE4] text-2xl md:text-3xl p-2 md:p-3 rounded-md transition-colors duration-200 hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none">
            <i className="fas fa-pencil-alt"></i>
          </button>
          <button onClick={() => setMessage('User Reports clicked!')} className="nav-item text-[#D4DDE4] text-2xl md:text-3xl p-2 md:p-3 rounded-md transition-colors duration-200 hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none">
            <i className="fas fa-file-alt"></i>
          </button>
          <button onClick={() => setMessage('Settings clicked!')} className="nav-item text-[#D4DDE4] text-2xl md:text-3xl p-2 md:p-3 rounded-md transition-colors duration-200 hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none">
            <i className="fas fa-cog"></i>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content flex-grow p-8 md:p-12 flex flex-col items-center">
        <header className="dashboard-header text-center mb-12 w-full max-w-3xl">
          <div className="logo-title flex items-center justify-center mb-1">
            <i className="fas fa-book-open text-5xl text-[#B08D57] mr-4"></i>
            <span className="font-['Merriweather'] text-5xl font-extrabold text-[#3E5062] tracking-wide">NARRATUM</span>
          </div>
          <h1 className="font-['Lato'] text-xl md:text-2xl font-bold uppercase tracking-wide text-[#5D7081] m-0">ADMIN DASHBOARD</h1>
        </header>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-blue-100 text-blue-700">
            {message}
          </div>
        )}

        <section className="stats-overview w-full max-w-3xl mb-10">
          <div className="stats-box bg-[#FAF6EE] border-2 border-[#C1A98A] rounded-xl p-8 flex flex-wrap justify-around gap-5 shadow-md">
            <div className="stat-item text-center flex-grow basis-1/2 min-w-[150px] md:basis-auto">
              <div className="font-['Georgia'] text-6xl font-bold text-[#3E5062] leading-tight mb-1" id="active-users-count">{activeUsers}</div>
              <div className="font-['Lato'] text-sm font-bold uppercase tracking-wide text-[#5D7081]">ACTIVE USERS</div>
            </div>
            <div className="stat-item text-center flex-grow basis-1/2 min-w-[150px] md:basis-auto">
              <div className="font-['Georgia'] text-6xl font-bold text-[#3E5062] leading-tight mb-1" id="stories-created-count">{storiesCreated}</div>
              <div className="font-['Lato'] text-sm font-bold uppercase tracking-wide text-[#5D7081]">STORIES CREATED</div>
            </div>
            <div className="stat-item text-center flex-grow basis-full md:basis-auto mt-5 md:mt-0"> {/* Adjusted for centering on smaller screens */}
              <div className="font-['Georgia'] text-6xl font-bold text-[#3E5062] leading-tight mb-1" id="paid-users-count">{paidUsers}</div>
              <div className="font-['Lato'] text-sm font-bold uppercase tracking-wide text-[#5D7081]">PAID USERS</div>
            </div>
          </div>
        </section>

        <section className="action-area mt-8">
          <button type="button" className="font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-10 text-lg font-bold uppercase tracking-wide cursor-pointer transition-colors duration-300 shadow-md hover:bg-[#4E5C6A]">
            ACCEPT
          </button>
        </section>
        <button onClick={() => onNavigate('landing')} className="mt-12 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300">Back to Landing</button>
      </main>
    </div>
  );
};


/**
 * CatalogPage Component
 * Displays a catalog of stories with filtering options and semantic search.
 *
 * @param {object} props - Component props
 * @param {function} props.onNavigate - Function to navigate to other pages.
 */
const CatalogPage = ({ onNavigate }) => {
  const allStories = [
    { title: 'The Enchanted Forest', image: 'https://picsum.photos/seed/forest/300/200' },
    { title: 'Space Adventure', image: 'https://picsum.photos/seed/space/300/200' },
    { title: 'Wizard\'s Spell', image: 'https://picsum.photos/seed/wizard/300/200' },
    { title: 'The Flying Bananas', image: 'https://placehold.co/300x200/BFA071/1A2533?text=Flying+Bananas' },
    { title: 'Mystery Manor', image: 'https://picsum.photos/seed/manor/300/200' },
    { title: 'Moon Journey', image: 'https://picsum.photos/seed/moon/300/200' },
    { title: 'Hero\'s Journey', image: 'https://picsum.photos/seed/hero/300/200' },
    { title: 'The Lost City', image: 'https://picsum.photos/seed/city/300/200' },
    { title: 'Dragon\'s Hoard', image: 'https://picsum.photos/seed/dragon/300/200' },
    { title: 'Ancient Prophecy', image: 'https://picsum.photos/seed/prophecy/300/200' },
    { title: 'Cyberpunk City', image: 'https://picsum.photos/seed/cyberpunk/300/200' },
  ];

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedStories, setDisplayedStories] = useState(allStories);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

  // Effect to re-filter/reset stories when filter changes
  useEffect(() => {
    if (activeFilter === 'all') {
      setDisplayedStories(allStories);
      setSearchMessage('');
    } else {
      // For 'popular', 'recent', 'theme', etc., you'd implement actual filtering logic here.
      // For now, it just shows a message and keeps all stories.
      setDisplayedStories(allStories); // Keep all stories for now unless actual filtering is implemented
    }
  }, [activeFilter]);

  const handleFilterClick = (filter) => {
    setActiveFilter(filter);
    setSearchQuery(''); // Clear search query when changing filter
    setSearchMessage(`Filter set to: ${filter}. (Actual filtering logic for categories not implemented yet.)`);
  };

  const handleReadClick = (storyTitle) => {
    setSearchMessage(`Reading "${storyTitle}" (Functionality not yet implemented)`);
  };

  /**
   * Performs a semantic search using the Gemini API.
   * It sends the user's query and available story titles to the LLM,
   * asking it to return semantically relevant titles.
   */
  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchMessage('Please enter a search query.');
      setDisplayedStories(allStories); // Reset to all stories if search query is empty
      return;
    }

    setIsLoading(true);
    setSearchMessage('Searching for stories...');
    setDisplayedStories([]); // Clear previous results

    try {
      const storyTitles = allStories.map(story => story.title);
      const prompt = `Given the following story titles: ${JSON.stringify(storyTitles)}.
                      Find titles that are semantically related to "${searchQuery}".
                      Return only a JSON array of the matching story titles.
                      If no titles are semantically related, return an empty array.`;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = {
        contents: chatHistory,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: { "type": "STRING" }
          }
        }
      };

      const apiKey = ""; // Canvas will automatically provide this at runtime
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const matchedTitles = JSON.parse(jsonString);

        if (Array.isArray(matchedTitles) && matchedTitles.length > 0) {
          const filtered = allStories.filter(story => matchedTitles.includes(story.title));
          setDisplayedStories(filtered);
          setSearchMessage(`Found ${filtered.length} matching stories.`);
        } else {
          setDisplayedStories([]);
          setSearchMessage('No semantically related stories found.');
        }
      } else {
        setSearchMessage('No valid response from search API.');
        setDisplayedStories([]);
      }
    } catch (error) {
      console.error("Semantic search error:", error);
      setSearchMessage(`Error during search: ${error.message}. Please try again.`);
      setDisplayedStories([]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen relative flex flex-col items-center p-5 md:p-10 bg-[#1A2533] text-[#E0C9A0] font-sans box-border">
      {/* Back to Landing Button in top-right corner, now fixed */}
      <div className="fixed top-4 right-4 z-50"> {/* z-50 ensures it's above other content */}
        <button
          onClick={() => onNavigate('landing')}
          className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Back to Landing
        </button>
      </div>

      <div className="catalog-container w-full max-w-6xl text-center pt-16"> {/* Added padding-top to account for floating button */}
        <header className="page-header mb-8">
          <h1 className="font-['Cinzel_Decorative'] text-5xl md:text-6xl font-bold text-[#E0C9A0] m-0 tracking-wide">NARRATUM</h1>
          <h2 className="font-['Lato'] text-xl md:text-2xl font-bold uppercase tracking-wider text-[#BFA071] m-0">CATALOG OF STORIES</h2>
        </header>

        {/* Filter Navigation */}
        <nav className="filter-nav flex justify-center gap-6 md:gap-8 mb-6 flex-wrap">
          <button
            onClick={() => handleFilterClick('all')}
            className={`font-['Lato'] text-lg font-bold px-3 py-1.5 border-b-2 transition-colors duration-300 focus:outline-none
              ${activeFilter === 'all' ? 'text-[#E0C9A0] border-[#E0C9A0]' : 'text-[#BFA071] border-transparent hover:text-[#E0C9A0] hover:border-[#E0C9A0]'}`}
          >
            All stories
          </button>
          <button
            onClick={() => handleFilterClick('popular')}
            className={`font-['Lato'] text-lg font-bold px-3 py-1.5 border-b-2 transition-colors duration-300 focus:outline-none
              ${activeFilter === 'popular' ? 'text-[#E0C9A0] border-[#E0C9A0]' : 'text-[#BFA071] border-transparent hover:text-[#E0C9A0] hover:border-[#E0C9A0]'}`}
          >
            Popular
          </button>
          <button
            onClick={() => handleFilterClick('recent')}
            className={`font-['Lato'] text-lg font-bold px-3 py-1.5 border-b-2 transition-colors duration-300 focus:outline-none
              ${activeFilter === 'recent' ? 'text-[#E0C9A0] border-[#E0C9A0]' : 'text-[#BFA071] border-transparent hover:text-[#E0C9A0] hover:border-[#E0C9A0]'}`}
          >
            Recent
          </button>
          <button
            onClick={() => handleFilterClick('theme')}
            className={`font-['Lato'] text-lg font-bold px-3 py-1.5 border-b-2 transition-colors duration-300 focus:outline-none
              ${activeFilter === 'theme' ? 'text-[#E0C9A0] border-[#E0C9A0]' : 'text-[#BFA071] border-transparent hover:text-[#E0C9A0] hover:border-[#E0C9A0]'}`}
          >
            Theme
          </button>
        </nav>

        {/* Semantic Search Box */}
        <div className="flex justify-center items-center gap-3 mb-8 w-full max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search stories semantically..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow p-3 rounded-lg border-2 border-[#4A5C6E] bg-[#233446] text-[#E0C9A0] placeholder-[#8FA0AF] focus:outline-none focus:border-[#BFA071]"
          />
          <button
            onClick={handleSemanticSearch}
            disabled={isLoading}
            className="bg-[#BFA071] text-[#1A2533] py-3 px-6 rounded-lg font-bold text-sm uppercase tracking-wide transition-colors duration-300 hover:bg-[#E0C9A0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchMessage && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-blue-100 text-blue-700">
            {searchMessage}
          </div>
        )}

        <main className="story-grid flex flex-wrap justify-center gap-8">
          {displayedStories.length > 0 ? (
            displayedStories.map((story, index) => (
              <div key={index} className="story-card bg-[#233446] border-2 border-[#4A5C6E] p-2.5 rounded-lg w-64 text-[#E0C9A0] shadow-xl relative transition-all duration-300 ease-in-out hover:translate-y-[-5px] hover:shadow-2xl">
                {/* Inner border effect */}
                <div className="absolute inset-1 border border-[#BFA071] rounded-md pointer-events-none z-10"></div>
                {/* Corner stars */}
                <span className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 text-[#BFA071] text-2xl z-20"><i className="fas fa-star"></i></span>
                <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 text-[#BFA071] text-2xl z-20"><i className="fas fa-star"></i></span>
                <span className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 text-[#BFA071] text-2xl z-20"><i className="fas fa-star"></i></span>
                <span className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 text-[#BFA071] text-2xl z-20"><i className="fas fa-star"></i></span>

                <div className="card-art-container w-full h-40 mb-4 rounded-sm overflow-hidden relative z-20">
                  <img src={story.image} alt={story.title} className="w-full h-full object-cover block" />
                </div>
                <h3 className="font-['Merriweather'] text-xl font-bold mb-4 leading-tight min-h-[3.25rem] z-20">{story.title}</h3>
                <button
                  onClick={() => handleReadClick(story.title)}
                  className="font-['Lato'] bg-[#BFA071] text-[#1A2533] py-2.5 px-6 rounded-md text-base font-bold uppercase tracking-wide inline-block mb-1.5 transition-colors duration-300 hover:bg-[#E0C9A0] z-20"
                >
                  READ
                </button>
              </div>
            ))
          ) : (
            !isLoading && <p className="text-lg text-gray-400">No stories to display based on current filter/search.</p>
          )}
        </main>

        {/* Removed the static "Back to Landing" button from the bottom */}
      </div>
    </div>
  );
};


/**
 * Main App Component
 * This component acts as the central hub for the application, managing routing,
 * Firebase authentication state, and integrating different modules/pages.
 */
const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null); // Stores Firebase user object
  const [isAuthReady, setIsAuthReady] = useState(false); // Tracks if Firebase auth state is initialized

  // Firebase Initialization and Auth State Listener
  useEffect(() => {
    // Ensure Firebase config is available globally (provided by Canvas environment)
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Use __app_id for Firestore paths

    // Initialize Firebase app
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app); // Initialize Firestore

    // Sign in with custom token if available, otherwise anonymously
    const signInUser = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
          console.log('Signed in with custom token.');
        } else {
          await signInAnonymously(auth);
          console.log('Signed in anonymously.');
        }
      } catch (error) {
        console.error('Firebase initial sign-in error:', error);
      } finally {
        setIsAuthReady(true); // Mark auth as ready regardless of success/failure
      }
    };

    signInUser();

    // Set up Firebase Auth state observer
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      // If a user is logged in (even anonymously), ensure their profile data exists in Firestore
      if (currentUser) {
        const userId = currentUser.uid;
        const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'userData', 'profile');
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          // Create a basic user document if it doesn't exist
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            email: currentUser.email || null,
            displayName: currentUser.displayName || 'Anonymous User',
            photoURL: currentUser.photoURL || null,
            createdAt: new Date(),
            lastLoginAt: new Date(),
            role: 'user',
            isSetupComplete: false,
          }, { merge: true });
          console.log('Created new user document in Firestore for UID:', currentUser.uid);
        } else {
          // Update last login time
          await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true });
        }
      }
      setIsAuthReady(true); // Ensure auth state is marked as ready after initial check
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array means this runs once on mount

  /**
   * Handles navigation between different pages/modules.
   * @param {string} pageName - The name of the page to navigate to.
   */
  const handleNavigation = (pageName) => {
    setCurrentPage(pageName);
  };

  /**
   * Callback for successful login. Updates the user state.
   * @param {object} loggedInUser - The Firebase user object.
   */
  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setCurrentPage('landing'); // Navigate to landing page after successful login
  };

  /**
   * Callback for successful logout. Clears the user state.
   */
  const handleLogoutSuccess = () => {
    setUser(null);
    setCurrentPage('landing'); // Navigate to landing page after successful logout
  };

  // Render the appropriate component based on the currentPage state
  const renderPage = () => {
    // Show a loading screen until Firebase auth state is determined
    if (!isAuthReady) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p className="text-xl text-gray-700">Loading application...</p>
        </div>
      );
    }

    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={handleNavigation} isLoggedIn={!!user} user={user} onLogout={handleLogoutSuccess} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigation} onLoginSuccess={handleLoginSuccess} />;
      case 'signUp':
        return <SignUpPage onNavigate={handleNavigation} onLoginSuccess={handleLoginSuccess} />;
      case 'logout':
        return <LogoutPage onNavigate={handleNavigation} onLogoutSuccess={handleLogoutSuccess} />;
      case 'discover': // Now renders the CatalogPage
        return <CatalogPage onNavigate={handleNavigation} />;
      case 'create': // Now renders the CreateStoryPage
        return <CreateStoryPage onNavigate={handleNavigation} />;
      case 'profile':
        return <ProfilePage onNavigate={handleNavigation} user={user} />;
      case 'subscription':
        return <SubscriptionPage onNavigate={handleNavigation} />;
      case 'aboutUs':
        return <AboutUsPage onNavigate={handleNavigation} />;
      case 'legalDisclaimer':
        return <LegalDisclaimerPage onNavigate={handleNavigation} />;
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigation} />;
      default:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-red-100 p-4">
            <h2 className="text-3xl font-bold text-red-700 mb-6">404 - Page Not Found</h2>
            <button onClick={() => setCurrentPage('landing')} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300">Back to Landing</button>
          </div>
        );
    }
  };

  return (
    <div className="App">
      {renderPage()}
      {/* Floating Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 flex justify-around items-center shadow-lg z-50">
        <button
          onClick={() => handleNavigation('aboutUs')}
          className="flex flex-col items-center text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200"
        >
          <i className="fas fa-info-circle text-xl mb-1"></i>
          <span>About Us</span>
        </button>
        <button
          onClick={() => handleNavigation('subscription')}
          className="flex flex-col items-center text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200"
        >
          <i className="fas fa-dollar-sign text-xl mb-1"></i>
          <span>Subscription</span>
        </button>
        <button
          onClick={() => handleNavigation('dashboard')}
          className="flex flex-col items-center text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200"
        >
          <i className="fas fa-tachometer-alt text-xl mb-1"></i>
          <span>Dashboard</span>
        </button>
        {/* Legal Disclaimer Button - Added to the far right */}
        <button
          onClick={() => handleNavigation('legalDisclaimer')}
          className="flex flex-col items-center text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200"
        >
          <i className="fas fa-balance-scale text-xl mb-1"></i> {/* Using balance-scale for legal */}
          <span>Legal</span>
        </button>
      </div>
    </div>
  );
};

export default App; // Export the main App component
