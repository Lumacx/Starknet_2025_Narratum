'use client';

import React, { FC, useState, useMemo } from 'react';
import Link from 'next/link';
import { PayPalButtons } from '@paypal/react-paypal-js'; // Assuming PayPal integration here as well
import { useAuth } from '@/context/AuthContext'; // Assuming useAuth provides user data and possibly PayPal client ID
import { httpsCallable } from 'firebase/functions'; // For calling Cloud Functions
import { functions } from '@/lib/firebase'; // Assuming firebase functions instance

interface OneTimeCreditPackage {
  id: string;
  name: string; // e.g., "Tester", "Reader"
  credits: number;
  price: number;
}

interface SubscriptionTier {
  id: string;
  name: string; // e.g., "OG Free", "Tester", "Reader"
  credits: number;
  price: number;
}

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

const SubscriptionPage: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('one-time');
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<SubscriptionFrequency>('monthly');
  const [selectedOffering, setSelectedOffering] = useState<OneTimeCreditPackage | SubscriptionTier | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState<string>('');

  // Placeholder for PayPal client ID if needed directly here.
  // In a real app, this would likely come from an API route or context.
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID; 

  const currentOfferings = useMemo(() => {
    if (purchaseType === 'one-time') {
      return allCreditOfferings.oneTime;
    } else if (subscriptionFrequency === 'weekly') {
      return allCreditOfferings.weekly;
    } else {
      return allCreditOfferings.monthly;
    }
  }, [purchaseType, subscriptionFrequency]);

  const createPayPalOrder = async (data: Record<string, unknown>, actions: any) => {
    if (!selectedOffering) {
      setMessage('Please select an offering.');
      throw new Error('No offering selected.');
    }

    // This would ideally call a backend endpoint to create the order securely.
    // For now, client-side creation for demonstration.
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: selectedOffering.price.toFixed(2),
            currency_code: 'USD',
          },
          description: `Narratum ${purchaseType === 'one-time' ? 'Credits Package' : 'Subscription'} - ${selectedOffering.name} (${selectedOffering.credits} Credits)`,
        },
      ],
      intent: 'CAPTURE', // For one-time purchases
      // For subscriptions, you'd use actions.subscription.create and a different flow
    });
  };

  const onApprovePayPal = async (data: Record<string, unknown>, actions: any) => {
    if (!user?.uid) {
      setMessage('You must be logged in to complete this purchase.');
      setPaymentStatus('error');
      return;
    }
    if (!selectedOffering) {
      setMessage('No offering selected for approval.');
      setPaymentStatus('error');
      return;
    }

    setPaymentStatus('pending');
    setMessage('Processing your payment...');

    try {
      if (purchaseType === 'one-time') {
        const order = await actions.order.capture();
        if (order.status === 'COMPLETED') {
          const processPayment = httpsCallable(functions, 'processPayPalPayment');
          await processPayment({
            orderId: order.id,
            userId: user.uid,
            amount: selectedOffering.credits,
            pricePaid: selectedOffering.price,
            packageId: selectedOffering.id,
            type: 'one-time-purchase',
          });
          setPaymentStatus('success');
          setMessage(`Successfully purchased ${selectedOffering.credits} credits!`);
        } else {
          setPaymentStatus('error');
          setMessage('PayPal payment not completed.');
        }
      } else {
        // This is a simplified example for subscriptions.
        // A real subscription flow would involve `actions.subscription.create`
        // and then verifying the subscription status on your backend.
        // For now, we'll simulate success for non-zero price subscriptions.
        if (selectedOffering.price === 0) {
            setMessage(`You activated the free ${selectedOffering.name} plan!`);
            setPaymentStatus('success');
            // Call a Cloud Function to activate free plan or grant credits
            // For example:
            // const activateFreePlan = httpsCallable(functions, 'activateFreeSubscription');
            // await activateFreePlan({ userId: user.uid, planId: selectedOffering.id, frequency: subscriptionFrequency });
        } else {
            // Simulate PayPal subscription creation success.
            // In a real app, this would involve a PayPal subscription ID and verification.
            console.log('Simulating subscription approval for:', selectedOffering.name);
            const processSubscription = httpsCallable(functions, 'processPayPalSubscription');
            await processSubscription({
                userId: user.uid,
                planId: selectedOffering.id,
                frequency: subscriptionFrequency,
                price: selectedOffering.price,
                credits: selectedOffering.credits,
                // Add any PayPal subscription ID from actions.subscription.create if applicable
            });
            setPaymentStatus('success');
            setMessage(`Subscription to ${selectedOffering.name} (${subscriptionFrequency}) activated!`);
        }
      }
    } catch (error: any) {
      console.error('Error during PayPal approval/subscription:', error);
      setPaymentStatus('error');
      setMessage(`Payment/Subscription failed: ${error.message || 'An unexpected error occurred.'}`);
    }
  };

  const onErrorPayPal = (err: Record<string, unknown>) => {
    console.error('PayPal onError:', err);
    setPaymentStatus('error');
    setMessage('PayPal payment encountered an error. Please try again.');
  };

  const onCancelPayPal = (data: Record<string, unknown>) => {
    console.log('PayPal payment cancelled:', data);
    setPaymentStatus('idle');
    setMessage('Payment cancelled.');
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading user data...</div>;
  }

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

      {/* Toggle between One-time Purchase and Subscriptions */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => {
            setPurchaseType('one-time');
            setSelectedOffering(null);
            setMessage('');
            setPaymentStatus('idle');
          }}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200
            ${purchaseType === 'one-time' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          One-time Purchase
        </button>
        <button
          onClick={() => {
            setPurchaseType('subscription');
            setSelectedOffering(null);
            setMessage('');
            setPaymentStatus('idle');
          }}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200
            ${purchaseType === 'subscription' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          Subscriptions
        </button>
      </div>

      {purchaseType === 'subscription' && (
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => {
              setSubscriptionFrequency('weekly');
              setSelectedOffering(null);
              setMessage('');
              setPaymentStatus('idle');
            }}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200
              ${subscriptionFrequency === 'weekly' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Weekly
          </button>
          <button
            onClick={() => {
              setSubscriptionFrequency('monthly');
              setSelectedOffering(null);
              setMessage('');
              setPaymentStatus('idle');
            }}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200
              ${subscriptionFrequency === 'monthly' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Monthly
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12 w-full max-w-6xl">
        {currentOfferings.map((offering) => (
          <div
            key={offering.id}
            className={`bg-gray-800 p-6 rounded-lg shadow-lg cursor-pointer transition-all duration-200 text-center
              ${selectedOffering?.id === offering.id ? 'border-4 border-teal-400' : 'border border-gray-700 hover:border-gray-500'}`}
            onClick={() => {
              setSelectedOffering(offering);
              setPaymentStatus('idle');
              setMessage('');
            }}
          >
            <h2 className="text-2xl font-semibold mb-2">{offering.name}</h2>
            <p className="text-lg text-gray-300 mb-4">{offering.credits} Credits</p>
            <p className="text-3xl font-bold text-green-400">
              {offering.price === 0 ? 'FREE' : `$${offering.price.toFixed(2)}`}
            </p>
            {purchaseType === 'subscription' && offering.price > 0 && (
                <p className="text-sm text-gray-400 mt-1">{`per ${subscriptionFrequency === 'weekly' ? 'week' : 'month'}`}</p>
            )}
            {purchaseType === 'subscription' && offering.price === 0 && (
                <p className="text-sm text-gray-400 mt-1">{`${subscriptionFrequency === 'weekly' ? 'weekly' : 'monthly'} grant`}</p>
            )}
          </div>
        ))}
      </div>

      {selectedOffering && (
        <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Confirm Selection:</h2>
          <p className="text-lg mb-4">
            You selected: 
            <span className="font-bold text-teal-400">
              {selectedOffering.name} ({selectedOffering.credits} Credits)
            </span>
            for 
            <span className="font-bold text-green-400">
              {selectedOffering.price === 0 ? 'FREE' : `$${selectedOffering.price.toFixed(2)}`}
            </span>
            {purchaseType === 'subscription' && selectedOffering.price > 0 && ` ${subscriptionFrequency === 'weekly' ? 'per week' : 'per month'}`}
          </p>

          {message && (
            <p className={`mb-4 ${paymentStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          {/* PayPal Buttons (Only show for paid offerings) */}
          {selectedOffering.price > 0 ? (
             <PayPalButtons
                style={{ layout: 'vertical' }}
                createOrder={createPayPalOrder}
                onApprove={onApprovePayPal}
                onError={onErrorPayPal}
                onCancel={onCancelPayPal}
              />
          ) : (
            <button
              onClick={() => onApprovePayPal({}, {} as any)} // Simulate approval for free tier
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
