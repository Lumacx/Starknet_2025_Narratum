'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import PayPalProviderClient from '@/components/PayPalProviderClient';
import { usePayPalScriptReducer, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then(m => m.PayPalButtons),
  { ssr: false }
);

function ButtonsArea() {
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();

  if (isPending) return <div className="p-4">Loading PayPal…</div>;
  if (isRejected) return <div className="p-4 rounded border text-sm">PayPal SDK failed to load.</div>;
  if (!isResolved || typeof window === 'undefined' || !(window as any).paypal) {
    return <div className="p-4 rounded border text-sm">Payment module unavailable.</div>;
  }

  return (
    <PayPalButtons
      style={{ layout: 'vertical' }}
      createOrder={(_data, actions) =>
        actions.order.create({
          intent: 'CAPTURE', // ← add intent
          purchase_units: [
            {
              amount: { value: '5.00', currency_code: 'USD' },
              description: 'Narratum test checkout',
            },
          ],
        })
      }
      onApprove={(_data, actions) => actions.order!.capture().then((details) => {
        console.log('Order captured:', details);
        alert('Payment complete! 🎉');
      })}
      onError={(err) => console.error('PayPalButtons error', err)}
    />
  );
}

export default function CheckoutPage() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const unusable = !clientId || clientId.trim().toLowerCase() === 'test';

  const options: ReactPayPalScriptOptions = useMemo(() => ({
    clientId: clientId!,
    currency: 'USD',
    intent: 'capture',
    components: 'buttons',
  }), [clientId]);

  return (
    <main className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Checkout</h1>

      {unusable ? (
        <div className="p-4 rounded border text-sm">
          <strong>Missing PayPal client ID.</strong> Set <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>.
        </div>
      ) : (
        <PayPalProviderClient enabled options={options}>
          <ButtonsArea />
        </PayPalProviderClient>
      )}
    </main>
  );
}
