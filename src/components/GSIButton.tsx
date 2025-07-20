// src/components/GSIButton.tsx
'use client';

import { useEffect, useRef } from 'react';

type Props = {
  onCredentialResponse: (response: google.accounts.id.CredentialResponse) => void;
};

export default function GSIButton({ onCredentialResponse }: Props) {
  const buttonDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderButton = () => {
      if (window.google && window.google.accounts && buttonDivRef.current) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: onCredentialResponse,
        });

        window.google.accounts.id.renderButton(buttonDivRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
        });

        window.google.accounts.id.prompt(); // Optional
      } else {
        setTimeout(renderButton, 300);
      }
    };

    renderButton();
  }, [onCredentialResponse]);

  return (
    <>
      <script src="https://accounts.google.com/gsi/client" async defer />
      <div ref={buttonDivRef} />
    </>
  );
}
