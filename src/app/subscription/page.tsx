'use client';

import React, { FC, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PayPalProviderClient from '@/components/PayPalProviderClient';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePayPalScriptReducer, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import { useLocale } from '@/context/LocaleContext';

const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then((m) => m.PayPalButtons),
  { ssr: false }
);

type PurchaseType = 'one-time' | 'subscription';
type SubscriptionFrequency = 'weekly' | 'monthly';

interface BaseOffering {
  id: string;
  name: 'OG Free' | 'Tester' | 'Reader' | 'Writer' | 'Creator';
  credits: number;
  price: number;
  tag?: string;
}
interface OneTimeCreditPackage extends BaseOffering {}
interface SubscriptionTier extends BaseOffering {}

/* ---------- interpolation helper (since t(key) only takes 1 arg) ---------- */
function formatT(
  t: (k: string) => string,
  key: string,
  vars?: Record<string, string | number>
) {
  let out = t(key);
  if (!vars) return out;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────
   Data
   ────────────────────────────────────────────────────────────────── */
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

/** Arrange subscription tiers so row1 = [Tester, OG Free, Reader], row2 = [Writer, Creator] */
function reorderSubs(list: SubscriptionTier[]): SubscriptionTier[] {
  const byName = Object.fromEntries(list.map(o => [o.name.toLowerCase(), o]));
  const order = ['Tester', 'OG Free', 'Reader', 'Writer', 'Creator']
    .map(k => byName[k.toLowerCase()])
    .filter(Boolean);
  return order.length ? order : list;
}

/** Pretty price */
const prettyUSD = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/* ──────────────────────────────────────────────────────────────────
   PayPal PLAN IDs (PLACEHOLDERS)
   ────────────────────────────────────────────────────────────────── */
const PAYPAL_PLAN_IDS: Record<SubscriptionFrequency, Record<Lowercase<SubscriptionTier['name']>, string>> = {
  weekly: {
    'og free': '',
    'tester': 'P-WEEKLY-TESTER-PLACEHOLDER',
    'reader': 'P-WEEKLY-READER-PLACEHOLDER',
    'writer': 'P-WEEKLY-WRITER-PLACEHOLDER',
    'creator': 'P-WEEKLY-CREATOR-PLACEHOLDER',
  },
  monthly: {
    'og free': '',
    'tester': 'P-MONTHLY-TESTER-PLACEHOLDER',
    'reader': 'P-MONTHLY-READER-PLACEHOLDER',
    'writer': 'P-MONTHLY-WRITER-PLACEHOLDER',
    'creator': 'P-MONTHLY-CREATOR-PLACEHOLDER',
  },
};

/* ──────────────────────────────────────────────────────────────────
   Localized helpers
   ────────────────────────────────────────────────────────────────── */
function nameLabel(t: (k: string)=>string, name: BaseOffering['name']) {
  switch (name) {
    case 'OG Free': return t('tierOGFree');
    case 'Tester': return t('tierTester');
    case 'Reader': return t('tierReader');
    case 'Writer': return t('tierWriter');
    case 'Creator': return t('tierCreator');
    default: return String(name);
  }
}
function tagLabel(t: (k: string)=>string, tag?: string) {
  switch (tag) {
    case 'Starter': return t('tagStarter');
    case 'Popular': return t('tagPopular');
    case 'Most Popular': return t('tagMostPopular');
    case 'Power user': return t('tagPowerUser');
    case 'Best value': return t('tagBestValue');
    case 'Free': return t('tagFree');
    default: return tag ?? '';
  }
}

/* ──────────────────────────────────────────────────────────────────
   PayPal Buttons – One-time
   ────────────────────────────────────────────────────────────────── */
function PayButtonsOneTime({
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
  const { t } = useLocale();
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();
  if (isPending) return <div className="text-center py-2">{t('loadingPaypal')}</div>;
  if (isRejected) return <div className="p-4 rounded-lg border text-sm">{t('paypalSdkBlocked')}</div>;
  if (!isResolved || typeof window === 'undefined' || !(window as any).paypal) {
    return <div className="p-4 rounded-lg border text-sm">{t('paymentModuleUnavailable')}</div>;
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
        onMessage('pending', t('processingPayment'));
        const order = await actions.order!.capture();
        onSuccess(order);
      }}
      onCancel={() => onMessage('idle', t('paymentCancelled'))}
      onError={(err) => {
        console.error(err);
        onMessage('error', t('paypalErrorTryAgain'));
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────
   PayPal Buttons – Subscription
   ────────────────────────────────────────────────────────────────── */
function PayButtonsSubscription({
  planId,
  description,
  onSuccess,
  onMessage,
}: {
  planId: string;
  description: string;
  onSuccess: (sub: any) => void;
  onMessage: (status: 'idle' | 'success' | 'error' | 'pending', msg: string) => void;
}) {
  const { t } = useLocale();
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();

  if (isPending) return <div className="text-center py-2">{t('loadingPaypal')}</div>;
  if (isRejected) return <div className="p-4 rounded-lg border text-sm">{t('paypalSdkBlocked')}</div>;
  if (!isResolved || typeof window === 'undefined' || !(window as any).paypal) {
    return <div className="p-4 rounded-lg border text-sm">{t('paymentModuleUnavailable')}</div>;
  }
  if (!planId) {
    return (
      <div className="p-4 rounded-lg border text-sm">
        <strong>{t('planIdNotSet')}</strong> {t('replacePlanIds')}
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const current = typeof window !== 'undefined' ? window.location.href : origin;

  return (
    <PayPalButtons
      style={{ layout: 'vertical' }}
      createSubscription={(_data, actions) => {
        return actions.subscription.create({
          plan_id: planId,
          application_context: {
            brand_name: 'Narratum',
            user_action: 'SUBSCRIBE_NOW',
            shipping_preference: 'NO_SHIPPING',
            locale: 'en-US',
            return_url: origin + '/subscriptions/success',
            cancel_url: current,
            payment_method: { payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED' },
          } as any,
        });
      }}
      onApprove={async (data) => {
        onMessage('pending', t('activatingSubscription'));
        onSuccess({ id: data.subscriptionID, status: 'APPROVED' });
      }}
      onCancel={() => onMessage('idle', t('subscriptionCancelled'))}
      onError={(err) => {
        console.error(err);
        onMessage('error', t('paypalSubscriptionError'));
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────
   Package Card
   ────────────────────────────────────────────────────────────────── */
function PackageCard({
  offering,
  selected,
  onSelect,
}: {
  offering: BaseOffering;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useLocale();
  const unit = (n: number) => (n === 1 ? t('creditSingular') : t('creditsPlural'));
  return (
    <div
      className={`
        group relative w-full text-left rounded-2xl border-2
        transition-all duration-300 ease-in-out focus:outline-none
        p-6 md:p-7
        bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C] shadow-lg
        hover:scale-[1.02] hover:shadow-xl
        ${selected ? 'shadow-[0_0_0_4px_rgba(169,131,79,0.35)]' : ''}
        dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]
        dark:hover:shadow-[0_0_30px_rgba(224,201,160,0.20)]
        w-56
      `}
    >
      {offering.tag && (
        <span className="absolute -top-3 right-5 rounded-full px-3 py-1 text-[10px] font-semibold bg-[#A9834F] text-white shadow-md animate-pulse-slow">
          {tagLabel(t, offering.tag)}
        </span>
      )}

      <div className="flex items-start justify-between">
        <h2 className="font-['Georgia'] text-2xl font-bold">{nameLabel(t, offering.name)}</h2>
        <span className="rounded-full px-3 py-1 text-xs font-semibold bg-[#EADFCC] text-[#3A4B5C] dark:bg-[#3A2B26] dark:text-[#E0C9A0]">
          {formatT(t, 'creditsLabel', { count: offering.credits, unit: unit(offering.credits) })}
        </span>
      </div>

      <div className="mt-4">
        <div className="text-3xl font-bold">
          {offering.price === 0 ? t('freeUpper') : prettyUSD(offering.price)}
        </div>
        <p className="mt-1 text-xs opacity-80">{t('avgScenariosSplit')}</p>
      </div>

      <button
        onClick={onSelect}
        className="mt-6 w-full rounded-full py-2 text-center font-semibold transition bg-[#A9834F] text-white hover:brightness-110"
      >
        {selected ? t('selected') : t('choosePackage')}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */
const SubscriptionPage: FC = () => {
  const { t } = useLocale();
  const { user, loading: authLoading } = useAuth();

  const [purchaseType, setPurchaseType] = useState<PurchaseType>('subscription');
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<SubscriptionFrequency>('monthly');
  const [selectedOffering, setSelectedOffering] = useState<OneTimeCreditPackage | SubscriptionTier | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const confirmRef = useRef<HTMLDivElement | null>(null);

  const currentOfferings: BaseOffering[] = useMemo(() => {
    if (purchaseType === 'one-time') return oneTimePackages;
    return reorderSubs(subscriptionFrequency === 'weekly' ? weeklyTiers : monthlyTiers);
  }, [purchaseType, subscriptionFrequency]);

  const firstRow = useMemo(() => currentOfferings.slice(0, 3), [currentOfferings]);
  const secondRow = useMemo(() => currentOfferings.slice(3), [currentOfferings]);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const unusable = !clientId || clientId.trim().toLowerCase() === 'test';
  const options: ReactPayPalScriptOptions = useMemo(
    () => ({ clientId: clientId!, currency: 'USD', intent: 'capture', components: 'buttons' }),
    [clientId]
  );

  function setMsg(status: 'idle' | 'success' | 'error' | 'pending', msg: string) {
    setPaymentStatus(status);
    setMessage(msg);
  }

  /** One-time approval */
  async function onApproveOneTime(order: any) {
    if (!user?.uid || !selectedOffering) {
      setMsg('error', t('mustBeLoggedInAndHaveSelection'));
      return;
    }
    try {
      if (order?.status === 'COMPLETED') {
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
        setMsg('success', formatT(t, 'purchasedCreditsSuccess', { credits: selectedOffering.credits }));
      } else {
        setMsg('error', t('paypalPaymentNotCompleted'));
      }
    } catch (e: any) {
      console.error(e);
      setMsg('error', e.message || t('unexpectedError'));
    }
  }

  /** Subscription approval */
  async function onApproveSubscription(sub: any) {
    if (!user?.uid || !selectedOffering) {
      setMsg('error', t('mustBeLoggedInAndHaveSelection'));
      return;
    }
    try {
      const processSubscription = httpsCallable(functions, 'processPayPalSubscription');
      await processSubscription({
        userId: user.uid,
        planId: selectedOffering.id,
        paypalSubscriptionId: sub?.id || null,
        frequency: subscriptionFrequency,
        price: (selectedOffering as any).price,
        credits: selectedOffering.credits,
        referredBy: referredBy || undefined,
      });
      setMsg(
        'success',
        formatT(t, 'subscriptionActivated', {
          name: nameLabel(t, selectedOffering.name),
          frequency: t(subscriptionFrequency === 'weekly' ? 'weekly' : 'monthly'),
        })
      );
    } catch (e: any) {
      console.error(e);
      setMsg('error', e.message || t('unexpectedError'));
    }
  }

  const onSelectPackage = (offering: BaseOffering) => {
    setSelectedOffering(offering);
    setMsg('idle', '');
    requestAnimationFrame(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const unit = (n: number) => (n === 1 ? t('creditSingular') : t('creditsPlural'));

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold">{t('loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className={`
          min-h-screen flex items-center justify-center p-6
          bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
          text-[#3A4B5C] dark:text-[#E0C9A0] font-sans
        `}
      >
        <p className="text-lg">{t('pleaseLoginToManage')}</p>
      </div>
    );
  }

  const refSuffix = referredBy ? ` — ${t('referredBy')} ${referredBy}` : '';

  return (
    <div
      className={`
        min-h-screen relative flex flex-col items-center p-5 md:p-10
        bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
        text-[#3A4B5C] dark:text-[#E0C9A0] font-sans
      `}
    >
      <div className="fixed top-7 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          {t('backToLanding')}
        </Link>
      </div>

      <div className="w-full max-w-6xl pt-6 pb-20">
        <header className="text-center mb-8 md:mb-10">
          <p className="font-['Lato'] text-base md:text-lg font-light tracking-widest mb-1">{t('subscriptions')}</p>
          <h1 className="font-['Georgia'] text-4xl md:text-5xl font-bold m-0">{t('creditsAndPlans')}</h1>
        </header>

        {/* Top toggle */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            onClick={() => { setPurchaseType('one-time'); setSelectedOffering(null); setMsg('idle', ''); }}
            className={[
              'px-6 py-3 rounded-full font-semibold',
              purchaseType === 'one-time'
                ? 'bg-purple-600 text-white animate-pulse-slow'
                : 'bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]',
            ].join(' ')}
          >
            {t('oneTime')}
          </button>
          <button
            onClick={() => { setPurchaseType('subscription'); setSelectedOffering(null); setMsg('idle', ''); }}
            className={[
              'px-6 py-3 rounded-full font-semibold',
              purchaseType === 'subscription'
                ? 'bg-purple-600 text-white animate-pulse-slow'
                : 'bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]',
            ].join(' ')}
          >
            {t('subscriptionsToggle')}
          </button>
        </div>

        {/* ONE-TIME */}
        {purchaseType === 'one-time' ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 mb-10">
            {currentOfferings.map((off) => (
              <PackageCard
                key={off.id}
                offering={off}
                selected={selectedOffering?.id === off.id}
                onSelect={() => onSelectPackage(off)}
              />
            ))}
          </section>
        ) : (
          <div className="flex flex-col items-center w-full max-w-5xl px-4">
            {/* Row 1 — Tester | OG Free | Reader */}
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 w/full">
              {firstRow.map((off) => (
                <PackageCard
                  key={off.id}
                  offering={off}
                  selected={selectedOffering?.id === off.id}
                  onSelect={() => onSelectPackage(off)}
                />
              ))}
            </section>

            {/* Frequency pills */}
            <div className="flex flex-wrap justify-center gap-3 my-8">
              <button
                onClick={() => { setSubscriptionFrequency('weekly'); setSelectedOffering(null); setMsg('idle', ''); }}
                className={[
                  'px-5 py-2 rounded-full text-sm font-semibold transition-colors',
                  subscriptionFrequency === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] hover:bg-gray-200 dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0] dark:hover:bg-gray-800',
                ].join(' ')}
              >
                {t('weekly')}
              </button>
              <button
                onClick={() => { setSubscriptionFrequency('monthly'); setSelectedOffering(null); setMsg('idle', ''); }}
                className={[
                  'px-5 py-2 rounded-full text-sm font-semibold transition-colors',
                  subscriptionFrequency === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] hover:bg-gray-200 dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0] dark:hover:bg-gray-800',
                ].join(' ')}
              >
                {t('monthly')}
              </button>
            </div>

            {/* Row 2 — Writer | Creator */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 w-full max-w-3xl">
              {secondRow.map((off) => (
                <PackageCard
                  key={off.id}
                  offering={off}
                  selected={selectedOffering?.id === off.id}
                  onSelect={() => onSelectPackage(off)}
                />
              ))}
            </section>
          </div>
        )}

        {/* Confirm + Referred By + PayPal */}
        {selectedOffering && (
          <section
            ref={confirmRef}
            className="mx-auto w-full max-w-2xl rounded-2xl border-2 p-6 md:p-7 bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C] shadow-xl dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]"
          >
            <h3 className="font-['Georgia'] text-2xl font-bold mb-2">{t('confirmSelection')}</h3>
            <p className="text-sm md:text-base">
              {purchaseType === 'one-time' ? (
                formatT(t, 'youSelectedOneTime', {
                  name: nameLabel(t, selectedOffering.name),
                  credits: selectedOffering.credits,
                  unit: unit(selectedOffering.credits),
                  price: prettyUSD((selectedOffering as any).price),
                })
              ) : (
                formatT(t, 'youSelectedSubscription', {
                  name: nameLabel(t, selectedOffering.name),
                  credits: selectedOffering.credits,
                  unit: unit(selectedOffering.credits),
                  price: selectedOffering.price === 0 ? t('freeUpper') : prettyUSD((selectedOffering as any).price),
                  frequency: t(subscriptionFrequency),
                })
              )}
            </p>

            {/* Referred By */}
            <div className="mt-5">
              <h4 className="font-['Georgia'] text-lg font-bold mb-2">{t('referredBy')}</h4>
              <input
                type="text"
                placeholder={t('referredByPlaceholder')}
                className="w-full rounded-full px-4 py-3 text-sm outline-none bg-white/80 border border-[#CBBBA0] focus:ring-4 focus:ring-[#CBBBA0] dark:bg-[#3A2B26] dark:border-[#6D5A40]"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
              />
            </div>

            {message && (
              <p
                className={`
                  mt-3 text-sm
                  ${paymentStatus === 'success'
                    ? 'text-green-700 dark:text-green-300'
                    : paymentStatus === 'pending'
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : paymentStatus === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'opacity-90'}
                `}
              >
                {message}
              </p>
            )}

            {/* PayPal Area */}
            <div className="mt-5">
              {unusable ? (
                <div className="p-4 rounded-lg border text-sm">
                  <strong>{t('missingPaypalClientId')}</strong> {formatT(t, 'setEnvVar', { envVar: 'NEXT_PUBLIC_PAYPAL_CLIENT_ID' })}
                </div>
              ) : (
                <PayPalProviderClient enabled options={options}>
                  {purchaseType === 'one-time' ? (
                    <PayButtonsOneTime
                      price={(selectedOffering as any).price}
                      description={formatT(t, 'paypalOneTimeDescription', {
                        name: nameLabel(t, selectedOffering.name),
                        ref: refSuffix,
                      })}
                      onSuccess={onApproveOneTime}
                      onMessage={setMsg}
                    />
                  ) : selectedOffering.price === 0 ? (
                    <button
                      onClick={() => onApproveSubscription({ id: 'FREE_PLAN', status: 'APPROVED' })}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition"
                      disabled={paymentStatus === 'pending'}
                    >
                      {t('activateFreePlan')}
                    </button>
                  ) : (
                    <PayButtonsSubscription
                      planId={
                        PAYPAL_PLAN_IDS[subscriptionFrequency][selectedOffering.name.toLowerCase() as Lowercase<SubscriptionTier['name']>]
                      }
                      description={formatT(t, 'paypalSubscriptionDescription', {
                        name: nameLabel(t, selectedOffering.name),
                        frequency: t(subscriptionFrequency),
                        ref: refSuffix,
                      })}
                      onSuccess={onApproveSubscription}
                      onMessage={setMsg}
                    />
                  )}
                </PayPalProviderClient>
              )}
            </div>
          </section>
        )}

        {/* Back link */}
        <div className="text-center mt-10">
          <Link href="/" className="text-sm underline opacity-80 hover:opacity-100">{t('backToLanding')}</Link>
        </div>
      </div>

      {/* Glow keyframes to match Buy Credits */}
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
