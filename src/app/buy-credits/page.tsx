'use client';

import React, { FC, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import PayPalProviderClient from '@/components/PayPalProviderClient';
import { usePayPalScriptReducer, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useLocale } from '@/context/LocaleContext';

const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then((m) => m.PayPalButtons),
  { ssr: false }
);

// --- small formatter to allow {vars} since your t() takes 1 arg
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

interface CreditPackage {
  id: string;
  tier: 'Tester' | 'Reader' | 'Writer' | 'Creator';
  credits: number;
  price: number;
  popular?: boolean;
}

const creditPackages: CreditPackage[] = [
  { id: 'pkg_tester',  tier: 'Tester',  credits: 25,  price: 5.0 },
  { id: 'pkg_reader',  tier: 'Reader',  credits: 75,  price: 15.0 },
  { id: 'pkg_writer',  tier: 'Writer',  credits: 125, price: 25.0, popular: true },
  { id: 'pkg_creator', tier: 'Creator', credits: 250, price: 50.0 },
];

const prettyUSD = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

// map internal tier to localized label
function getTierLabel(t: (k: string) => string, tier: CreditPackage['tier']) {
  switch (tier) {
    case 'Tester': return t('tierTester');
    case 'Reader': return t('tierReader');
    case 'Writer': return t('tierWriter');
    case 'Creator': return t('tierCreator');
    default: return tier;
  }
}

function ButtonsArea({
  selectedPackage,
  onSuccess,
  onMessage,
}: {
  selectedPackage: CreditPackage;
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

  const tierLabel = getTierLabel(t, selectedPackage.tier);

  return (
    <PayPalButtons
      style={{ layout: 'vertical' }}
      createOrder={(_data, actions) =>
        actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: { value: selectedPackage.price.toFixed(2), currency_code: 'USD' },
              description: formatT(t, 'paypalDescription', { tier: tierLabel }),
            },
          ],
        })
      }
      onApprove={async (_data, actions) => {
        onMessage('pending', t('processingPayment'));
        const order = await actions.order!.capture();
        onSuccess(order);
      }}
      onCancel={() => onMessage('idle', t('paymentCancelled'))}
      onError={(err) => {
        console.error('PayPal onError:', err);
        onMessage('error', t('paypalError'));
      }}
    />
  );
}

const BuyCreditsPage: FC = () => {
  const { t } = useLocale();
  const { user, loading: authLoading } = useAuth();

  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState<string>('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeMessage, setPromoCodeMessage] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const unusable = !clientId || clientId.trim().toLowerCase() === 'test';

  const options: ReactPayPalScriptOptions = useMemo(
    () => ({ clientId: clientId!, currency: 'USD', intent: 'capture', components: 'buttons' }),
    [clientId]
  );

  async function handleApproveSuccess(order: any) {
    try {
      if (!user) {
        setPaymentStatus('error');
        setMessage(t('mustBeLoggedInToPurchase'));
        return;
      }
      if (order?.status === 'COMPLETED' && selectedPackage) {
        const processPayment = httpsCallable(functions, 'processPayPalPayment');
        await processPayment({ orderId: order.id, userId: user.uid, amount: selectedPackage.credits });
        setPaymentStatus('success');
        setMessage(formatT(t, 'paymentCompletedSuccess', { credits: selectedPackage.credits }));
      } else {
        setPaymentStatus('error');
        setMessage(t('paymentNotCompleted'));
      }
    } catch (error: any) {
      console.error('Error during approval handling:', error);
      setPaymentStatus('error');
      setMessage(formatT(t, 'paymentFailed', { message: error.message || 'Unexpected error.' }));
    }
  }

  const setMsg = (status: 'idle' | 'success' | 'error' | 'pending', msg: string) => {
    setPaymentStatus(status);
    setMessage(msg);
  };

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
        <p className="text-lg font-['Lato']">{t('pleaseLoginToPurchaseOrRedeem')}</p>
      </div>
    );
  }

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
        <header className="text-center mb-8 md:mb-12">
          <p className="font-['Lato'] text-base md:text-lg font-light tracking-widest mb-1">{t('purchaseCredits')}</p>
          <h1 className="font-['Georgia'] text-4xl md:text-5xl font-bold m-0">{t('fuelYourNarrative')}</h1>
        </header>

        {/* Packages */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 mb-10">
          {creditPackages.map((pkg) => {
            const selected = selectedPackage?.id === pkg.id;
            const tierLabel = getTierLabel(t, pkg.tier);
            return (
              <button
                key={pkg.id}
                onClick={() => { setSelectedPackage(pkg); setMsg('idle', ''); }}
                className={`
                  group relative w-full text-left rounded-2xl border-2
                  transition-all duration-300 ease-in-out focus:outline-none focus:ring-4
                  p-6 md:p-7
                  bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C]
                  hover:scale-[1.02] hover:shadow-xl focus:ring-[#CBBBA0]
                  ${selected ? 'shadow-[0_0_0_4px_rgba(169,131,79,0.35)]' : 'shadow-lg'}
                  dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]
                  dark:hover:shadow-[0_0_30px_rgba(224,201,160,0.20)]
                `}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 right-5 rounded-full px-3 py-1 text-[10px] font-semibold bg-[#A9834F] text-white shadow-md animate-pulse-slow">
                    {t('mostPopular')}
                  </span>
                )}

                <div className="flex items-start justify-between">
                  <h2 className="font-['Georgia'] text-2xl font-bold">{tierLabel}</h2>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-[#EADFCC] text-[#3A4B5C] dark:bg-[#3A2B26] dark:text-[#E0C9A0]">
                    {formatT(t, 'creditsLabel', { count: pkg.credits, unit: unit(pkg.credits) })}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-bold">{prettyUSD(pkg.price)}</div>
                  <p className="mt-1 text-xs opacity-80">{t('avgScenariosSplit')}</p>
                </div>

                <div className="mt-6 w-full rounded-full py-2 text-center font-semibold transition bg-[#A9834F] text-white hover:brightness-110">
                  {selected ? t('selected') : t('choosePackage')}
                </div>
              </button>
            );
          })}
        </section>

        {/* Confirm + PayPal */}
        {selectedPackage && (
          <section className="mx-auto w-full max-w-2xl rounded-2xl border-2 p-6 md:p-7 bg-[#F3EADF] border-[#CBBBA0] text-[#3A4B5C] shadow-xl dark:bg-[#2B2622] dark:border-[#6D5A40] dark:text-[#E0C9A0]">
            <h3 className="font-['Georgia'] text-2xl font-bold mb-2">{t('confirmPurchase')}</h3>
            <p className="text-sm md:text-base">
              {formatT(t, 'youSelectedSummary', {
                tier: getTierLabel(t, selectedPackage.tier),
                credits: selectedPackage.credits,
                unit: unit(selectedPackage.credits),
                price: prettyUSD(selectedPackage.price)
              })}
            </p>

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

            <div className="mt-5">
              {unusable ? (
                <div className="p-4 rounded-lg border text-sm">
                  <strong>{t('missingPaypalClientId')}</strong> {formatT(t, 'setEnvVar', { envVar: 'NEXT_PUBLIC_PAYPAL_CLIENT_ID' })}
                </div>
              ) : (
                <PayPalProviderClient enabled options={options}>
                  <ButtonsArea selectedPackage={selectedPackage} onSuccess={handleApproveSuccess} onMessage={setMsg} />
                </PayPalProviderClient>
              )}
            </div>
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
            <p className={`mt-3 text-sm ${promoCodeMessage.startsWith('Error') ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
              {promoCodeMessage}
            </p>
          )}
        </section>

        <footer className="text-center mt-12">
          <p className="font-['Georgia'] italic text-xl">{t('whereWordsComeToLife')}</p>
        </footer>

        {/* Back link (optional) */}
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
