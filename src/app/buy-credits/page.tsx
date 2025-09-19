'use client';

import React, { FC, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import PayPalProviderClient from '@/components/PayPalProviderClient';
import { usePayPalScriptReducer, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then(m => m.PayPalButtons),
  { ssr: false }
);

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

const creditPackages: CreditPackage[] = [
  { id: 'package_1', name: '100 Credits', credits: 100, price: 9.99 },
  { id: 'package_2', name: '500 Credits', credits: 500, price: 44.99 },
  { id: 'package_3', name: '1000 Credits', credits: 1000, price: 79.99 },
];

function ButtonsArea({
  selectedPackage,
  onSuccess,
  onMessage,
}: {
  selectedPackage: CreditPackage;
  onSuccess: (order: any) => void;
  onMessage: (status: 'idle' | 'success' | 'error' | 'pending', msg: string) => void;
}) {
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();

  if (isPending) return <div className="text-center">Loading PayPal…</div>;
  if (isRejected) return <div className="p-4 rounded border text-sm">PayPal SDK blocked/failed.</div>;
  if (!isResolved || typeof window === 'undefined' || !(window as any).paypal) {
    return <div className="p-4 rounded border text-sm">Payment module unavailable.</div>;
  }

  return (
    <PayPalButtons
      style={{ layout: 'vertical' }}
      createOrder={(_data, actions) => {
        if (!selectedPackage) {
          onMessage('error', 'Please select a credit package.');
          throw new Error('No package selected.');
        }
        return actions.order.create({
          intent: 'CAPTURE', // ← keep intent here
          purchase_units: [
            {
              amount: { value: selectedPackage.price.toFixed(2), currency_code: 'USD' },
              description: `Narratum Credits - ${selectedPackage.name}`,
            },
          ],
        });
      }}
      onApprove={async (_data, actions) => {
        onMessage('pending', 'Processing your payment...');
        const order = await actions.order!.capture();
        onSuccess(order);
      }}
      onCancel={() => onMessage('idle', 'Payment cancelled.')}
      onError={(err) => {
        console.error('PayPal onError:', err);
        onMessage('error', 'PayPal payment encountered an error. Please try again.');
      }}
    />
  );
}

const BuyCreditsPage: FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState<string>('');

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeMessage, setPromoCodeMessage] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const unusable = !clientId || clientId.trim().toLowerCase() === 'test';

  const options: ReactPayPalScriptOptions = useMemo(() => ({
    clientId: clientId!,
    currency: 'USD',
    intent: 'capture',
    components: 'buttons',
  }), [clientId]);

  async function handleApproveSuccess(order: any) {
    try {
      if (!user) {
        setPaymentStatus('error');
        setMessage('You must be logged in to complete this purchase.');
        return;
      }
      if (order?.status === 'COMPLETED' && selectedPackage) {
        const processPayment = httpsCallable(functions, 'processPayPalPayment');
        await processPayment({
          orderId: order.id,
          userId: user.uid,
          amount: selectedPackage.credits,
        });
        setPaymentStatus('success');
        setMessage(`Successfully purchased ${selectedPackage.credits} credits!`);
      } else {
        setPaymentStatus('error');
        setMessage('Payment not completed by PayPal.');
      }
    } catch (error: any) {
      console.error('Error during approval handling:', error);
      setPaymentStatus('error');
      setMessage(`Payment failed: ${error.message || 'Unexpected error.'}`);
    }
  }

  function setMsg(status: 'idle' | 'success' | 'error' | 'pending', msg: string) {
    setPaymentStatus(status);
    setMessage(msg);
  }

  const handleRedeemPromoCode = async () => {
    if (!user) return setPromoCodeMessage('You must be logged in to redeem a promo code.');
    if (!promoCodeInput.trim()) return setPromoCodeMessage('Please enter a promo code.');

    setIsRedeeming(true);
    setPromoCodeMessage('Redeeming promo code...');
    try {
      const redeemCode = httpsCallable(functions, 'redeemPromoCode');
      const result = await redeemCode({ promoCode: promoCodeInput });
      const ok = (result.data as any)?.success;
      setPromoCodeMessage((result.data as any)?.message || (ok ? 'Promo code redeemed!' : 'Failed to redeem promo code.'));
      if (ok) setPromoCodeInput('');
    } catch (e: any) {
      console.error(e);
      setPromoCodeMessage(`Error: ${e.message || 'Unexpected error'}`);
    } finally {
      setIsRedeeming(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading user data…</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
        <p className="text-lg">Please log in to purchase or redeem credits.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-8">Buy Credits & Redeem Codes</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {creditPackages.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-gray-800 p-6 rounded-lg shadow-lg cursor-pointer transition-all duration-200
              ${selectedPackage?.id === pkg.id ? 'border-4 border-purple-500' : 'border border-gray-700 hover:border-gray-500'}`}
            onClick={() => { setSelectedPackage(pkg); setMsg('idle', ''); }}
          >
            <h2 className="text-2xl font-semibold mb-2">{pkg.name}</h2>
            <p className="text-lg text-gray-300 mb-4">{pkg.credits} Credits</p>
            <p className="text-3xl font-bold text-green-400">${pkg.price.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {selectedPackage && (
        <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Confirm Purchase:</h2>
          <p className="text-lg mb-4">
            You selected: <span className="font-bold text-purple-400">{selectedPackage.name}</span> for{' '}
            <span className="font-bold text-green-400">${selectedPackage.price.toFixed(2)}</span>
          </p>

          {message && (
            <p className={`mb-4 ${paymentStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>{message}</p>
          )}

          {unusable ? (
            <div className="p-4 rounded border text-sm">
              <strong>Missing PayPal client ID.</strong> Set <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>.
            </div>
          ) : (
            <PayPalProviderClient enabled options={options}>
              <ButtonsArea
                selectedPackage={selectedPackage}
                onSuccess={handleApproveSuccess}
                onMessage={setMsg}
              />
            </PayPalProviderClient>
          )}
        </div>
      )}

      {/* Promo Code Redemption */}
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Redeem Promo Code</h2>
        <div className="flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Enter promo code"
            className="p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-purple-500"
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value)}
            disabled={isRedeeming}
          />
          <button
            onClick={handleRedeemPromoCode}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isRedeeming}
          >
            {isRedeeming ? 'Redeeming…' : 'Redeem Code'}
          </button>
          {promoCodeMessage && (
            <p className={`text-sm ${promoCodeMessage.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
              {promoCodeMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyCreditsPage;
