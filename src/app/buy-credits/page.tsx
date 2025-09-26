'use client';

import React, { FC, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useLocale } from '@/context/LocaleContext';

/* ------------------------- utils ------------------------- */
// small formatter to allow {vars} since your t() takes 1 arg
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

/* ------------------------- data -------------------------- */
interface CreditPackage {
  id: string;
  tier: 'Tester' | 'Reader' | 'Writer' | 'Creator';
  credits: number;
  value: number; // USD
  paypalHostedButtonId: string;
  popular?: boolean;
}

const creditPackages: CreditPackage[] = [
  { id: 'pkg_tester',  tier: 'Tester',  credits: 25,  value: 5.0,  paypalHostedButtonId: 'V2D9DHV8DQVCE' },
  { id: 'pkg_reader',  tier: 'Reader',  credits: 75,  value: 15.0, paypalHostedButtonId: 'CQ33GPF5623DU' },
  { id: 'pkg_writer',  tier: 'Writer',  credits: 125, value: 25.0, paypalHostedButtonId: '3YUKSD6AU4JH4', popular: true },
  { id: 'pkg_creator', tier: 'Creator', credits: 250, value: 50.0, paypalHostedButtonId: 'FRNPD2T8EBFVW' },
];

const prettyUSD = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

function getTierLabel(t: (k: string) => string, tier: CreditPackage['tier']) {
  switch (tier) {
    case 'Tester': return t('tierTester');
    case 'Reader': return t('tierReader');
    case 'Writer': return t('tierWriter');
    case 'Creator': return t('tierCreator');
    default: return tier;
  }
}

/* ------------------- PayPal SDK loader ------------------- */
function buildPaypalSdkUrl(): string {
  const cid = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
  // Fallback to the client id in your snippet if env is absent
  const clientIdParam = cid && cid.toLowerCase() !== 'test'
    ? cid
    : 'BAA9lUWk2NboIhxcfoMoktoVWHEklLxzISrOr-BWSKLhIg3OjaTl4KRGox_OLtX8gqFFb8OwVvNUVv8GmY';
  const params = new URLSearchParams({
    'client-id': clientIdParam,
    components: 'hosted-buttons',
    'disable-funding': 'venmo',
    currency: 'USD',
  });
  return `https://www.paypal.com/sdk/js?${params.toString()}`;
}

/* ========================= Page ========================== */
const BuyCreditsPage: FC = () => {
  const { t } = useLocale();
  const { user, loading: authLoading } = useAuth();

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState<string>('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeMessage, setPromoCodeMessage] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isPaypalSdkLoaded, setIsPaypalSdkLoaded] = useState(false);

  // Load PayPal SDK once
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-hosted-buttons]');
    if (existing) {
      setIsPaypalSdkLoaded(true);
      return;
    }
    const s = document.createElement('script');
    s.src = buildPaypalSdkUrl();
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-paypal-hosted-buttons', '1');
    s.onload = () => setIsPaypalSdkLoaded(true);
    s.onerror = () => {
      setPaymentStatus('error');
      setMessage(t('paypalSdkBlocked'));
    };
    document.head.appendChild(s);
    return () => {
      // keep script for SPA navigations; do not remove
    };
  }, [t]);

  // Render all hosted buttons when SDK is ready
  useEffect(() => {
    if (!isPaypalSdkLoaded) return;
    const pp: any = (window as any).paypal;
    if (!pp?.HostedButtons) return;

    creditPackages.forEach((pkg) => {
      const sel = `#paypal-container-${pkg.paypalHostedButtonId}`;
      const el = document.querySelector(sel);
      if (!el) return;
      // Avoid duplicate rendering if we navigate back to this page
      // PayPal injects an iframe into the container; skip if present
      if (el.querySelector('iframe')) return;

      try {
        pp.HostedButtons({ hostedButtonId: pkg.paypalHostedButtonId }).render(sel);
      } catch (err) {
        console.error('HostedButtons render error:', err);
      }
    });
  }, [isPaypalSdkLoaded]);

  const unit = (n: number) => (n === 1 ? t('creditSingular') : t('creditsPlural'));

  const handleRedeemPromoCode = async () => {
    if (!user) return setPromoCodeMessage(t('mustBeLoggedInToRedeem'));
    if (!promoCodeInput.trim()) return setPromoCodeMessage(t('pleaseEnterPromoCode'));
    setIsRedeeming(true);
    setPromoCodeMessage(t('redeemingPromoCode'));
    try {
      const redeemCode = httpsCallable(functions, 'redeemPromoCode');
      const result = await redeemCode({ promoCode: promoCodeInput });
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
        className='
          min-h-screen flex items-center justify-center p-6
          bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
          text-[#3A4B5C] dark:text-[#E0C9A0] font-sans
        '
      >
        <p className="text-lg font-['Lato']">{t('pleaseLoginToPurchaseOrRedeem')}</p>
      </div>
    );
  }

  return (
    <div
      className='
        min-h-screen relative flex flex-col items-center p-5 md:p-10
        bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26]
        text-[#3A4B5C] dark:text-[#E0C9A0] font-sans
  '
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
        <header className="text-center mb-8 md:mb-12">
          <p className="font-['Lato'] text-base md:text-lg font-light tracking-widest mb-1">{t('purchaseCredits')}</p>
          <h1 className="font-['Georgia'] text-4xl md:text-5xl font-bold m-0">{t('fuelYourNarrative')}</h1>
        </header>

        {/* Packages + PayPal Hosted Buttons */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 mb-10">
          {creditPackages.map((pkg) => {
            const tierLabel = getTierLabel(t, pkg.tier);
            return (
              <div
                key={pkg.id}
                className='
                  relative w-full rounded-2xl border-2
                  p-6 md:p-7 transition-all duration-300
                  bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C]
                  shadow-lg hover:shadow-xl
                  dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]
                '
              >
                {pkg.popular && (
                  <span className="absolute -top-3 right-5 rounded-full px-3 py-1 text-[10px] font-semibold bg-[#A9834F] text-white shadow-md animate-pulse-slow">
                    {t('mostPopular')}
                  </span>
                )}

                <div className="flex items-start justify-between">
                  <h2 className="font-['Georgia'] text-2xl font-bold">{tierLabel}</h2>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-[#EADFCC] text-[#3A4B5C] dark:bg-[#3A2B26] dark:text-[#E0C9A0]">
                    {formatT(t, 'creditsLabel', { count: pkg.credits, unit: (pkg.credits === 1 ? t('creditSingular') : t('creditsPlural')) })}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-bold">{prettyUSD(pkg.value)}</div>
                  <p className="mt-1 text-xs opacity-80">{t('avgScenariosSplit')}</p>
                </div>

                {/* PayPal hosted button container */}
                <div className="mt-6">
                  <div id={`paypal-container-${pkg.paypalHostedButtonId}`} />
                  {!isPaypalSdkLoaded && (
                    <div className="text-center py-2 text-sm opacity-80">{t('loadingPaypal')}</div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Message area (SDK status / generic notices) */}
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

        {/* Promo Code */}
        <section className={`mt-10 mx-auto w-full max-w-2xl rounded-2xl border-2 p-6 md:p-7 bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C] shadow-xl dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]`}>
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
            <p className={`mt-3 text-sm ${promoCodeMessage.startsWith('Error') ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
              {promoCodeMessage}
            </p>
          )}
        </section>

        <footer className="text-center mt-12">
          <p className="font-['Georgia'] italic text-xl">{t('whereWordsComeToLife')}</p>
        </footer>

        <div className="text-center mt-10">
          <Link href="/" className="text-sm underline opacity-80 hover:opacity-100">{t('backToLanding')}</Link>
        </div>
      </div>

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

export default BuyCreditsPage;
