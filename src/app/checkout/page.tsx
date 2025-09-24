'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import PayPalProviderClient from '@/components/PayPalProviderClient';
import { usePayPalScriptReducer, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import { useLocale } from '@/context/LocaleContext';

const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then(m => m.PayPalButtons),
  { ssr: false }
);

function ButtonsArea() {
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();
  const { t } = useLocale();

  if (isPending) return <div className="p-4">{t('paypalLoading')}</div>;
  if (isRejected) return <div className="p-4 rounded border text-sm">{t('paypalSdkFailed')}</div>;
  if (!isResolved || typeof window === 'undefined' || !(window as any).paypal) {
    return <div className="p-4 rounded border text-sm">{t('paymentModuleUnavailable')}</div>;
  }

  return (
    <PayPalButtons
      style={{ layout: 'vertical' }}
      createOrder={(_data, actions) =>
        actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: { value: '5.00', currency_code: 'USD' },
              description: t('paypalTestDescription'),
            },
          ],
        })
      }
      onApprove={(_data, actions) =>
        actions.order!.capture().then((details) => {
          console.log('Order captured:', details);
          alert(t('paymentComplete'));
        })
      }
      onError={(err) => console.error('PayPalButtons error', err)}
    />
  );
}

export default function CheckoutPage() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const unusable = !clientId || clientId.trim().toLowerCase() === 'test';
  const { t } = useLocale();

  const options: ReactPayPalScriptOptions = useMemo(() => ({
    clientId: clientId!,
    currency: 'USD',
    intent: 'capture',
    components: 'buttons',
  }), [clientId]);

  return (
    <main className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">{t('checkoutTitle')}</h1>

      {unusable ? (
        <div className="p-4 rounded border text-sm">
          <strong>{t('missingPaypalIdTitle')}</strong>{' '}
          <code>{t('setPaypalIdEnv')}</code>
        </div>
      ) : (
        <PayPalProviderClient enabled options={options}>
          <ButtonsArea />
        </PayPalProviderClient>
      )}
    </main>
  );
}
