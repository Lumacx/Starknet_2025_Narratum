// src/components/GSIButton.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/context/LocaleContext';

type Props = {
  onCredentialResponse: (response: google.accounts.id.CredentialResponse) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  size?: 'large' | 'medium' | 'small';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
};

declare global {
  interface Window { __GSI_INITIALIZED__?: boolean; }
}

export default function GSIButton({
  onCredentialResponse,
  text = 'signin_with',
  shape = 'rectangular',
  size = 'large',
  theme = 'outline',
}: Props) {
  const { t } = useLocale();
  const btnRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // ~3s with 100ms interval
    const iv = setInterval(() => {
      attempts++;

      // 1) Script ready?
      const g = (window as any).google?.accounts?.id;
      if (!g) {
        if (attempts >= MAX_ATTEMPTS) {
          console.error(t('gsi.error.scriptUnavailable'));
          clearInterval(iv);
        }
        return;
      }

      // 2) Container present & visible
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      if (!visible) {
        if (attempts >= MAX_ATTEMPTS) {
          console.error(t('gsi.error.invisibleContainer'));
          clearInterval(iv);
        }
        return;
      }

      // 3) Client ID
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error(t('gsi.error.missingClientId'));
        clearInterval(iv);
        return;
      }

      try {
        // Initialize once per app
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
            // minimum width to avoid 0x0
            width: rect.width < 240 ? 240 : undefined,
            logo_alignment: 'left',
          });

          setRendered(true);
        }

        clearInterval(iv);
      } catch (e) {
        console.error(t('gsi.error.renderAttemptFailed').replace('{attempt}', String(attempts)), e);
        if (attempts >= MAX_ATTEMPTS) {
          console.error(t('gsi.error.renderFailedAfterRetries'));
          clearInterval(iv);
        }
      }
    }, 100);

    return () => clearInterval(iv);
  }, [onCredentialResponse, rendered, t]);

  return (
    <div
      ref={btnRef}
      aria-label={t('gsi.aria.signIn')}
      title={t('gsi.aria.signIn')}
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
