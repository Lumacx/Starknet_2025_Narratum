'use client';

import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { useAccount, useConnect } from '@starknet-react/core';
import { connect as connectStarknetkit } from 'starknetkit';
import { NARRATUM_CONTRACT_ADDRESS } from '@/constants';
import { Call, shortString } from 'starknet';

import GSIButton from '@/components/GSIButton';

function parseGsiJwt(idToken: string): any | null {
  try {
    const base64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
  } catch { return null; }
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasAttemptedExecute, setHasAttemptedExecute] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const router = useRouter();
  const { user, loading, setStarknetLoginStatus, starknetAddress } = useAuth();
  const { t } = useLocale();
  const { address, account, status } = useAccount();
  const { connect } = useConnect();

  useEffect(() => {
    if (!loading && (user || starknetAddress)) router.push('/');
  }, [user, starknetAddress, loading, router]);

  const generateNickname = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: 5 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  };

  const calls: Call[] = React.useMemo(() => {
    if (!address) return [];
    const nickname = generateNickname();
    const nicknameFelt = shortString.encodeShortString(nickname);
    return [{ contractAddress: NARRATUM_CONTRACT_ADDRESS, entrypoint: 'save_wallet_data', calldata: [address, nicknameFelt] }];
  }, [address]);

  const handleExecuteSaveWalletData = useCallback(async () => {
    if (!account || calls.length === 0 || isExecuting || hasAttemptedExecute) return;
    setIsExecuting(true); setHasAttemptedExecute(true);
    try {
      const tx = await account.execute(calls);
      await account.waitForTransaction(tx.transaction_hash);
      if (address) setStarknetLoginStatus(address);
      router.push('/');
    } catch (err: any) {
      console.error('[⚠️ Starknet TX Error]', err);
      setMessage(err.message || t('transactionError')); // Assuming 'transactionError' key for generic transaction errors
      setHasAttemptedExecute(false);
    } finally {
      setIsExecuting(false);
    }
  }, [account, address, calls, router, isExecuting, hasAttemptedExecute, setStarknetLoginStatus, t]);

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
      setMessage(`${t('loginError')}${error.message}`);
    }
  };

  const handleConnectStarknetKit = async () => {
    setIsConnecting(true);
    setHasAttemptedExecute(false);
    try {
      const connection = await connectStarknetkit({});
      if (connection?.connector) await connect({ connector: connection.connector });
    } catch (error: any) {
      setMessage(`${t('walletConnectionError')}${error.message}`); // Assuming 'walletConnectionError' key
    } finally {
      setIsConnecting(false);
    }
  };

  // ✅ Google Sign-In (único handler)
  const handleCredentialResponse = async (response: google.accounts.id.CredentialResponse) => {
    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      const payload = response.credential ? parseGsiJwt(response.credential) : null;
      const picture = payload?.picture as string | undefined;
      const name = payload?.name as string | undefined;

      if ((!user.photoURL && picture) || (!user.displayName && name)) {
        await updateProfile(user, {
          photoURL: user.photoURL || picture,
          displayName: user.displayName || name,
        });
        await user.reload();
      }

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
      setMessage(`${t('googleSignInError')}${error.message}`); // Assuming 'googleSignInError' key
    }
  };

  if (loading || isExecuting || isConnecting) {
    return <div className="min-h-screen flex items-center justify-center"><p>{t('loading')}</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-[#475B6D] mb-4">{t('narratum')}</h1>
        <p className="text-gray-700 mb-6">{t('signInWithGoogleStarknetOrEmail')}</p>

        {message && <div className="mb-4 p-3 rounded-lg text-sm bg-red-100 text-red-700">{message}</div>}

        {/* Google Sign-In */}
        <div className="w-full flex justify-center py-4 min-h-[60px]">
          <GSIButton onCredentialResponse={handleCredentialResponse} />
        </div>

        <div className="my-4 flex items-center text-gray-500 text-sm">
          <span className="flex-grow border-b border-gray-300" />
          <span className="mx-4">{t('or')}</span>
          <span className="flex-grow border-b border-gray-300" />
        </div>

        <button
          onClick={handleConnectStarknetKit}
          className="w-full py-3 px-6 bg-[#1877F2] text-white font-semibold rounded-full hover:bg-[#166FE5] transition"
          disabled={!!starknetAddress}
        >
          {starknetAddress ? t('walletConnected') : t('loginWithStarknet')}
        </button>

        <form onSubmit={handleEmailLogin} className="mt-4 space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} className="w-full px-4 py-2 border rounded-lg text-gray-700" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('passwordPlaceholder')} className="w-full px-4 py-2 border rounded-lg text-gray-700" required />
          <button type="submit" className="w-full py-3 bg-[#627C90] text-white rounded-full hover:bg-[#536A7D]">{t('loginWithEmail')}</button>
        </form>

        <div className="text-sm text-gray-600 mt-6">
          <p className="mb-2">{t('newToNarratum')}<Link href="/signup" className="text-blue-600 font-bold hover:underline">{t('signUp')}</Link></p>
          <button onClick={() => {}} className="text-blue-600 hover:underline">{t('forgotPassword')}</button>
        </div>

        <Link href="/" className="mt-6 inline-block px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition">
          {t('backToLanding')}
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
