'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { useAccount, useConnect } from '@starknet-react/core';
import { connect as connectStarknetkit } from 'starknetkit';
import { NARRATUM_CONTRACT_ADDRESS } from '@/constants';
import { Call, shortString } from 'starknet';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasAttemptedExecute, setHasAttemptedExecute] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const googleDivRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { user, loading, setStarknetLoginStatus, starknetAddress } = useAuth();
  const { address, account, status } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    if (!loading && (user || starknetAddress)) {
      router.push('/');
    }
  }, [user, starknetAddress, loading, router]);

  const generateNickname = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: 5 }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
  };

  const calls: Call[] = React.useMemo(() => {
    if (!address) return [];
    const nickname = generateNickname();
    const nicknameFelt = shortString.encodeShortString(nickname);
    return [
      {
        contractAddress: NARRATUM_CONTRACT_ADDRESS,
        entrypoint: 'save_wallet_data',
        calldata: [address, nicknameFelt],
      },
    ];
  }, [address]);

  const handleExecuteSaveWalletData = useCallback(async () => {
    if (!account || calls.length === 0 || isExecuting || hasAttemptedExecute) return;
    setIsExecuting(true);
    setHasAttemptedExecute(true);
    try {
      const tx = await account.execute(calls);
      await account.waitForTransaction(tx.transaction_hash);
      if (address) setStarknetLoginStatus(address);
      router.push('/');
    } catch (err: any) {
      console.error('[⚠️ Starknet TX Error]', err);
      setMessage(err.message || 'Transaction error.');
      setHasAttemptedExecute(false);
    } finally {
      setIsExecuting(false);
    }
  }, [account, address, calls, router, isExecuting, hasAttemptedExecute, setStarknetLoginStatus]);

  useEffect(() => {
    if (status === 'connected' && address && account && !isExecuting && !hasAttemptedExecute) {
      handleExecuteSaveWalletData();
    }
  }, [status, address, account, isExecuting, hasAttemptedExecute, handleExecuteSaveWalletData]);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setStarknetLoginStatus(null);
    } catch (error: any) {
      setMessage(`Login error: ${error.message}`);
    }
  };

  const handleConnectStarknetKit = async () => {
    setIsConnecting(true);
    setExecuteError(null);
    setHasAttemptedExecute(false);
    try {
      const connection = await connectStarknetkit({});
      if (connection?.connector) await connect({ connector: connection.connector });
    } catch (error: any) {
      setMessage(`Wallet connection error: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const setExecuteError = (msg: string | null) => setMessage(msg || '');

  // 🔵 Google Sign-In with GSI SDK
  useEffect(() => {
    const tryRenderGoogleButton = () => {
      if (window.google && googleDivRef.current) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: async (response: any) => {
            try {
              const credential = GoogleAuthProvider.credential(response.credential);
              const result = await signInWithCredential(auth, credential);
              const user = result.user;
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                provider: 'google',
                lastLogin: serverTimestamp(),
              }, { merge: true });
              setStarknetLoginStatus(null);
              router.push('/');
            } catch (error: any) {
              setMessage(`Google Sign-In error: ${error.message}`);
            }
          },
        });

        window.google.accounts.id.renderButton(googleDivRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });

        window.google.accounts.id.prompt();
      } else {
        setTimeout(tryRenderGoogleButton, 500);
      }
    };
    tryRenderGoogleButton();
  }, []);

  if (loading || isExecuting || isConnecting) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        async
        defer
        strategy="beforeInteractive"
      />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-[#475B6D] mb-4">NARRATUM</h1>
          <p className="text-gray-700 mb-6">Sign in with Google, Starknet or email.</p>

          {message && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-100 text-red-700">
              {message}
            </div>
          )}

          {/* 🔵 GSI Login Button */}
          <div ref={googleDivRef} className="w-full flex justify-center py-4 min-h-[60px]"></div>

          <div className="my-4 flex items-center text-gray-500 text-sm">
            <span className="flex-grow border-b border-gray-300"></span>
            <span className="mx-4">OR</span>
            <span className="flex-grow border-b border-gray-300"></span>
          </div>

          <button
            onClick={handleConnectStarknetKit}
            className="w-full py-3 px-6 bg-[#1877F2] text-white font-semibold rounded-full hover:bg-[#166FE5] transition"
            disabled={!!starknetAddress}
          >
            {starknetAddress ? 'Wallet Connected' : 'Login with Starknet'}
          </button>

          <form onSubmit={handleEmailLogin} className="mt-4 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-2 border rounded-lg text-gray-700"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2 border rounded-lg text-gray-700"
              required
            />
            <button
              type="submit"
              className="w-full py-3 bg-[#627C90] text-white rounded-full hover:bg-[#536A7D]"
            >
              Login with Email
            </button>
          </form>

          <div className="text-sm text-gray-600 mt-6">
            <p className="mb-2">New to Narratum? <Link href="/signup" className="text-blue-600 font-bold hover:underline">Sign up</Link></p>
            <button onClick={() => setMessage('Forgot password not implemented.')} className="text-blue-600 hover:underline">Forgot password?</button>
          </div>

          <Link href="/" className="mt-6 inline-block px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition">
            Back to Landing
          </Link>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
