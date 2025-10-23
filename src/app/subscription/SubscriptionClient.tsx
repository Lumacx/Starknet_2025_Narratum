'use client';

import React, { FC, useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';

// Alias to avoid any clash with the server file's `dynamic` export
import nextDynamic from 'next/dynamic';
import PayPalProviderClient from '@/components/PayPalProviderClient';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePayPalScriptReducer, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import { useLocale } from '@/context/LocaleContext';
import '@paypal/paypal-js';

const PayPalButtons = nextDynamic(
  () => import('@paypal/react-paypal-js').then((m) => m.PayPalButtons),
  { ssr: false }
);

type SubscriptionFrequency = 'weekly' | 'monthly';

interface BaseOffering {
  id: string;
  name: 'OG Free' | 'Tester' | 'Reader' | 'Writer' | 'Creator';
  credits: number;
  price: number;
  tag?: string;
}
interface SubscriptionTier extends BaseOffering {}

type TierKey = 'og free' | 'tester' | 'reader' | 'writer' | 'creator';
type PlanMap = Record<SubscriptionFrequency, Record<TierKey, string>>;

type PaidStatus = 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'PENDING' | 'UNKNOWN';

interface SubscriptionStatus {
  kind: 'none' | 'free' | 'paid';
  planKey?: string;
  planName?: SubscriptionTier['name'];
  frequency?: SubscriptionFrequency;
  paypalSubscriptionId?: string;
  status?: PaidStatus;
  renewsAt?: string;
}

/* ---------- interpolation helper ---------- */
function formatT(
  t: (k: string) => string,
  key: string,
  vars?: Record<string, string | number>
) {
  let out = t(key);
  if (!vars) return out;
  for (const [k, v] of Object.entries(vars)) {
    const val = String(v);
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), val);
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), val);
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────
   Data
   ────────────────────────────────────────────────────────────────── */
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
  return order.length ? (order as SubscriptionTier[]) : list;
}

/** Pretty price */
const prettyUSD = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/* ──────────────────────────────────────────────────────────────────
   PayPal PLAN IDs — LIVE ONLY
   ────────────────────────────────────────────────────────────────── */
const PAYPAL_PLAN_IDS: PlanMap = {
  weekly: {
    'og free': 'P-59784833RN494424PNDLBX5Y', // not used with PayPal, kept for completeness
    'tester':  'P-5G020421VG335451VNDLCDAA',
    'reader':  'P-9P840869XW552833BNDLCEWI',
    'writer':  'P-6DV06426M8230392GNDLCFWQ',
    'creator': 'P-5GR1157592296905UNDLCHXI',
  },
  monthly: {
    'og free': 'P-25490973SC123773DNDLB5OY', // not used with PayPal, kept for completeness
    'tester':  'P-6JF174267D2475636NDLCLZI',
    'reader':  'P-80H73039UX394851YNDLCMQQ',
    'writer':  'P-6R486885FS7556443NDLCO6Q',
    'creator': 'P-7GH52876NN676341GNDLCPSY',
  },
};

const tierKey = (name: SubscriptionTier['name']): TierKey => {
  switch (name) {
    case 'OG Free': return 'og free';
    case 'Tester':  return 'tester';
    case 'Reader':  return 'reader';
    case 'Writer':  return 'writer';
    case 'Creator': return 'creator';
  }
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
   PayPal Buttons – Subscription (paid plans)
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
  if (!isResolved || typeof window === 'undefined' || !window.paypal) {
    return <div className="p-4 rounded-lg border text-sm">{t('paymentModuleUnavailable')}</div>;
  }
  if (!planId) {
    return (
      <div className="p-4 rounded-lg border text-sm">
        <strong>{t('planIdNotSet')}</strong>
      </div>
    );
  }

  return (
    <PayPalButtons
      fundingSource="paypal"
      style={{ layout: 'vertical' }}
      createSubscription={(_, actions) => actions.subscription.create({ plan_id: planId })}
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
  disabled
}: {
  offering: BaseOffering;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const unit = (n: number) => (n === 1 ? t('creditSingular') : t('creditsPlural'));
  return (
    <div
      className={`group relative w-full text-left rounded-2xl border-2 transition-all duration-300 ease-in-out focus:outline-none p-6 md:p-7
        bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C] shadow-lg hover:scale-[1.02] hover:shadow-xl
        ${selected ? 'shadow-[0_0_0_4px_rgba(169,131,79,0.35)]' : ''}
        dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]
        dark:hover:shadow-[0_0_30px_rgba(224,201,160,0.20)]
        w-56 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
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
        disabled={disabled}
        className="mt-6 w-full rounded-full py-2 text-center font-semibold transition bg-[#A9834F] text-white hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {selected ? t('selected') : t('choosePackage')}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Page (client)
   ────────────────────────────────────────────────────────────────── */
const SubscriptionClient: FC = () => {
  const { t } = useLocale();
  const { user, loading: authLoading } = useAuth();

  const [subscriptionFrequency, setSubscriptionFrequency] = useState<SubscriptionFrequency>('monthly');
  const [selectedOffering, setSelectedOffering] = useState<SubscriptionTier | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeMessage, setPromoCodeMessage] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>({ kind: 'none' });

  const confirmRef = useRef<HTMLDivElement | null>(null);

  const currentOfferings: BaseOffering[] = useMemo(
    () => reorderSubs(subscriptionFrequency === 'weekly' ? weeklyTiers : monthlyTiers),
    [subscriptionFrequency]
  );

  const firstRow = useMemo(() => currentOfferings.slice(0, 3), [currentOfferings]);
  const secondRow = useMemo(() => currentOfferings.slice(3), [currentOfferings]);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const unusable = !clientId || clientId.trim().toLowerCase() === 'test';

  const hasActivePaid = subStatus.kind === 'paid' && subStatus.status === 'ACTIVE';

  // SDK options (subscriptions require intent: 'subscription' and vault: true)
  const options: ReactPayPalScriptOptions = useMemo(
    () => ({
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
      'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
      components: 'buttons',
      intent: 'subscription',
      vault: true,
      currency: 'USD',
    }),
    []
  );

  function setMsg(status: 'idle' | 'success' | 'error' | 'pending', msg: string) {
    setPaymentStatus(status);
    setMessage(msg);
  }

  // Fetch current subscription status (CALLABLE)
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const getStatus = httpsCallable(functions, 'getSubscriptionStatus');
        const res = await getStatus({ userId: user.uid });
        const data = (res.data || {}) as any;
        setSubStatus({
          kind: data.kind ?? 'none',
          planKey: data.planKey,
          planName: data.planName,
          frequency: data.frequency,
          paypalSubscriptionId: data.paypalSubscriptionId,
          status: data.status as PaidStatus,
          renewsAt: data.renewsAt,
        });
      } catch (e) {
        console.warn('getSubscriptionStatus failed', e);
      }
    })();
  }, [user?.uid]);

  /** Activate OG Free (in-app only, CALLABLE) */
  const activateFree = async () => {
    if (!user?.uid) {
      setMsg('error', t('mustBeLoggedInAndHaveSelection'));
      return;
    }
    try {
      setMsg('pending', t('activatingSubscription'));
      const activate = httpsCallable(functions, 'activateFreePlan');
      await activate({
        userId: user.uid,
        planKey: selectedOffering?.id ?? (subscriptionFrequency === 'weekly' ? 'sub_wk_og_free' : 'sub_mo_og_free'),
        frequency: subscriptionFrequency,
        credits: selectedOffering?.credits ?? (subscriptionFrequency === 'weekly' ? 5 : 10),
        referredBy: referredBy || undefined,
        promoCode: promoCodeInput || undefined,
      });
      setMsg(
        'success',
        formatT(t, 'subscriptionActivated', {
          name: nameLabel(t, (selectedOffering?.name ?? 'OG Free') as any),
          frequency: t(subscriptionFrequency),
        })
      );
      setSubStatus({
        kind: 'free',
        planKey: selectedOffering?.id,
        planName: 'OG Free',
        frequency: subscriptionFrequency,
      });
    } catch (e: any) {
      console.error(e);
      setMsg('error', e?.message || t('unexpectedError'));
    }
  };

  /** Approve paid subscription (CALLABLE to your verifier) */
  async function onApproveSubscription(sub: any, paypalPlanId?: string) {
    if (!user?.uid || !selectedOffering) {
      setMsg('error', t('mustBeLoggedInAndHaveSelection'));
      return;
    }

    const subscriptionID = sub?.id;
    if (!subscriptionID) {
      setMsg('error', t('paypalSubscriptionIdMissing') || 'Missing PayPal subscription ID.');
      return;
    }

    try {
      const processSubscription = httpsCallable(functions, 'processPayPalSubscription');
      const payload = {
        subscriptionID,
        planId: paypalPlanId,
        frequency: subscriptionFrequency as 'weekly' | 'monthly',
        price: (selectedOffering as any).price,
        credits: selectedOffering.credits,
        referredBy: referredBy || undefined,
      };

      const res = await processSubscription(payload);
      const data = (res?.data || {}) as { success?: boolean; message?: string; status?: string };

      if (!data?.success) throw new Error(data?.message || t('unexpectedError'));

      setMsg(
        'success',
        formatT(t, 'subscriptionActivated', {
          name: nameLabel(t, selectedOffering.name),
          frequency: t(subscriptionFrequency),
        })
      );

      setSubStatus({
        kind: 'paid',
        planKey: selectedOffering.id,
        planName: selectedOffering.name,
        frequency: subscriptionFrequency,
        paypalSubscriptionId: subscriptionID,
        status: (data as any).status || 'ACTIVE',
      });
    } catch (e: any) {
      console.error(e);
      setMsg('error', e?.message || t('unexpectedError'));
    }
  }

  /** Cancel active paid subscription (CALLABLE) */
  const cancelActiveSubscription = async () => {
    if (!user?.uid || !subStatus.paypalSubscriptionId) return;
    try {
      setIsCancelling(true);
      setMsg('pending', t('subscriptionCancelled'));
      const cancelFn = httpsCallable(functions, 'cancelPayPalSubscription');
      await cancelFn({
        userId: user.uid,
        paypalSubscriptionId: subStatus.paypalSubscriptionId,
      });
      setMsg('success', t('subscriptionCancelled'));
      setSubStatus({ kind: 'none' });
      setSelectedOffering(null);
    } catch (e: any) {
      console.error(e);
      setMsg('error', e?.message || t('unexpectedError'));
    } finally {
      setIsCancelling(false);
    }
  };

  const onSelectPackage = (offering: BaseOffering) => {
    setSelectedOffering(offering as SubscriptionTier);
    setMsg('idle', '');
    requestAnimationFrame(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const handleRedeemPromoCode = async () => {
    if (!user) return setPromoCodeMessage(t('mustBeLoggedInToRedeem'));
    if (!promoCodeInput.trim()) return setPromoCodeMessage(t('pleaseEnterPromoCode'));
    setIsRedeeming(true);
    setPromoCodeMessage(t('redeemingPromoCode'));
    try {
      const redeemCode = httpsCallable(functions, 'redeemPromoCode');
      const result = await redeemCode({ promoCode: promoCodeInput, userId: user.uid });
      const ok = (result.data as any)?.success;
      setPromoCodeMessage(
        (result.data as any)?.message || (ok ? t('promoCodeRedeemed') : t('failedToRedeemPromo'))
      );
      if (ok) setPromoCodeInput('');
    } catch (e:any) {
      console.error(e);
      setPromoCodeMessage(formatT(t, 'errorWithMessage', { message: e.message || 'Unexpected error' }));
    } finally {
      setIsRedeeming(false);
    }
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
        <p className="text-lg">{t('pleaseLoginToManage')}</p>
      </div>
    );
  }

  const refSuffix = referredBy ? ` — ${t('referredBy')} ${referredBy}` : '';

  return (
    <div className="min-h-screen relative flex flex-col items-center p-5 md:p-10 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
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

        {/* Current subscription status + cancel */}
        <section className="w-full max-w-3xl mx-auto mb-8">
          {subStatus.kind === 'none' && (
            <div className="rounded-xl border-2 p-4 bg-white/70 dark:bg-[#2B2622] border-[#CBBBA0]">
              <p className="text-sm opacity-80">{t('noActiveSubscription') || 'No active subscription.'}</p>
            </div>
          )}

          {subStatus.kind === 'free' && (
            <div className="rounded-xl border-2 p-4 bg-white/70 dark:bg-[#2B2622] border-[#CBBBA0]">
              <p className="text-sm">
                {`You are on OG Free (${subStatus.frequency ?? 'monthly'}).`}
              </p>
            </div>
          )}

          {hasActivePaid && (
            <div className="rounded-xl border-2 p-4 bg-white/70 dark:bg-[#2B2622] border-[#CBBBA0] flex items-center justify-between gap-4">
              <div className="text-sm">
                <div className="font-semibold">
                  {`Active subscription: ${subStatus.planName ?? 'Paid'} (${subStatus.frequency ?? ''})`}
                </div>
                {subStatus.renewsAt && (
                  <div className="opacity-80">{`Renews on ${new Date(subStatus.renewsAt).toLocaleDateString()}`}</div>
                )}
              </div>
              <button
                onClick={cancelActiveSubscription}
                disabled={isCancelling}
                className="rounded-full px-5 py-2 bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCancelling ? (t('cancelling') || 'Cancelling…') : (t('cancelSubscription') || 'Cancel subscription')}
              </button>
            </div>
          )}
        </section>

        {/* Subscription Tiers */}
        <div className="flex flex-col items-center w-full max-w-5xl px-4">
          {/* Row 1 — Tester | OG Free | Reader */}
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 w-full">
            {firstRow.map((off) => (
              <PackageCard
                key={off.id}
                offering={off}
                selected={selectedOffering?.id === off.id}
                onSelect={() => onSelectPackage(off)}
                disabled={hasActivePaid}
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
              disabled={hasActivePaid}
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
              disabled={hasActivePaid}
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
                disabled={hasActivePaid}
              />
            ))}
          </section>
        </div>

        {/* Confirm + Referred By + Promo Code + Payment */}
        {selectedOffering && (
          <section
            ref={confirmRef}
            className="mx-auto w-full max-w-2xl rounded-2xl border-2 p-6 md:p-7 bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C] shadow-xl dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]"
          >
            <h3 className="font-['Georgia'] text-2xl font-bold mb-2">{t('confirmSelection')}</h3>
            <p className="text-sm md:text-base">
              {formatT(t, 'youSelectedSubscription', {
                name: nameLabel(t, selectedOffering.name),
                credits: selectedOffering.credits,
                unit: unit(selectedOffering.credits),
                price: selectedOffering.price === 0 ? t('freeUpper') : prettyUSD((selectedOffering as any).price),
                frequency: t(subscriptionFrequency),
              })}
            </p>

            {hasActivePaid && (
              <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-300">
                {`You already have an active paid subscription. Cancel it above to change plans.`}
              </p>
            )}

            {/* Referred By */}
            <div className="mt-5">
              <h4 className="font-['Georgia'] text-lg font-bold mb-2">{t('referredBy')}</h4>
              <input
                type="text"
                placeholder={t('referredByPlaceholder')}
                className="w-full rounded-full px-4 py-3 text-sm outline-none bg-white/80 border border-[#CBBBA0] focus:ring-4 focus:ring-[#CBBBA0] dark:bg-[#3A2B26] dark:border-[#6D5A40]"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                disabled={hasActivePaid}
              />
            </div>

            {/* Promo Code */}
            <div className="mt-5">
              <h4 className="font-['Georgia'] text-lg font-bold mb-2">{t('promoCode')}</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder={t('enterPromoCode')}
                  className="flex-1 rounded-full px-4 py-3 text-sm outline-none bg-white/80 border border-[#CBBBA0] focus:ring-4 focus:ring-[#CBBBA0] dark:bg-[#3A2B26] dark:border-[#6D5A40]"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  disabled={isRedeeming || hasActivePaid}
                />
                <button
                  onClick={handleRedeemPromoCode}
                  disabled={isRedeeming || hasActivePaid}
                  className="rounded-full px-6 py-3 text-sm font-semibold text-white transition bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isRedeeming ? t('redeeming') : t('redeem')}
                </button>
              </div>
              {promoCodeMessage && (
                <p className={`mt-3 text-sm ${promoCodeMessage.toLowerCase().includes('error') ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                  {promoCodeMessage}
                </p>
              )}
            </div>

            {message && (
              <p
                className={`mt-3 text-sm ${
                  paymentStatus === 'success'
                    ? 'text-green-700 dark:text-green-300'
                    : paymentStatus === 'pending'
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : paymentStatus === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'opacity-90'
                }`}
              >
                {message}
              </p>
            )}

            {/* Payment / Activation Area */}
            <div className="mt-5">
              {unusable && selectedOffering.price > 0 ? (
                <div className="p-4 rounded-lg border text-sm">
                  <strong>{t('missingPaypalClientId')}</strong>{' '}
                  {formatT(t, 'setEnvVar', { envVar: 'NEXT_PUBLIC_PAYPAL_CLIENT_ID' })}
                </div>
              ) : hasActivePaid ? null : (
                (() => {
                  const isFree = selectedOffering.price === 0 || selectedOffering.name === 'OG Free';
                  const paypalPlanId = !isFree
                    ? PAYPAL_PLAN_IDS[subscriptionFrequency][tierKey(selectedOffering.name)]
                    : undefined;

                  if (isFree) {
                    return (
                      <button
                        onClick={activateFree}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-60"
                        disabled={paymentStatus === 'pending'}
                      >
                        {t('activateFreePlan') || 'Activate Free Plan'}
                      </button>
                    );
                  }

                  return (
                    <PayPalProviderClient
                      key={`pp-${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}-${subscriptionFrequency}-${selectedOffering?.id || 'none'}`}
                      enabled
                      options={options}
                    >
                      <PayButtonsSubscription
                        planId={paypalPlanId!}
                        description={formatT(t, 'paypalSubscriptionDescription', {
                          name: nameLabel(t, selectedOffering.name),
                          frequency: t(subscriptionFrequency),
                          ref: refSuffix,
                        })}
                        onSuccess={(sub) => onApproveSubscription(sub, paypalPlanId)}
                        onMessage={setMsg}
                      />
                    </PayPalProviderClient>
                  );
                })()
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
        @keyframes pulseGlowLight { 0%,100% { box-shadow: 0 0 22px rgba(58,75,92,.25);} 50% { box-shadow: 0 0 44px rgba(58,75,92,.6);} }
        @keyframes pulseGlowDark { 0%,100% { box-shadow: 0 0 8px rgba(255,255,255,.25);} 50% { box-shadow: 0 0 16px rgba(255,255,255,.6);} }
        .animate-pulse-slow { animation: pulseGlowLight 2.5s infinite; }
        .dark .animate-pulse-slow { animation: pulseGlowDark 2.5s infinite; }
      `}</style>
    </div>
  );
};

export default SubscriptionClient;
