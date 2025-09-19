'use client';

import React, { FC, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import PayPalProviderClient from '@/components/PayPalProviderClient';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePayPalScriptReducer, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then(m => m.PayPalButtons),
  { ssr: false }
);

interface OneTimeCreditPackage { id: string; name: string; credits: number; price: number; }
interface SubscriptionTier { id: string; name: string; credits: number; price: number; }
interface CreditOfferings {
  oneTime: OneTimeCreditPackage[];
  weekly: SubscriptionTier[];
  monthly: SubscriptionTier[];
}

const allCreditOfferings: CreditOfferings = {
  oneTime: [
    { id: 'ot_tester', name: 'Tester', credits: 25, price: 5.00 },
    { id: 'ot_reader', name: 'Reader', credits: 75, price: 15.00 },
    { id: 'ot_writer', name: 'Writer', credits: 125, price: 25.00 },
    { id: 'ot_creator', name: 'Creator', credits: 250, price: 50.00 },
  ],
  weekly: [
    { id: 'sub_wk_og_free', name: 'OG Free', credits: 5, price: 0.00 },
    { id: 'sub_wk_tester', name: 'Tester', credits: 10, price: 1.99 },
    { id: 'sub_wk_reader', name: 'Reader', credits: 25, price: 3.99 },
    { id: 'sub_wk_writer', name: 'Writer', credits: 50, price: 7.99 },
    { id: 'sub_wk_creator', name: 'Creator', credits: 100, price: 14.99 },
  ],
  monthly: [
    { id: 'sub_mo_og_free', name: 'OG Free', credits: 10, price: 0.00 },
    { id: 'sub_mo_tester', name: 'Tester', credits: 25, price: 3.99 },
    { id: 'sub_mo_reader', name: 'Reader', credits: 50, price: 7.99 },
    { id: 'sub_mo_writer', name: 'Writer', credits: 100, price: 14.99 },
    { id: 'sub_mo_creator', name: 'Creator', credits: 250, price: 36.99 },
  ],
};

type PurchaseType = 'one-time' | 'subscription';
type SubscriptionFrequency = 'weekly' | 'monthly';

function PayButtons({
  price,
  description,
  onSuccess,
  onMessage,
}: {
  price: number;
  description: string;
  onSuccess: (order: any) => void;
  onMessage: (status: 'idle' | 'success' | 'error' | 'pending', msg: string) => void;
}) {
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();

  if (isPending) return <div className="p-2">Loading PayPal…</div>;
  if (isRejected) return <div className="p-2 rounded border text-sm">PayPal SDK blocked/failed.</div>;
  if (!isResolved || typeof window === 'undefined' || !(window as any).paypal) {
    return <div className="p-2 rounded border text-sm">Payment module unavailable.</div>;
  }

  return (
    <PayPalButtons
      style={{ layout: 'vertical' }}
      createOrder={(_d, actions) =>
        actions.order.create({
          intent: 'CAPTURE', // ← add intent
          purchase_units: [
            { amount: { value: price.toFixed(2), currency_code: 'USD' }, description },
          ],
        })
      }
      onApprove={async (_d, actions) => {
        onMessage('pending', 'Processing payment…');
        const order = await actions.order!.capture();
        onSuccess(order);
      }}
      onCancel={() => onMessage('idle', 'Payment cancelled.')}
      onError={(err) => {
        console.error(err);
        onMessage('error', 'PayPal error. Try again.');
      }}
    />
  );
}

const SubscriptionPage: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('one-time');
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<SubscriptionFrequency>('monthly');
  const [selectedOffering, setSelectedOffering] = useState<OneTimeCreditPackage | SubscriptionTier | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState('');

  const currentOfferings = useMemo(() => {
    if (purchaseType === 'one-time') return allCreditOfferings.oneTime;
    return subscriptionFrequency === 'weekly' ? allCreditOfferings.weekly : allCreditOfferings.monthly;
  }, [purchaseType, subscriptionFrequency]);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const unusable = !clientId || clientId.trim().toLowerCase() === 'test';
  const options: ReactPayPalScriptOptions = useMemo(() => ({
    clientId: clientId!,
    currency: 'USD',
    intent: 'capture',
    components: 'buttons',
  }), [clientId]);

  async function onApprovePayPal(order: any) {
    if (!user?.uid || !selectedOffering) {
      setMessage('You must be logged in and have a selection.');
      setPaymentStatus('error');
      return;
    }
    try {
      if (order?.status === 'COMPLETED') {
        if (purchaseType === 'one-time') {
          const processPayment = httpsCallable(functions, 'processPayPalPayment');
          await processPayment({
            orderId: order.id,
            userId: user.uid,
            amount: selectedOffering.credits,
            pricePaid: (selectedOffering as any).price,
            packageId: selectedOffering.id,
            type: 'one-time-purchase',
          });
          setPaymentStatus('success');
          setMessage(`Successfully purchased ${selectedOffering.credits} credits!`);
        } else {
          const processSubscription = httpsCallable(functions, 'processPayPalSubscription');
          await processSubscription({
            userId: user.uid,
            planId: selectedOffering.id,
            frequency: subscriptionFrequency,
            price: (selectedOffering as any).price,
            credits: selectedOffering.credits,
          });
          setPaymentStatus('success');
          setMessage(`Subscription to ${selectedOffering.name} (${subscriptionFrequency}) activated!`);
        }
      } else {
        setPaymentStatus('error');
        setMessage('PayPal payment not completed.');
      }
    } catch (e: any) {
      console.error(e);
      setPaymentStatus('error');
      setMessage(e.message || 'Unexpected error.');
    }
  }

  function setMsg(status: 'idle' | 'success' | 'error' | 'pending', msg: string) {
    setPaymentStatus(status);
    setMessage(msg);
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading user data…</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
        <p className="text-lg">Please log in to manage subscriptions or buy credits.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-8">Credits & Subscriptions</h1>

      {/* Toggle: one-time vs subscriptions */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => { setPurchaseType('one-time'); setSelectedOffering(null); setMsg('idle', ''); }}
          className={`px-6 py-3 rounded-lg font-semibold ${purchaseType === 'one-time' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          One-time Purchase
        </button>
        <button
          onClick={() => { setPurchaseType('subscription'); setSelectedOffering(null); setMsg('idle', ''); }}
          className={`px-6 py-3 rounded-lg font-semibold ${purchaseType === 'subscription' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          Subscriptions
        </button>
      </div>

      {purchaseType === 'subscription' && (
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => { setSubscriptionFrequency('weekly'); setSelectedOffering(null); setMsg('idle', ''); }}
            className={`px-6 py-3 rounded-lg font-semibold ${subscriptionFrequency === 'weekly' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Weekly
          </button>
          <button
            onClick={() => { setSubscriptionFrequency('monthly'); setSelectedOffering(null); setMsg('idle', ''); }}
            className={`px-6 py-3 rounded-lg font-semibold ${subscriptionFrequency === 'monthly' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Monthly
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12 w-full max-w-6xl">
        {currentOfferings.map(offering => (
          <div
            key={offering.id}
            className={`bg-gray-800 p-6 rounded-lg shadow-lg text-center cursor-pointer transition-all duration-200 ${selectedOffering?.id === offering.id ? 'border-4 border-teal-400' : 'border border-gray-700 hover:border-gray-500'}`}
            onClick={() => { setSelectedOffering(offering); setMsg('idle', ''); }}
          >
            <h2 className="text-2xl font-semibold mb-2">{offering.name}</h2>
            <p className="text-lg text-gray-300 mb-4">{offering.credits} Credits</p>
            <p className="text-3xl font-bold text-green-400">
              {(offering as any).price === 0 ? 'FREE' : `$${(offering as any).price.toFixed(2)}`}
            </p>
            {purchaseType === 'subscription' && (offering as any).price > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                per {subscriptionFrequency === 'weekly' ? 'week' : 'month'}
              </p>
            )}
            {purchaseType === 'subscription' && (offering as any).price === 0 && (
              <p className="text-sm text-gray-400 mt-1">
                {subscriptionFrequency === 'weekly' ? 'weekly' : 'monthly'} grant
              </p>
            )}
          </div>
        ))}
      </div>

      {selectedOffering && (
        <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Confirm Selection:</h2>
          <p className="text-lg mb-4">
            You selected: <span className="font-bold text-teal-400">{selectedOffering.name} ({selectedOffering.credits} Credits)</span> for{' '}
            <span className="font-bold text-green-400">
              {(selectedOffering as any).price === 0 ? 'FREE' : `$${(selectedOffering as any).price.toFixed(2)}`}
            </span>
            {purchaseType === 'subscription' && (selectedOffering as any).price > 0 && ` ${subscriptionFrequency === 'weekly' ? 'per week' : 'per month'}`}
          </p>

          {message && <p className={`mb-4 ${paymentStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>{message}</p>}

          {(selectedOffering as any).price > 0 ? (
            unusable ? (
              <div className="p-4 rounded border text-sm">
                <strong>Missing PayPal client ID.</strong> Set <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>.
              </div>
            ) : (
              <PayPalProviderClient enabled options={options}>
                <PayButtons
                  price={(selectedOffering as any).price}
                  description={`Narratum ${purchaseType === 'one-time' ? 'Credits' : 'Subscription'} - ${selectedOffering.name}`}
                  onSuccess={onApprovePayPal}
                  onMessage={setMsg}
                />
              </PayPalProviderClient>
            )
          ) : (
            <button
              onClick={() => onApprovePayPal({ status: 'COMPLETED', id: 'FREE_PLAN' })}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition"
              disabled={paymentStatus === 'pending'}
            >
              Activate Free Plan
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
