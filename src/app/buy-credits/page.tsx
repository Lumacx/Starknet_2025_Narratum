'use client';

import React, { FC, useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PayPalProviderClient from '@/components/PayPalProviderClient';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePayPalScriptReducer, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import { useLocale } from '@/context/LocaleContext';
import '@paypal/paypal-js'; // ensure window.paypal types are augmented
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then((m) => m.PayPalButtons),
  { ssr: false }
);

interface OneTimeCreditPackage {
  id: 'pkg_tester' | 'pkg_reader' | 'pkg_writer' | 'pkg_creator';
  name: 'Tester' | 'Reader' | 'Writer' | 'Creator';
  credits: number;
  price: number; // USD
  tag?: string;
  paypalHostedButtonId: string; // legacy hosted buttons (optional)
}

/* ────────────────────────────────────────────────────────────
   i18n helpers
   ──────────────────────────────────────────────────────────── */
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

const prettyUSD = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

function nameLabel(t: (k: string) => string, name: OneTimeCreditPackage['name']) {
  switch (name) {
    case 'Tester': return t('tierTester');
    case 'Reader': return t('tierReader');
    case 'Writer': return t('tierWriter');
    case 'Creator': return t('tierCreator');
    default: return String(name);
  }
}

function tagLabel(t: (k: string) => string, tag?: string) {
  switch (tag) {
    case 'Starter': return t('tagStarter');
    case 'Popular': return t('tagPopular');
    case 'Most Popular': return t('tagMostPopular');
    case 'Power user': return t('tagPowerUser');
    default: return tag ?? '';
  }
}

/* ────────────────────────────────────────────────────────────
   Live credits hook
   ──────────────────────────────────────────────────────────── */
function useUserCredits(uid?: string) {
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) { setCredits(null); return; }
    const db = getFirestore();
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(ref, (snap) => {
      const val = Number(snap.get('credits') ?? 0);
      setCredits(Number.isFinite(val) ? val : 0);
    });
    return () => unsub();
  }, [uid]);

  return credits;
}

/* ────────────────────────────────────────────────────────────
   Data
   ──────────────────────────────────────────────────────────── */
const oneTimePackages: OneTimeCreditPackage[] = [
  { id: 'pkg_tester',  name: 'Tester',  credits: 25,  price: 5.0,  tag: 'Starter',      paypalHostedButtonId: 'V2D9DHV8DQVCE' },
  { id: 'pkg_reader',  name: 'Reader',  credits: 75,  price: 15.0, tag: 'Popular',      paypalHostedButtonId: 'CQ33GPF5623DU' },
  { id: 'pkg_writer',  name: 'Writer',  credits: 125, price: 25.0, tag: 'Most Popular', paypalHostedButtonId: '3YUKSD6AU4JH4' },
  { id: 'pkg_creator', name: 'Creator', credits: 250, price: 50.0, tag: 'Power user',   paypalHostedButtonId: 'FRNPD2T8EBFVW' },
];

/* ────────────────────────────────────────────────────────────
   PayPal Buttons – One-time (Dynamic Orders)
   ──────────────────────────────────────────────────────────── */
function PayButtonsOneTime({
  packageId,
  onSuccess,
  onMessage,
  user,
  referredBy,
}: {
  packageId: OneTimeCreditPackage['id'];
  onSuccess: (data: any) => void;
  onMessage: (status: 'idle' | 'success' | 'error' | 'pending', msg: string) => void;
  user: { uid: string };
  referredBy?: string;
}) {
  const { t } = useLocale();
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();

  if (isPending) return <div className="text-center py-2">{t('loadingPaypal')}</div>;
  if (isRejected) return <div className="p-4 rounded-lg border text-sm">{t('paypalSdkBlocked')}</div>;
  if (!isResolved || typeof window === 'undefined' || !window.paypal) {
    return <div className="p-4 rounded-lg border text-sm">{t('paymentModuleUnavailable')}</div>;
  }

  const createOrder = async () => {
    try {
      const createOrderCallable = httpsCallable(functions, 'createPayPalOrder');
      const result = await createOrderCallable({ packageId });
      const orderId = (result.data as any)?.orderId;
      if (!orderId) throw new Error('Order creation returned no id');
      return orderId;
    } catch (e: any) {
      console.error('createOrder failed:', e);
      onMessage('error', t('paypalErrorTryAgain'));
      throw e;
    }
  };

  const onApprove = async (data: any) => {
    onMessage('pending', t('processingPayment'));
    try {
      const processCallable = httpsCallable(functions, 'processPayPalOneTimePayment');
      const result = await processCallable({
        orderId: data.orderID,
        userId: user.uid,
        referredBy: referredBy || undefined,
      });
      onSuccess(result.data);
    } catch (e: any) {
      console.error('onApprove/process failed:', e);
      onMessage('error', t('paypalErrorTryAgain'));
    }
  };

  return (
    <PayPalButtons
      style={{ layout: 'vertical' }}
      createOrder={createOrder}
      onApprove={onApprove}
      onCancel={() => onMessage('idle', t('paymentCancelled'))}
      onError={(err) => {
        console.error(err);
        onMessage('error', t('paypalErrorTryAgain'));
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────────
   Legacy Hosted Buttons (optional)
   ──────────────────────────────────────────────────────────── */
interface HostedPayPalButtonRendererProps {
  hostedButtonId: string;
  onSuccess: (data: { orderId: string; hostedButtonId: string; status: string }) => void;
  onMessage: (status: 'idle' | 'success' | 'error' | 'pending', msg: string) => void;
}

const HostedPayPalButtonRenderer: FC<HostedPayPalButtonRendererProps> = ({
  hostedButtonId,
  onSuccess,
  onMessage,
}) => {
  const { t } = useLocale();
  const [{ isResolved, isPending, isRejected }] = usePayPalScriptReducer();
  const containerId = `paypal-container-${hostedButtonId}`;

  useEffect(() => {
    if (isResolved && window.paypal?.HostedButtons) {
      try {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';
        window.paypal.HostedButtons({ hostedButtonId }).render(`#${containerId}`);
        onMessage('idle', t('paypalHostedButtonReady'));
      } catch (err) {
        console.error('Error rendering PayPal Hosted Button:', err);
        onMessage('error', t('paypalErrorTryAgain'));
      }
    } else if (isRejected) {
      onMessage('error', t('paypalSdkBlocked'));
    } else if (!isPending && !isResolved) {
      onMessage('pending', t('paymentModuleUnavailable'));
    }
  }, [isResolved, hostedButtonId, containerId, onMessage, t, isPending, isRejected]);

  if (isPending) return <div className="text-center py-2">{t('loadingPaypal')}</div>;
  if (isRejected) return <div className="p-4 rounded-lg border text-sm">{t('paypalSdkBlocked')}</div>;

  return <div id={containerId} className="w-full flex justify-center py-2" />;
};

/* ────────────────────────────────────────────────────────────
   Package Card
   ──────────────────────────────────────────────────────────── */
function PackageCard({
  offering,
  selected,
  onSelect,
  disabled,
}: {
  offering: OneTimeCreditPackage;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
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
        <div className="text-3xl font-bold">{prettyUSD(offering.price)}</div>
        <p className="mt-1 text-xs opacity-80">{t('avgScenariosSplit')}</p>
      </div>

      <button
        onClick={onSelect}
        disabled={disabled}
        className={`mt-6 w-full rounded-full py-2 text-center font-semibold transition
          ${disabled ? 'bg-[#A9834F]/60 text-white/80 cursor-not-allowed' : 'bg-[#A9834F] text-white hover:brightness-110'}`}
      >
        {disabled ? t('loadingPaypal') : (selected ? t('selected') : t('choosePackage'))}
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */
const BuyCreditsPage: FC = () => {
  const { t } = useLocale();
  const { user, loading: authLoading } = useAuth();

  const [selectedOffering, setSelectedOffering] = useState<OneTimeCreditPackage | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const confirmRef = useRef<HTMLDivElement | null>(null);

  // Promo code
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeMessage, setPromoCodeMessage] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const unusable = !clientId || clientId.trim().toLowerCase() === 'test';

  // Live credits
  const liveCredits = useUserCredits(user?.uid);

  // PayPal SDK readiness (used to disable selection during load / processing)
  const [{ isPending: sdkPending }] = usePayPalScriptReducer();

  // PayPal SDK options (lock locale)
  const options: ReactPayPalScriptOptions = useMemo(() => {
    if (!clientId) return {} as any;
    return {
      clientId,
      'client-id': clientId,
      currency: 'USD',
      components: 'buttons,hosted-buttons',
      intent: 'capture',
      vault: false,
      locale: 'es_CR', // change to 'en_US' if you prefer English
    } as any;
  }, [clientId]);

  function setMsg(status: 'idle' | 'success' | 'error' | 'pending', msg: string) {
    setPaymentStatus(status);
    setMessage(msg);
  }

  /** One-time approval (callback from PayButtonsOneTime) */
  async function onApproveOneTime(data: any) {
    if (data?.success) {
      setMsg('success', formatT(t, 'purchasedCreditsSuccess', { credits: selectedOffering!.credits }));
    } else {
      setMsg('error', data?.message || t('unexpectedError'));
    }
  }

  const onSelectPackage = (offering: OneTimeCreditPackage) => {
    if (sdkPending || paymentStatus === 'pending') return;
    setSelectedOffering(offering);
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
    } catch (e: any) {
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
        <p className="text-lg font-['Lato']">{t('pleaseLoginToPurchaseOrRedeem')}</p>
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
        <header className="text-center mb-8 md:mb-12">
          <p className="font-['Lato'] text-base md:text-lg font-light tracking-widest mb-1">{t('purchaseCredits')}</p>
          <h1 className="font-['Georgia'] text-4xl md:text-5xl font-bold m-0">{t('fuelYourNarrative')}</h1>
          {typeof liveCredits === 'number' && (
            <p className="mt-2 opacity-80">
              {formatT(t, 'yourBalanceIs', { credits: liveCredits })}
            </p>
          )}
        </header>

        {/* Packages with PayPal Buttons */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 mb-10">
          {oneTimePackages.map((off) => (
            <PackageCard
              key={off.id}
              offering={off}
              selected={selectedOffering?.id === off.id}
              onSelect={() => onSelectPackage(off)}
              disabled={sdkPending || paymentStatus === 'pending'}
            />
          ))}
        </section>

        {/* Confirm + Referred By + PayPal */}
        {selectedOffering && (
          <section
            ref={confirmRef}
            className="mx-auto w-full max-w-2xl rounded-2xl border-2 p-6 md:p-7 bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C] shadow-xl dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]"
          >
            <h3 className="font-['Georgia'] text-2xl font-bold mb-2">{t('confirmSelection')}</h3>
            <p className="text-sm md:text-base">
              {formatT(t, 'youSelectedOneTime', {
                name: nameLabel(t, selectedOffering.name),
                credits: selectedOffering.credits,
                unit: unit(selectedOffering.credits),
                price: prettyUSD(selectedOffering.price),
              })}
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
                  <strong>{t('missingPaypalClientId')}</strong>{' '}
                  {formatT(t, 'setEnvVar', { envVar: 'NEXT_PUBLIC_PAYPAL_CLIENT_ID' })}
                </div>
              ) : (
                <PayPalProviderClient
                  key={`pp-${clientId}-${selectedOffering?.id || 'none'}-capture`}
                  enabled
                  options={options}
                >
                  <PayButtonsOneTime
                    packageId={selectedOffering.id}
                    onSuccess={onApproveOneTime}
                    onMessage={setMsg}
                    user={user}
                    referredBy={referredBy}
                  />
                </PayPalProviderClient>
              )}
            </div>

            {/* Optional legacy hosted button (keep hidden or show with a label) */}
            {/* <div className="mt-6">
              <h4 className="text-sm opacity-80">{t('legacyCheckout')}</h4>
              <PayPalProviderClient key={`pp-hosted-${clientId}`} enabled options={options}>
                <HostedPayPalButtonRenderer
                  hostedButtonId={selectedOffering.paypalHostedButtonId}
                  onSuccess={() => {}}
                  onMessage={setMsg}
                />
              </PayPalProviderClient>
            </div> */}
          </section>
        )}

        {/* Promo Code */}
        <section className="mt-10 mx-auto w-full max-w-2xl rounded-2xl border-2 p-6 md:p-7 bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C] shadow-xl dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]">
          <h3 className="font-['Georgia'] text-2xl font-bold mb-4">{t('redeemPromoCode')}</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder={t('enterPromoCode')}
              className="flex-1 rounded-full px-4 py-3 text-sm outline-none bg-white/80 border border-[#CBBBA0] focus:ring-4 focus:ring-[#CBBBA0] dark:bg-[#3A2B26] dark:border-[#6D5A40]"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value)}
              disabled={isRedeeming}
            />
            <button
              onClick={handleRedeemPromoCode}
              disabled={isRedeeming}
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
        </section>

        <footer className="text-center mt-12">
          <p className="font-['Georgia'] italic text-xl">{t('whereWordsComeToLife')}</p>
        </footer>

        <div className="text-center mt-10">
          <Link href="/" className="text-sm underline opacity-80 hover:opacity-100">
            {t('backToLanding')}
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulseGlowLight { 0%,100%{ box-shadow:0 0 22px rgba(58,75,92,.25);} 50%{ box-shadow:0 0 44px rgba(58,75,92,.6);} }
        @keyframes pulseGlowDark { 0%,100%{ box-shadow:0 0 8px rgba(255,255,255,.25);} 50%{ box-shadow:0 0 16px rgba(255,255,255,.6);} }
        .animate-pulse-slow { animation: pulseGlowLight 2.5s infinite; }
        .dark .animate-pulse-slow { animation: pulseGlowDark 2.5s infinite; }
      `}</style>
    </div>
  );
};

export default BuyCreditsPage;
