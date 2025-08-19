// src/app/login/ConnectPage.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { constants } from 'starknet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faGithub, faDiscord } from '@fortawesome/free-brands-svg-icons';
import { useRouter } from 'next/navigation';
import GSIButton from '@/components/GSIButton';
import { signInWithCredential, GoogleAuthProvider, onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function parseGsiJwt(idToken: string): any | null {
  try {
    const base64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
  } catch { return null; }
}

function ConnectPage() {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected, chainId } = useAccount();
  const router = useRouter();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) { try { await user.reload(); } catch {} }
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

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

      router.refresh();
    } catch (error) {
      console.error('[❌ Firebase Login Error]:', error);
    }
  };

  const socialLinks = [
    { name: 'Twitter', url: 'https://twitter.com/Starknet', icon: faTwitter },
    { name: 'GitHub', url: 'https://github.com/starknet-io', icon: faGithub },
    { name: 'Discord', url: 'https://discord.gg/starknet', icon: faDiscord },
  ];

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
      <div className="w-full max-w-md mx-auto p-8 rounded-lg shadow-lg bg-gray-800">
        <h1 className="text-4xl font-bold text-center mb-8 text-starknet-blue">NARRATUM</h1>

        {/* Google Sign-In */}
        <div className="mb-6 flex justify-center">
          <GSIButton onCredentialResponse={handleCredentialResponse} />
        </div>

        {/* Firebase User Info */}
        {firebaseUser && (
          <div className="flex items-center space-x-4 justify-center mb-4">
            <img
              src={firebaseUser.photoURL ?? '/default-avatar.png'}
              alt="User Avatar"
              className="w-12 h-12 rounded-full border border-gray-500"
              referrerPolicy="no-referrer"
            />
            <p className="text-lg">{firebaseUser.displayName || firebaseUser.email}</p>
          </div>
        )}

        <div className="space-y-4">
          {isConnected && chainId === BigInt(constants.StarknetChainId.SN_SEPOLIA) ? (
            <div className="text-center">
              <p className="text-lg mb-4">You are connected with address: {address}</p>
              <button
                className="w-full bg-starknet-blue-dark text-white font-bold py-2 px-4 rounded-lg hover:bg-starknet-blue-light transition-colors"
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <>
              <p className="text-lg text-center">Connect your Starknet wallet to get started.</p>
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  className="w-full bg-starknet-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-starknet-blue-light transition-colors"
                  onClick={() => connect({ connector })}
                >
                  Connect {connector.name}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-700">
          <h2 className="text-xl font-semibold text-center mb-4">Follow us on social media</h2>
          <div className="flex justify-center space-x-4">
            {socialLinks.map((link) => (
              <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <FontAwesomeIcon icon={link.icon} size="2x" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConnectPage;

