// src/app/login/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { auth } from '../../lib/firebase';
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  UserCredential,
  AuthError
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { manageUserInFirestore } from '../../lib/userUtils';

export default function LoginPage() {
  const router = useRouter();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [authActionInProgress, setAuthActionInProgress] = useState(false);

  useEffect(() => {
    console.log("Firebase auth object on login page mount:", auth);
  }, []);

  useEffect(() => {
    if (!authActionInProgress && !loadingGoogle) {
      setLoadingGoogle(true);
      console.log("Checking for Google redirect result...");
      getRedirectResult(auth)
        .then(async (result) => {
          if (result) {
            const user = result.user;
            console.log("Signed in with Google (redirect) successfully!", user);
            await manageUserInFirestore(user);
            router.push('/python_image_tester.html'); // MODIFIED: Redirect to python_image_tester.html
          } else {
            console.log("No redirect result found on initial load.");
          }
        })
        .catch((error) => {
          console.error("Google Sign-In (redirect) Error during getRedirectResult:", error.code, error.message);
        })
        .finally(() => {
          setLoadingGoogle(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleGoogleSignInRedirect = useCallback(async () => {
    if (authActionInProgress) return;
    console.log("Google Sign-In button clicked. Attempting signInWithRedirect...");
    setAuthActionInProgress(true);
    setLoadingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
      // The redirect will be handled by the useEffect hook above when the user returns to the app
    } catch (error: any) {
      console.error("Google Sign-In Redirect synchronous initiation error:", error);
      alert(`Error starting Google Sign-In: ${error.message || 'Unknown error'}`);
      setLoadingGoogle(false);
      setAuthActionInProgress(false);
    }
  }, [auth, authActionInProgress]);

  const handleEmailLogin = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (authActionInProgress) return;
    setAuthActionInProgress(true);
    setLoadingEmail(true);
    const email = (event.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value;
    const password = (event.currentTarget.elements.namedItem('password') as HTMLInputElement)?.value;
    
    if (!email || !password) {
      alert("Please enter both email and password.");
      setLoadingEmail(false);
      setAuthActionInProgress(false);
      return;
    }

    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Signed in with Email/Password successfully!", userCredential.user);
      await manageUserInFirestore(userCredential.user);
      router.push('/python_image_tester.html'); // MODIFIED: Redirect to python_image_tester.html
    } catch (error: any) {
      const authError = error as AuthError;
      console.error("Email/Password Sign-In Error:", authError.code, authError.message);
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        alert("Invalid email or password. Please try again.");
      } else if (authError.code === 'auth/invalid-email') {
        alert("The email address is not valid.");
      } else {
        alert(`Error signing in: ${authError.message}`);
      }
    } finally {
      setLoadingEmail(false);
      setAuthActionInProgress(false);
    }
  }, [auth, router, authActionInProgress]);

  useEffect(() => {
    const googleButton = document.getElementById('google-signin-button');
    if (googleButton) {
      googleButton.addEventListener('click', handleGoogleSignInRedirect);
    }

    return () => {
      if (googleButton) {
        googleButton.removeEventListener('click', handleGoogleSignInRedirect);
      }
    };
  }, [handleGoogleSignInRedirect]);

  return (
    <>
      <Head>
        <title>Narratum Login</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Georgia&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style jsx global>{`
        body {
            margin: 0;
            font-family: 'Lato', Arial, sans-serif;
            background: linear-gradient(to bottom, #D4E1EE, #F3E4D7, #F0D1B0);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
            box-sizing: border-box;
        }
        .login-page-container {
            text-align: center;
            max-width: 360px;
            width: 100%;
            background-color: transparent;
        }
        .login-page-container .logo { margin-bottom: 35px; }
        .login-page-container .book-icon {
            font-size: 48px; color: #C1905F; margin-bottom: 15px; display: inline-block;
            text-shadow: 0 0 10px rgba(193, 144, 95, 0.5);
            animation-name: glow; animation-duration: 3.5s; animation-timing-function: ease-in-out;
            animation-iteration-count: infinite; animation-direction: alternate;
        }
        @keyframes glow {
            0% { text-shadow: 0 0 20px rgba(228, 125, 23, 0.815); }
            50% { text-shadow: 0 0 35px rgba(223, 226, 35, 0.7); }
            100% { text-shadow: 0 0 20px rgba(235, 220, 16, 0.932); }
        }
        .login-page-container .logo h1 {
            font-family: 'Georgia', serif; font-size: 44px; color: #475B6D;
            margin: 0; letter-spacing: 1.5px; font-weight: 400;
        }
        .login-page-container .login-form { width: 100%; margin-bottom: 20px; }
        .login-page-container .input-fields-wrapper {
            background-color: #F9F6F2; border-radius: 12px; margin-bottom: 25px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); overflow: hidden;
        }
        .login-page-container .input-field {
            display: flex; align-items: center; padding: 16px 18px;
        }
        .login-page-container .input-field .icon {
            color: #8FA0AF; margin-right: 12px; font-size: 17px; width: 20px; text-align: center;
        }
        .login-page-container .input-field input {
            flex-grow: 1; border: none; outline: none; background-color: transparent;
            font-family: 'Lato', Arial, sans-serif; font-size: 16px; color: #444;
        }
        .login-page-container .input-field input::placeholder { color: #8FA0AF; font-weight: 400; }
        .login-page-container .separator { border: none; height: 1px; background-color: #EDE7DF; margin: 0; }
        .login-page-container .login-button, .login-page-container .social-login-button {
            width: 100%; padding: 15px; border: none; border-radius: 10px;
            font-family: 'Lato', Arial, sans-serif; font-size: 16px; font-weight: 700; cursor: pointer;
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
        }
        .login-page-container .login-button {
            background-color: #627C90; color: #FDFCFB; letter-spacing: 1.5px; text-transform: uppercase;
        }
        .login-page-container .login-button:hover { background-color: #536A7D; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
        .login-page-container .social-divider {
            display: flex; align-items: center; text-align: center; color: #707C88;
            font-size: 13px; margin: 20px 0;
        }
        .login-page-container .social-divider::before, .login-page-container .social-divider::after {
            content: ''; flex: 1; border-bottom: 1px solid #D5DCE2;
        }
        .login-page-container .social-divider:not(:empty)::before { margin-right: .5em; }
        .login-page-container .social-divider:not(:empty)::after { margin-left: .5em; }
        .login-page-container .social-login-button .social-icon { margin-right: 10px; font-size: 18px; }
        .login-page-container .google-button {
            background-color: #FFFFFF; color: #444444; border: 1px solid #DADCE0;
        }
        .login-page-container .google-button .loader { /* Simple loader for example */
            border: 2px solid #f3f3f3; border-top: 2px solid #DB4437; border-radius: 50%;
            width: 16px; height: 16px; animation: spin 1s linear infinite; margin-right: 8px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .login-page-container .google-button:hover { background-color: #F8F9FA; border-color: #C6CACC; }
        .login-page-container .google-button .social-icon { color: #DB4437; }
        .login-page-container .facebook-button { background-color: #1877F2; color: #FFFFFF; }
        .login-page-container .facebook-button:hover { background-color: #166FE5; }
        .login-page-container .facebook-button .social-icon { color: #FFFFFF; }
        .login-page-container .footer-links { font-size: 14px; line-height: 1.6; margin-top: 20px; }
        .login-page-container .footer-links p { margin: 0 0 8px 0; color: #475B6D; }
        .login-page-container .footer-links a { color: #475B6D; text-decoration: none; font-weight: 400; }
        .login-page-container .footer-links p a { text-decoration: underline; font-weight: 700; }
        .login-page-container .footer-links a:hover { text-decoration: underline; }
      `}</style>

      <div className="login-page-container">
        <div className="logo">
            <i className="fas fa-book-open book-icon"></i>
            <h1>NARRATUM</h1>
        </div>

        <form className="login-form" onSubmit={handleEmailLogin}>
            <div className="input-fields-wrapper">
                <div className="input-field">
                    <i className="fas fa-envelope icon"></i>
                    <input type="email" name="email" placeholder="Email" required />
                </div>
                <hr className="separator" />
                <div className="input-field">
                    <i className="fas fa-lock icon"></i>
                    <input type="password" name="password" placeholder="Password" required />
                </div>
            </div>
            <button type="submit" className="login-button" disabled={loadingEmail || authActionInProgress}>
              {loadingEmail ? 'Logging in...' : 'LOG IN'}
            </button>
        </form>

        <div className="social-divider">OR</div>

        <button
            type="button"
            className="social-login-button google-button"
            id="google-signin-button"
            disabled={loadingGoogle || authActionInProgress}
        >
            {(loadingGoogle && !auth.currentUser) ? <span className="loader"></span> : <i className="fab fa-google social-icon"></i>}
            {(loadingGoogle && !auth.currentUser) ? 'Processing...' : 'Log in with Google'}
        </button>
        <button type="button" className="social-login-button facebook-button" id="facebook-signin-button">
            <i className="fab fa-facebook-f social-icon"></i>
            Log in with Facebook
        </button>

        <div className="footer-links">
            <p>New to Narratum? <a href="/signup">Sign up</a></p>
            <a href="/forgot-password">Forgot password?</a>
        </div>
      </div>
    </>
  );
}
