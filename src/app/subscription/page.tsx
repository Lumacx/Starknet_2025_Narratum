'use client';

import React, { FC, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import PayPalProviderClient from '@/components/PayPalProviderClient';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePayPalScriptReducer, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then((m) => m.PayPalButtons),
  { ssr: false }
);

type PurchaseType = 'one-time' | 'subscription';
type SubscriptionFrequency = 'weekly' | 'monthly';

interface BaseOffering {
  id: string;
  name: string;
  credits: number;
  price: number;
  tag?: string; // ribbon text (e.g., "Most Popular")
}
interface OneTimeCreditPackage extends BaseOffering {}
interface SubscriptionTier extends BaseOffering {}

/* ── Data ─────────────────────────────────────────────── */
const oneTimePackages: OneTimeCreditPackage[] = [
  { id: 'ot_tester',  name: 'Tester',  credits: 25,  price: 5.0,  tag: 'Starter' },
  { id: 'ot_reader',  name: 'Reader',  credits: 75,  price: 15.0, tag: 'Popular' },
  { id: 'ot_writer',  name: 'Writer',  credits: 125, price: 25.0, tag: 'Most Popular' },
  { id: 'ot_creator', name: 'Creator', credits: 250, price: 50.0, tag: 'Power user' },
];

const weeklyTiers: SubscriptionTier[] = [
  { id: 'sub_wk_og_free', name: 'OG Free', credits: 5,  price: 0.0,  tag: 'Free' },
  { id: 'sub_wk_tester',  name: 'Tester',  credits: 10, price: 1.99 },
  { id: 'sub_wk_reader',  name: 'Reader',  credits: 25, price: 3.99, tag: 'Popular' },
  { id: 'sub_wk_writer',  name: 'Writer',  credits: 50, price: 7.99, tag: 'Most Popular' },
  { id: 'sub_wk_creator', name: 'Creator', credits: 100, price: 14.99, tag: 'Best value' },
];

const monthlyTiers: SubscriptionTier[] = [
  { id: 'sub_mo_og_free', name: 'OG Free', credits: 10,  price: 0.0,  tag: 'Free' },
  { id: 'sub_mo_tester',  name: 'Tester',  credits: 25,  price: 3.99 },
  { id: 'sub_mo_reader',  name: 'Reader',  credits: 50,  price: 7.99, tag: 'Popular' },
  { id: 'sub_mo_writer',  name: 'Writer',  credits: 100, price: 14.99, tag: 'Most Popular' },
  { id: 'sub_mo_creator', name: 'Creator', credits: 250, price: 36.99, tag: 'Best value' },
];

/* ── PayPal Buttons ───────────────────────────────────── */
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
          intent: 'CAPTURE',
          purchase_units: [{ amount: { value: price.toFixed(2), currency_code: 'USD' }, description }],
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

/* ── Package Card (landing-page look + ribbon) ────────── */
function PackageCard({
  offering,
  selected,
  onSelect,
  purchaseType,
  frequency,
}: {
  offering: BaseOffering;
  selected: boolean;
  onSelect: () => void;
  purchaseType: PurchaseType;
  frequency: SubscriptionFrequency;
}) {
  const isFree = offering.price === 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'relative flex flex-col items-center justify-center p-6 md:p-7 w-56 h-72',
        'bg-[#F3EADF] border-2 border-[#CBBBA0] rounded-2xl shadow-lg text-[#3A4B5C]',
        'transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#CBBBA0]',
        'dark:bg-white/5 dark:border-white/20 dark:text-[#E0C9A0] dark:hover:ring-white/20',
        selected ? 'ring-4 ring-[#A9834F]' : '',
      ].join(' ')}
    >
      {offering.tag && (
        <span
          className="
            absolute -top-3 right-5 rounded-full px-3 py-1 text-[10px] font-semibold
            bg-[#A9834F] text-white shadow-md animate-pulse-slow
          "
        >
          {offering.tag}
        </span>
      )}

      <i className="fas fa-feather-alt text-6xl text-[#A9834F] mb-6" />
      <span className="font-['Georgia'] font-bold text-xl uppercase">{offering.name}</span>
      <span className="mt-1 text-sm opacity-80">{offering.credits} Credits</span>
      <span className="mt-3 text-3xl font-bold">{isFree ? 'FREE' : `$${offering.price.toFixed(2)}`}</span>
      {purchaseType === 'subscription' && (
        <span className="text-xs opacity-70">
          {isFree ? (frequency === 'weekly' ? 'weekly grant' : 'monthly grant') : `per ${frequency === 'weekly' ? 'week' : 'month'}`}
        </span>
      )}
    </button>
  );
}

/* ── Page ─────────────────────────────────────────────── */
const SubscriptionPage: FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [purchaseType, setPurchaseType] = useState<PurchaseType>('one-time');
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<SubscriptionFrequency>('monthly');
  const [selectedOffering, setSelectedOffering] = useState<OneTimeCreditPackage | SubscriptionTier | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState('');
  const [referredBy, setReferredBy] = useState('');

  // ✅ Use the arrays we defined, not allCreditOfferings
  const currentOfferings: BaseOffering[] = useMemo(() => {
    if (purchaseType === 'one-time') return oneTimePackages;
    return subscriptionFrequency === 'weekly' ? weeklyTiers : monthlyTiers;
  }, [purchaseType, subscriptionFrequency]);

  // PayPal options (no inline hooks later)
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const unusable = !clientId || clientId.trim().toLowerCase() === 'test';
  const options: ReactPayPalScriptOptions = useMemo(
    () => ({ clientId: clientId!, currency: 'USD', intent: 'capture', components: 'buttons' }),
    [clientId]
  );

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
            referredBy: referredBy || undefined,
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
            referredBy: referredBy || undefined,
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold">Loading user data…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="
          min-h-screen flex items-center justify-center p-6
          bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
          text-[#3A4B5C] dark:text-[#E0C9A0] font-sans
        "
      >
        <p className="text-lg">Please log in to manage subscriptions or buy credits.</p>
      </div>
    );
  }

  return (
    <div
      className="
        min-h-screen relative flex flex-col items-center p-6 md:p-10
        bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
        text-[#3A4B5C] dark:text-[#E0C9A0] font-sans
      "
    >
      <h1 className="font-['Georgia'] text-4xl md:text-5xl font-bold mt-6 mb-6">Credits & Subscriptions</h1>

      {/* Toggle: one-time vs subscriptions */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button
          onClick={() => { setPurchaseType('one-time'); setSelectedOffering(null); setMsg('idle', ''); }}
          className={[
            'px-6 py-3 rounded-full font-semibold',
            purchaseType === 'one-time'
              ? 'bg-purple-600 text-white animate-pulse-slow'
              : 'bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-white/5 dark:border-white/20 dark:text-[#E0C9A0]',
          ].join(' ')}
        >
          One-time
        </button>
        <button
          onClick={() => { setPurchaseType('subscription'); setSelectedOffering(null); setMsg('idle', ''); }}
          className={[
            'px-6 py-3 rounded-full font-semibold',
            purchaseType === 'subscription'
              ? 'bg-purple-600 text-white animate-pulse-slow'
              : 'bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-white/5 dark:border-white/20 dark:text-[#E0C9A0]',
          ].join(' ')}
        >
          Subscriptions
        </button>
      </div>

      {/* Frequency pills */}
      {purchaseType === 'subscription' && (
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            onClick={() => { setSubscriptionFrequency('weekly'); setSelectedOffering(null); setMsg('idle', ''); }}
            className={[
              'px-5 py-2 rounded-full text-sm font-semibold',
              subscriptionFrequency === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-white/5 dark:border-white/20 dark:text-[#E0C9A0]',
            ].join(' ')}
          >
            Weekly
          </button>
          <button
            onClick={() => { setSubscriptionFrequency('monthly'); setSelectedOffering(null); setMsg('idle', ''); }}
            className={[
              'px-5 py-2 rounded-full text-sm font-semibold',
              subscriptionFrequency === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-white/5 dark:border-white/20 dark:text-[#E0C9A0]',
            ].join(' ')}
          >
            Monthly
          </button>
        </div>
      )}

      {/* Cards */}
      {purchaseType === 'one-time' ? (
        // Same 4-card look as Buy Credits
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-10">
          {currentOfferings.map((offering: BaseOffering) => (
            <PackageCard
              key={offering.id}
              offering={offering}
              selected={selectedOffering?.id === offering.id}
              onSelect={() => { setSelectedOffering(offering); setMsg('idle', ''); }}
              purchaseType={purchaseType}
              frequency={subscriptionFrequency}
            />
          ))}
        </div>
      ) : (
        // 5 plans: row of 3, row of 2 centered
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mb-10 justify-items-center w-full max-w-5xl">
          {currentOfferings.map((offering: BaseOffering, idx: number) => (
            <div
              key={offering.id}
              className={[idx === 3 ? 'md:col-start-1' : '', idx === 4 ? 'md:col-start-3' : ''].join(' ')}
            >
              <PackageCard
                offering={offering}
                selected={selectedOffering?.id === offering.id}
                onSelect={() => { setSelectedOffering(offering); setMsg('idle', ''); }}
                purchaseType={purchaseType}
                frequency={subscriptionFrequency}
              />
            </div>
          ))}
        </div>
      )}

      {/* Confirm + Referred by */}
      {selectedOffering && (
        <div className="w-full max-w-xl bg-white/40 dark:bg-white/5 backdrop-blur-sm border border-[#CBBBA0] dark:border-white/15 rounded-2xl shadow-lg p-6 mb-14">
          <h2 className="font-['Georgia'] text-2xl font-bold mb-3">Confirm Selection</h2>

          <p className="mb-4">
            You selected:&nbsp;
            <span className="font-bold text-[#A9834F]">
              {selectedOffering.name} ({selectedOffering.credits} credits)
            </span>
            &nbsp;for&nbsp;
            <span className="font-bold">
              {(selectedOffering as any).price === 0 ? 'FREE' : `$${(selectedOffering as any).price.toFixed(2)}`}
              {purchaseType === 'subscription' && (selectedOffering as any).price > 0
                ? ` / ${subscriptionFrequency === 'weekly' ? 'week' : 'month'}`
                : ''}
            </span>
          </p>

          <label className="block text-sm mb-1">Referred by (optional)</label>
          <input
            type="text"
            placeholder="Friend, creator, code, or link"
            className="mb-4 w-full p-3 rounded-md bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C]
                       focus:outline-none focus:ring-2 focus:ring-[#A9834F]
                       dark:bg-white/10 dark:border-white/20 dark:text-[#E0C9A0]"
            value={referredBy}
            onChange={(e) => setReferredBy(e.target.value)}
          />

          {message && <p className={`mb-4 ${paymentStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}

          {(selectedOffering as any).price > 0 ? (
            unusable ? (
              <div className="p-4 rounded border text-sm">
                <strong>Missing PayPal client ID.</strong> Set <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>.
              </div>
            ) : (
              <PayPalProviderClient enabled options={options}>
                <PayButtons
                  price={(selectedOffering as any).price}
                  description={`Narratum ${purchaseType === 'one-time' ? 'Credits' : 'Subscription'} - ${selectedOffering.name}${referredBy ? ` (referred by ${referredBy})` : ''}`}
                  onSuccess={onApprovePayPal}
                  onMessage={setMsg}
                />
              </PayPalProviderClient>
            )
          ) : (
            <button
              onClick={() => onApprovePayPal({ status: 'COMPLETED', id: 'FREE_PLAN' })}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition"
              disabled={paymentStatus === 'pending'}
            >
              Activate Free Plan
            </button>
          )}
        </div>
      )}

      {/* Subtle glow keyframes (match landing) */}
      <style jsx global>{`
        @keyframes pulseGlowLight {
          0%, 100% { box-shadow: 0 0 22px rgba(58, 75, 92, 0.25); }
          50% { box-shadow: 0 0 44px rgba(58, 75, 92, 0.6); }
        }
        @keyframes pulseGlowDark {
          0%, 100% { box-shadow: 0 0 8px rgba(255, 255, 255, 0.25); }
          50% { box-shadow: 0 0 16px rgba(255, 255, 255, 0.6); }
        }
        .animate-pulse-slow { animation: pulseGlowLight 2.5s infinite; }
        .dark .animate-pulse-slow { animation: pulseGlowDark 2.5s infinite; }
      `}</style>
    </div>
  );
};

export default SubscriptionPage;
