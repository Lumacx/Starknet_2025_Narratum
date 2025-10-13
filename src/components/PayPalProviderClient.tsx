// src/components/PayPalProviderClient.tsx
'use client';

import React from 'react';
import { PayPalScriptProvider, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import { useLocale } from '@/context/LocaleContext';

type Props = {
  children: React.ReactNode;
  /** If false, the provider will render children without loading the SDK. */
  enabled?: boolean;
  /** Extra SDK options (merged with defaults). */
  options?: ReactPayPalScriptOptions;
};

/**
 * Safe PayPal provider:
 * - Does NOT use "test" fallback.
 * - If clientId is missing/invalid or enabled=false, renders children without injecting the SDK.
 * - Avoid putting this in your global layout; wrap only pages/components that actually show PayPal.
 */
export default function PayPalProviderClient({ children, enabled = true, options }: Props) {
  const { t } = useLocale();
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  const unusableClientId =
    !clientId || clientId.trim().length === 0 || clientId.trim().toLowerCase() === 'test';

  if (!enabled || unusableClientId) {
    if (typeof window !== 'undefined') {
      if (!enabled) console.warn(t('paypal.providerDisabled'));
      if (unusableClientId) console.warn(t('paypal.invalidClientId'));
    }
    return <>{children}</>;
  }

  // ✅ Doble clave para satisfacer tipos (clientId) y runtime ('client-id')
  const defaultOptions: ReactPayPalScriptOptions = {
    clientId,                // <- satisface tipos antiguos
    'client-id': clientId!,  // <- lo que usa realmente el SDK en el script
    currency: 'USD',
    components: 'buttons',
    // Aquí NO seteamos intent; cada página lo define (subscription vs one-time)
  };

  const merged: ReactPayPalScriptOptions = { ...defaultOptions, ...(options ?? {}) };

  const providerProps: any = {
    options: merged,
    onScriptLoadError: (err: unknown) => {
      console.error(t('paypal.sdkFailedToLoad'), err);
    },
  };

  if (typeof window !== 'undefined') {
    console.log('[paypal] client-id (kebab):', (merged['client-id'] as string)?.slice(0, 10) + '…');
    console.log('[paypal] intent:', (merged as any).intent, 'components:', merged.components);
  }

  return <PayPalScriptProvider {...providerProps}>{children}</PayPalScriptProvider>;
}