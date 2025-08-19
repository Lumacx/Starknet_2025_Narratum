// src/components/GSIButton.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  onCredentialResponse: (response: google.accounts.id.CredentialResponse) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  size?: 'large' | 'medium' | 'small';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
};

declare global {
  interface Window { __GSI_INITIALIZED__?: boolean;  }
}

export default function GSIButton({
  onCredentialResponse,
  text = 'signin_with',
  shape = 'rectangular',
  size = 'large',
  theme = 'outline',
}: Props) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // ~3s con 100ms
    const iv = setInterval(() => {
      attempts++;

      // 1) Script listo
      const g = (window as any).google?.accounts?.id;
      if (!g) {
        if (attempts >= MAX_ATTEMPTS) {
          console.error('[❌ GSI Error] google.accounts.id no disponible (script no cargó)');
          clearInterval(iv);
        }
        return;
      }

      // 2) Contenedor presente y visible
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      if (!visible) {
        if (attempts >= MAX_ATTEMPTS) {
          console.error('[❌ GSI Error] Contenedor invisible o con tamaño 0x0');
          clearInterval(iv);
        }
        return;
      }

      // 3) Client ID
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('[❌ GSI Error] Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID en .env.local');
        clearInterval(iv);
        return;
      }

      try {
        // Inicializa una sola vez por app
        if (!window.__GSI_INITIALIZED__) {
          g.initialize({
            client_id: clientId,
            callback: onCredentialResponse,
            ux_mode: 'popup',
            auto_select: false,
            itp_support: true,
          });
          window.__GSI_INITIALIZED__ = true;
        }

        if (!rendered) {
          g.renderButton(el, {
            type: 'standard',
            theme,
            size,
            text,
            shape,
            // ancho mínimo sugerido para evitar 0x0
            width: rect.width < 240 ? 240 : undefined,
            logo_alignment: 'left',
          });

          setRendered(true);
        }

        clearInterval(iv);
      } catch (e) {
        console.error(`[❌ GSI Error] Falló render intento ${attempts}:`, e);
        if (attempts >= MAX_ATTEMPTS) {
          console.error('[❌ GSI Error] Failed to render Google button after multiple attempts.');
          clearInterval(iv);
        }
      }
    }, 100);

    return () => clearInterval(iv);
  }, [onCredentialResponse, rendered]);

  return (
    <div
      ref={btnRef}
      style={{
        minWidth: 240,
        minHeight: 40,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
}
