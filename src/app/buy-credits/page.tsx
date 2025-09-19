'use client';

import React, { FC, useState } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

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

const BuyCreditsPage: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [{ isPending }] = usePayPalScriptReducer();
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState<string>('');

  // State for promo code functionality
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [promoCodeMessage, setPromoCodeMessage] = useState<string>('');
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);

  const createOrder = async (data: Record<string, unknown>, actions: any) => {
    if (!selectedPackage) {
      setMessage('Please select a credit package.');
      throw new Error('No package selected.');
    }

    // Call your backend to create a PayPal order
    // For now, we'll create a basic order client-side. In a real app, this would be a server call.
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: selectedPackage.price.toFixed(2),
            currency_code: 'USD',
          },
          description: `Narratum Credits - ${selectedPackage.name}`,
        },
      ],
      intent: 'CAPTURE',
    });
  };

  const onApprove = async (data: Record<string, unknown>, actions: any) => {
    if (!user) {
      setMessage('You must be logged in to complete this purchase.');
      setPaymentStatus('error');
      return;
    }

    setPaymentStatus('pending');
    setMessage('Processing your payment...');

    try {
      const order = await actions.order.capture();
      console.log('Order captured:', order);

      if (order.status === 'COMPLETED') {
        // Call your Cloud Function to update user credits
        const processPayment = httpsCallable(functions, 'processPayPalPayment');
        await processPayment({
          orderId: order.id,
          userId: user.uid,
          amount: selectedPackage?.credits, // Send credits amount to the backend
        });

        setPaymentStatus('success');
        setMessage(`Successfully purchased ${selectedPackage?.credits} credits!`);
      } else {
        setPaymentStatus('error');
        setMessage('Payment not completed by PayPal.');
      }
    } catch (error: any) {
      console.error('Error during PayPal approval:', error);
      setPaymentStatus('error');
      setMessage(`Payment failed: ${error.message || 'An unexpected error occurred.'}`);
    }
  };

  const onError = (err: Record<string, unknown>) => {
    console.error('PayPal onError:', err);
    setPaymentStatus('error');
    setMessage('PayPal payment encountered an error. Please try again.');
  };

  const onCancel = (data: Record<string, unknown>) => {
    console.log('PayPal payment cancelled:', data);
    setPaymentStatus('idle');
    setMessage('Payment cancelled.');
  };

  const handleRedeemPromoCode = async () => {
    if (!user) {
      setPromoCodeMessage('You must be logged in to redeem a promo code.');
      return;
    }
    if (!promoCodeInput.trim()) {
      setPromoCodeMessage('Please enter a promo code.');
      return;
    }

    setIsRedeeming(true);
    setPromoCodeMessage('Redeeming promo code...');

    try {
      const redeemCode = httpsCallable(functions, 'redeemPromoCode');
      const result = await redeemCode({ promoCode: promoCodeInput });

      if (result.data && (result.data as any).success) {
        setPromoCodeMessage((result.data as any).message || 'Promo code redeemed successfully!');
        setPromoCodeInput(''); // Clear input on success
        // Ideally, refresh user credits here if you have a mechanism for it
      } else {
        setPromoCodeMessage((result.data as any).message || 'Failed to redeem promo code.');
      }
    } catch (error: any) {
      console.error('Error redeeming promo code:', error);
      // Firebase HttpsError will have a .code and .message
      const errorMessage = error.message || 'An unexpected error occurred during redemption.';
      setPromoCodeMessage(`Error: ${errorMessage}`);
    } finally {
      setIsRedeeming(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading user data...</div>;
  }

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
            onClick={() => {
              setSelectedPackage(pkg);
              setPaymentStatus('idle');
              setMessage('');
            }}
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
          <p className="text-lg mb-4">You selected: <span className="font-bold text-purple-400">{selectedPackage.name}</span> for <span className="font-bold text-green-400">${selectedPackage.price.toFixed(2)}</span></p>

          {message && (
            <p className={`mb-4 ${paymentStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          {isPending ? (
            <div className="text-center">
              <p>Loading PayPal...</p>
            </div>
          ) : (
            <PayPalButtons
              style={{ layout: 'vertical' }}
              createOrder={createOrder}
              onApprove={onApprove}
              onError={onError}
              onCancel={onCancel}
            />
          )}
        </div>
      )}

      {/* Promo Code Redemption Section */}
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
            {isRedeeming ? 'Redeeming...' : 'Redeem Code'}
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
