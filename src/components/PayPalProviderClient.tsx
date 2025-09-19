// src/components/PayPalProviderClient.tsx
'use client';

import { PayPalScriptProvider, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

type Props = {
  children: React.ReactNode;
  options?: ReactPayPalScriptOptions;
};

export default function PayPalProviderClient({ children, options }: Props) {
  const defaultOptions: ReactPayPalScriptOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? 'test',
    currency: 'USD',
    intent: 'capture',
  };

  return (
    <PayPalScriptProvider options={options ?? defaultOptions}>
      {children}
    </PayPalScriptProvider>
  );
}
