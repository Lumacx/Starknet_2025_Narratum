'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Asegúrate de exportar auth en firebase.ts

const GsiLogin: React.FC = () => {
  const googleDivRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const tryRenderGoogleButton = () => {
      if (window.google && googleDivRef.current) {
        console.log('[GSI] Inicializando Google Sign-In...');

        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: async (response: any) => {
            try {
              const credential = GoogleAuthProvider.credential(response.credential);
              const userCredential = await signInWithCredential(auth, credential);
              const user = userCredential.user;

              console.log('[Firebase] Usuario autenticado:', user);
              setMessage(`Bienvenido, ${user.displayName || user.email}`);

              // 🔄 Redirige al dashboard o donde desees
              router.push('/profile');
            } catch (error) {
              console.error('[Firebase Auth Error]:', error);
              setMessage('❌ Error de autenticación');
            }
          },
        });

        window.google.accounts.id.renderButton(googleDivRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
        });

        window.google.accounts.id.prompt();
      } else {
        console.log('[GSI] Google script no disponible aún. Reintentando...');
        setTimeout(tryRenderGoogleButton, 500);
      }
    };

    tryRenderGoogleButton();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* ✅ Script de Google */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="beforeInteractive"
        async
        defer
      />

      <h1 className="text-2xl font-bold mb-4">Inicia sesión con Google</h1>
      <div ref={googleDivRef} className="min-h-[60px] w-full flex justify-center" />
      {message && <p className="mt-4 text-green-600">{message}</p>}
    </div>
  );
};

export default GsiLogin;
