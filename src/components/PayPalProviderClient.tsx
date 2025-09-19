// src/components/PayPalProviderClient.tsx
'use client';

import React from 'react';
import { PayPalScriptProvider, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

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
export default function PayPalProviderClient({
  children,
  enabled = true,
  options,
}: Props) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  // If no usable clientId or provider explicitly disabled, render without SDK.
  const unusableClientId =
    !clientId || clientId.trim().length === 0 || clientId.trim().toLowerCase() === 'test';

  if (!enabled || unusableClientId) {
    if (typeof window !== 'undefined' && !enabled) {
      // eslint-disable-next-line no-console
      console.warn('[PayPal] Provider disabled via prop; rendering without SDK.');
    }
    if (typeof window !== 'undefined' && unusableClientId) {
      // eslint-disable-next-line no-console
      console.warn(
        "[PayPal] Missing or invalid NEXT_PUBLIC_PAYPAL_CLIENT_ID. Skipping SDK injection to avoid page crash."
      );
    }
    return <>{children}</>;
  }

  const defaultOptions: ReactPayPalScriptOptions = {
    // Required
    clientId,
    // Common defaults
    currency: 'USD',
    intent: 'capture',
    // Tip: limit what the SDK loads to speed things up (uncomment if you only need buttons)
    // components: 'buttons',
    // Enable funding sources if you use them:
    // 'enable-funding': 'venmo,card',
  };

  const merged: ReactPayPalScriptOptions = { ...defaultOptions, ...(options ?? {}) };

  // NOTE: react-paypal-js v8 supports onScriptLoadError, but types may lag.
  // We pass it anyway and ignore TS so runtime users get a soft-fail instead of a crash.
  const providerProps: any = {
    options: merged,
    onScriptLoadError: (err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('[PayPal] SDK failed to load:', err);
      // Do not throw — keep the rest of the page usable.
    },
    // Optional: if you want to delay loading until a child (Buttons/Fields) mounts
    // deferLoading: true,
  };

  return <PayPalScriptProvider {...providerProps}>{children}</PayPalScriptProvider>;
}
