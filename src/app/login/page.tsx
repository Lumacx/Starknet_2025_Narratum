'use client';

import React, { useState, useCallback, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

import { useAccount, useConnect } from '@starknet-react/core';
import { NARRATUM_CONTRACT_ADDRESS } from '../../constants';
import { Call, shortString } from 'starknet';
import { connect as connectStarknetkit } from 'starknetkit';

const LoginPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { user, loading, setStarknetLoginStatus, starknetAddress } = useAuth(); // Destructure starknetAddress

  const { account, address, status } = useAccount(); // This 'address' is from useAccount (Starknet)
  const { connect, connectors: starknetReactConnectors } = useConnect();
  
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasAttemptedExecute, setHasAttemptedExecute] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!loading && (user || starknetAddress)) { 
      router.push('/');
    }
  }, [user, starknetAddress, loading, router]);

  const generateNickname = () => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  const calls: Call[] = React.useMemo(() => {
    if (!address) { // This uses the 'address' from useAccount (Starknet)
      console.log('[LoginPage] useMemo calls - No address, retornando [].');
      return [];
    }
    const nicknameString = generateNickname();
    const nicknameFelt = shortString.encodeShortString(nicknameString);
    
    console.log(`[LoginPage] useMemo calls - Dirección a guardar: ${address}, Nickname String: ${nicknameString}, Nickname Felt: ${nicknameFelt}`);
    return [
      {
        contractAddress: NARRATUM_CONTRACT_ADDRESS,
        entrypoint: 'save_wallet_data',
        calldata: [address, nicknameFelt],
      },
    ];
  }, [address]); // Depends on Starknet's address

  const handleExecuteSaveWalletData = useCallback(async () => {
    console.log('[LoginPage] handleExecuteSaveWalletData - Verificando condiciones. Account:', !!account, 'Calls length:', calls.length, 'isExecuting:', isExecuting, 'hasAttemptedExecute:', hasAttemptedExecute);
    if (!account || calls.length === 0 || isExecuting || hasAttemptedExecute) {
      if(hasAttemptedExecute) console.log('[LoginPage] handleExecuteSaveWalletData - Ya se intentó ejecutar, no se reintenta ahora.');
      return;
    }
    
    console.log("[LoginPage] handleExecuteSaveWalletData - Condiciones cumplidas, iniciando ejecución.");
    setIsExecuting(true);
    setHasAttemptedExecute(true); 
    setExecuteError(null);
    
    try {
      console.log("[LoginPage] handleExecuteSaveWalletData - Enviando account.execute con calls:", JSON.stringify(calls));
      const tx = await account.execute(calls);
      console.log("[LoginPage] handleExecuteSaveWalletData - Transacción enviada, esperando confirmación. Hash:", tx.transaction_hash);
      await account.waitForTransaction(tx.transaction_hash);
      console.log("[LoginPage] handleExecuteSaveWalletData - Transacción confirmada:", tx);

      if (address) { // This is Starknet's address from useAccount()
        setStarknetLoginStatus(address);
        console.log(`[LoginPage] AuthContext updated with Starknet address: ${address}`);
      } else {
        console.warn("[LoginPage] Starknet address not available to set in AuthContext after transaction.");
      }

      router.push('/');
    } catch (err: any) {
      console.error("[LoginPage] handleExecuteSaveWalletData - Error al enviar/confirmar transacción save_wallet_data. Full error object:", err);
      setExecuteError(err.message || "Error desconocido al ejecutar la transacción. Check console for full error object.");
      setHasAttemptedExecute(false);
    } finally {
      setIsExecuting(false);
      console.log('[LoginPage] handleExecuteSaveWalletData - Finalizado.');
    }
  }, [account, address, calls, router, isExecuting, hasAttemptedExecute, setStarknetLoginStatus]);

  useEffect(() => {
    console.log('[LoginPage] useEffect [status, address, account] - Status:', status, 'Address:', address, 'Account:', !!account, 'isExecuting:', isExecuting, 'hasAttemptedExecute:', hasAttemptedExecute);
    if (status === 'connected' && address && account && !isExecuting && !hasAttemptedExecute) {
      console.log('[LoginPage] useEffect [status, address, account] - Llamando a handleExecuteSaveWalletData');
      handleExecuteSaveWalletData();
    }
  }, [status, address, account, isExecuting, hasAttemptedExecute, handleExecuteSaveWalletData]);

  useEffect(() => {
    console.log('[LoginPage] useEffect [navigation] - Status:', status, 'Address:', address, 'isExecuting:', isExecuting, 'executeError:', executeError, 'hasAttemptedExecute:', hasAttemptedExecute);
    if (status === 'connected' && address && !isExecuting && !executeError && hasAttemptedExecute) {
      console.log('[LoginPage] useEffect [navigation] - Condiciones para navegar a / cumplidas. Navegando...');
      router.push('/');
    } else {
      console.log('[LoginPage] useEffect [navigation] - Condiciones para navegar a / NO cumplidas.');
    }
  }, [status, address, isExecuting, executeError, hasAttemptedExecute, router]);

  console.log('[LoginPage] Render - Status:', status, 'Address:', address, 'Account:', !!account, 'isExecuting:', isExecuting, 'hasAttemptedExecute:', hasAttemptedExecute, 'isConnecting:', isConnecting);
  console.log('[LoginPage] Render - Conectores disponibles desde useConnect:', starknetReactConnectors);

  const handleConnectStarknetKit = async () => {
    console.log('[LoginPage] handleConnectStarknetKit - Iniciando conexión StarknetKit');
    setIsConnecting(true);
    setExecuteError(null);
    setHasAttemptedExecute(false);
    try {
      const connection = await connectStarknetkit({});
      console.log('[LoginPage] handleConnectStarknetKit - connectStarknetkit respondió:', connection);
  
      if (connection && connection.connector) {
        console.log('[LoginPage] handleConnectStarknetKit - Connector instance from StarknetKit:', connection.connector);
  
        if (connection.wallet) {
            console.log('[LoginPage] handleConnectStarknetKit - Wallet object from StarknetKit:', connection.wallet);
            console.log('[LoginPage] handleConnectStarknetKit - Wallet ID:', connection.wallet.id);
            console.log('[LoginPage] handleConnectStarknetKit - Wallet Name:', connection.wallet.name);
            console.log('[LoginPage] handleConnectStarknetKit - Wallet Icon:', connection.wallet.icon);
            if ((connection.wallet as any).account) {
              console.log('[LoginPage] handleConnectStarknetKit - Wallet account object:', (connection.wallet as any).account);
              console.log('[LoginPage] handleConnectStarknetKit - Wallet account address:', (connection.wallet as any).account.address);
            } else if ((connection.wallet as any).selectedAddress) {
              console.log('[LoginPage] handleConnectStarknetKit - Wallet selectedAddress:', (connection.wallet as any).selectedAddress);
            } else {
              console.log('[LoginPage] handleConnectStarknetKit - connection.wallet.account and selectedAddress are not available.');
            }
        } else {
          console.log('[LoginPage] handleConnectStarknetKit - connection.wallet is not available.');
        }
  
        console.log("[LoginPage] handleConnectStarknetKit - Attempting to connect @starknet-react/core with StarknetKit's connector.");
        await connect({ connector: connection.connector });
        console.log('[LoginPage] handleConnectStarknetKit - Called @starknet-react/core connect. Check subsequent Render logs for useAccount updates.');
  
      } else {
         console.warn('[LoginPage] handleConnectStarknetKit - La respuesta de connectStarknetkit fue null o no contenía un connection.');
      }
    } catch (error: any) {
      console.error("[LoginPage] handleConnectStarknetKit - Error durante el proceso de conexión con StarknetKit:", error);
      setExecuteError("Error en conexión con StarknetKit: " + (error.message || "Unknown error"));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectBraavosDirectly = async () => {
    console.log('[LoginPage] handleConnectBraavosDirectly - Iniciando conexión directa con Braavos via @starknet-react/core');
    setIsConnecting(true);
    setExecuteError(null);
    setHasAttemptedExecute(false);

    const braavosConnector = starknetReactConnectors.find((c: any) => c.id.toLowerCase().includes('braavos'));
    console.log('[LoginPage] handleConnectBraavosDirectly - Conector Braavos encontrado:', braavosConnector);

    if (braavosConnector) {
      try {
        console.log('[LoginPage] handleConnectBraavosDirectly - Llamando a connect({ connector: braavosConnector }) de @starknet-react/core');
        await connect({ connector: braavosConnector });
        console.log('[LoginPage] handleConnectBraavosDirectly - Llamada a connect de @starknet-react/core completada. Observar useAccount.');
      } catch (error: any) {
        console.error("[LoginPage] handleConnectBraavosDirectly - Error al invocar connect de @starknet-react/core:", error);
        setExecuteError("Error al conectar directamente con Braavos: " + error.message);
      } finally {
        setIsConnecting(false);
      }
    } else {
      console.warn('[LoginPage] handleConnectBraavosDirectly - Conector Braavos no encontrado en useConnect. Lista de conectores:', starknetReactConnectors);
      setExecuteError("Conector Braavos no disponible para conexión directa.");
      setIsConnecting(false);
    }
  };
  
  if (status === 'connecting' || isExecuting || isConnecting) {
    return <p>Conectando y configurando cuenta...</p>;
  }

  if (loading || (!loading && (user || starknetAddress))) { 
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-xl font-semibold">Loading...</p>
        </div>
    );
  }
  
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
      } else {
        await setDoc(userDocRef, { lastLoginAt: new Date() }, { merge: true });
      }
      setStarknetLoginStatus(null);
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
      setStarknetLoginStatus(null);
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
        onClick={handleConnectStarknetKit}
        className="w-full py-3 px-6 bg-[#1877F2] text-white font-semibold rounded-full shadow-md hover:bg-[#166FE5] transition duration-300 flex items-center justify-center"
        disabled={isConnecting || status === 'connected' || !!starknetAddress} 
      >
        {starknetAddress ? 'Wallet Connected' : (status === 'connected' ? 'Processing...' : 'Web3 Starknet')}
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