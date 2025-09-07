// src/app/subscription/page.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

/* ----------------------------- Types & Data ----------------------------- */
type BillingCycle = 'monthly' | 'yearly';
type PlanName = 'Free' | 'Fan' | 'Premium';

const BASE_PRICES: Record<Exclude<PlanName, 'Free'>, { monthly: number; yearly: number }> = {
  Fan: { monthly: 8, yearly: 80 },
  Premium: { monthly: 15, yearly: 150 },
};

type AppliedCode =
  | { code: 'Cartaguito0925'; kind: 'free_month' }
  | { code: 'Beta2025'; kind: 'percent'; pct: number };

function formatUSD(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

/* ----------------------------- Price Engine ----------------------------- */
function computePrice(
  plan: PlanName,
  cycle: BillingCycle,
  code?: AppliedCode
): { display: string; raw: number; explainer?: string } {
  if (plan === 'Free') return { display: 'Free', raw: 0 };

  const base = BASE_PRICES[plan][cycle];

  // Default (no code)
  if (!code) {
    return {
      display: cycle === 'monthly' ? `${formatUSD(base)} / month` : `${formatUSD(base)} / year`,
      raw: base,
    };
  }

  // Cartaguito0925 → 1 month free (first month $0 for monthly, or minus 1 month value from yearly)
  if (code.kind === 'free_month') {
    if (cycle === 'monthly') {
      const nextCharge = base; // after the free month
      return {
        display: `${formatUSD(0)} now, then ${formatUSD(nextCharge)}/mo`,
        raw: 0,
        explainer: 'First month free. Billed monthly afterward.',
      };
    } else {
      // Yearly: subtract single-month value from yearly total
      const monthValue = BASE_PRICES[plan].monthly;
      const discounted = Math.max(0, base - monthValue);
      return {
        display: `${formatUSD(discounted)} / year`,
        raw: discounted,
        explainer: `Includes 1 month free (${formatUSD(monthValue)} off).`,
      };
    }
  }

  // Beta2025 → 25% off the purchase (monthly first charge or yearly total)
  if (code.kind === 'percent') {
    const discounted = +(base * (1 - code.pct)).toFixed(2);
    if (cycle === 'monthly') {
      return {
        display: `${formatUSD(discounted)} now, then ${formatUSD(base)}/mo`,
        raw: discounted,
        explainer: `${Math.round(code.pct * 100)}% off the first charge.`,
      };
    } else {
      return {
        display: `${formatUSD(discounted)} / year`,
        raw: discounted,
        explainer: `${Math.round(code.pct * 100)}% off the annual total.`,
      };
    }
  }

  // Fallback
  return {
    display: cycle === 'monthly' ? `${formatUSD(base)} / month` : `${formatUSD(base)} / year`,
    raw: base,
  };
}

/* ----------------------------- UI ----------------------------- */
const SubscriptionPage: React.FC = () => {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [message, setMessage] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [applied, setApplied] = useState<AppliedCode | undefined>(undefined);
  const [codeError, setCodeError] = useState<string | null>(null);

  const fanPrice = useMemo(() => computePrice('Fan', billing, applied), [billing, applied]);
  const premiumPrice = useMemo(() => computePrice('Premium', billing, applied), [billing, applied]);

  function handleApplyCode() {
    const code = referralInput.trim();
    setCodeError(null);

    if (!code) {
      setCodeError('Please enter a code.');
      return;
    }

    // Normalize case-insensitive
    const c = code.toLowerCase();

    if (c === 'cartaguito0925'.toLowerCase()) {
      setApplied({ code: 'Cartaguito0925', kind: 'free_month' });
      setReferralInput('');
      setMessage('Referral applied: First month free (or 1 month value off yearly).');
      return;
    }

    if (c === 'beta2025'.toLowerCase()) {
      setApplied({ code: 'Beta2025', kind: 'percent', pct: 0.25 });
      setReferralInput('');
      setMessage('Referral applied: 25% off this purchase.');
      return;
    }

    setCodeError('Invalid code. Check the spelling and try again.');
  }

  function clearCode() {
    setApplied(undefined);
    setMessage('Referral code removed.');
    setCodeError(null);
  }

  function handleSubscribe(planName: PlanName) {
    if (planName === 'Free') {
      setMessage(`You're choosing the Free plan. Enjoy!`);
      return;
    }

    const p = computePrice(planName, billing, applied);

    // This is where you’ll integrate your checkout.
    // For now we just show a confirmation message with the computed pricing.
    const note = applied
      ? ` (${applied.code}${p.explainer ? ` — ${p.explainer}` : ''})`
      : '';

    setMessage(
      `Proceeding to subscribe to ${planName} — ${billing.toUpperCase()} at ${p.display}${note}. (Checkout not yet wired)`
    );
  }

  const Toggle = (
    <div className="inline-flex items-center rounded-full bg-white/70 dark:bg-black/30 border border-[#C1A98A] overflow-hidden shadow-sm">
      <button
        className={`px-4 py-2 text-sm font-semibold transition ${
          billing === 'monthly'
            ? 'bg-[#C1A98A] text-white'
            : 'text-[#3A4B5C] dark:text-[#E0C9A0]'
        }`}
        onClick={() => setBilling('monthly')}
        aria-pressed={billing === 'monthly'}
      >
        Monthly
      </button>
      <button
        className={`px-4 py-2 text-sm font-semibold transition ${
          billing === 'yearly'
            ? 'bg-[#C1A98A] text-white'
            : 'text-[#3A4B5C] dark:text-[#E0C9A0]'
        }`}
        onClick={() => setBilling('yearly')}
        aria-pressed={billing === 'yearly'}
      >
        Yearly
      </button>
    </div>
  );

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center p-5 md:p-10 
      bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] 
      text-[#3A4B5C] dark:text-[#E0C9A0] font-sans"
    >
      {/* Back */}
      <div className="fixed top-7 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-full shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          Back to Landing
        </Link>
      </div>

      {/* Container */}
      <div className="subscription-container w-full max-w-5xl text-center pt-16">
        <header className="page-header mb-8 md:mb-10">
          <h1 className="font-['Georgia'] text-5xl md:text-6xl font-bold text-[#3A4B5C] dark:text-[#E0C9A0] mb-3 filter drop-shadow-md">
            NARRATUM
          </h1>
          <h1 className="font-['Merriweather'] text-3xl md:text-4xl font-bold uppercase tracking-wide text-[#3A4B5C] dark:text-[#E0C9A0]">
            CHOOSE YOUR PATH
          </h1>
          <h2 className="font-['Merriweather'] text-2xl md:text-3xl font-normal uppercase tracking-wide text-[#3A4B5C] dark:text-[#E0C9A0]">
            IN NARRATUM
          </h2>
        </header>

        {/* Billing Toggle + Referral */}
        <div className="flex flex-col items-center gap-4 mb-6">
          {Toggle}

          <div className="w-full max-w-lg flex items-center gap-2">
            <input
              type="text"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              placeholder="Enter Referral Code"
              className="flex-1 rounded-lg border border-[#C1A98A] bg-white/80 dark:bg-black/30 px-4 py-2 outline-none focus:ring-2 focus:ring-[#C1A98A]"
            />
            <button
              onClick={handleApplyCode}
              className="px-4 py-2 rounded-lg bg-[#5D6D7E] text-white font-semibold shadow-md hover:bg-[#4E5C6A] transition"
            >
              Apply
            </button>
          </div>

          {/* Applied code chip + errors */}
          <div className="min-h-[28px]">
            {applied ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C1A98A] bg-white/70 dark:bg-black/30 px-3 py-1 text-sm">
                <span className="font-semibold">Code:</span>
                <span className="uppercase tracking-wide">
                  {applied.code}
                </span>
                <button
                  onClick={clearCode}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition"
                  aria-label="Remove code"
                  title="Remove code"
                >
                  <X size={14} />
                </button>
              </div>
            ) : codeError ? (
              <div className="text-sm text-red-700 bg-red-100 px-3 py-1 rounded-lg">
                {codeError}
              </div>
            ) : null}
          </div>
        </div>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-blue-100 text-blue-700">
            {message}
          </div>
        )}

        {/* Plans */}
        <main className="pricing-plans flex justify-center gap-8 md:gap-10 flex-wrap">
          {/* Free */}
          <div className="plan-card bg-[#F9F6F0] border-2 border-[#C1A98A] rounded-xl p-8 md:p-10 w-64 flex flex-col items-center shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
            <i className="fas fa-feather-alt text-6xl text-[#A9834F] mb-6" />
            <h3 className="font-['Merriweather'] text-2xl font-extrabold uppercase text-[#4A3B31] mb-2">
              FREE
            </h3>
            <p className="font-['Merriweather'] text-3xl font-bold text-[#3D2B1F] mb-6">
              Free
            </p>
            <button
              onClick={() => handleSubscribe('Free')}
              className="font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-6 text-base font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 ease-in-out w-4/5 shadow-md hover:bg-[#4E5C6A] hover:translate-y-[-2px]"
            >
              SUBSCRIBE
            </button>
          </div>

          {/* Fan */}
          <div className="plan-card featured-plan bg-[#F9F6F0] border-2 border-[#A9834F] rounded-xl p-8 md:p-10 w-64 flex flex-col items-center shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
            <i className="fas fa-star text-6xl text-[#A9834F] mb-6" />
            <h3 className="font-['Merriweather'] text-2xl font-extrabold uppercase text-[#4A3B31] mb-2">
              Fan
            </h3>

            <p className="font-['Merriweather'] text-3xl font-bold text-[#3D2B1F] mb-1">
              {billing === 'monthly' ? formatUSD(BASE_PRICES.Fan.monthly) : formatUSD(BASE_PRICES.Fan.yearly)}
              <span className="text-base font-normal block leading-none mt-0.5 text-[#5C4B3E]">
                {billing === 'monthly' ? 'month' : 'year'}
              </span>
            </p>

            {/* Effective price preview with referral */}
            {applied && (
              <p className="text-sm text-[#5C4B3E] mb-2">
                Now: <span className="font-semibold">{fanPrice.display}</span>
              </p>
            )}

            <button
              onClick={() => handleSubscribe('Fan')}
              className="mt-2 font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-6 text-base font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 ease-in-out w-4/5 shadow-md hover:bg-[#4E5C6A] hover:translate-y-[-2px]"
            >
              SUBSCRIBE
            </button>
          </div>

          {/* Premium */}
          <div className="plan-card bg-[#F9F6F0] border-2 border-[#C1A98A] rounded-xl p-8 md:p-10 w-64 flex flex-col items-center shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
            <i className="fas fa-dragon text-6xl text-[#A9834F] mb-6" />
            <h3 className="font-['Merriweather'] text-2xl font-extrabold uppercase text-[#4A3B31] mb-2">
              Premium
            </h3>

            <p className="font-['Merriweather'] text-3xl font-bold text-[#3D2B1F] mb-1">
              {billing === 'monthly' ? formatUSD(BASE_PRICES.Premium.monthly) : formatUSD(BASE_PRICES.Premium.yearly)}
              <span className="text-base font-normal block leading-none mt-0.5 text-[#5C4B3E]">
                {billing === 'monthly' ? 'month' : 'year'}
              </span>
            </p>

            {/* Effective price preview with referral */}
            {applied && (
              <p className="text-sm text-[#5C4B3E] mb-2">
                Now: <span className="font-semibold">{premiumPrice.display}</span>
              </p>
            )}

            <button
              onClick={() => handleSubscribe('Premium')}
              className="mt-2 font-['Lato'] bg-[#5D6D7E] text-[#FDFCFB] border-none rounded-lg py-3 px-6 text-base font-bold uppercase tracking-wide cursor-pointer transition-all duration-300 ease-in-out w-4/5 shadow-md hover:bg-[#4E5C6A] hover:translate-y-[-2px]"
            >
              SUBSCRIBE
            </button>
          </div>
        </main>

        {/* Fine print */}
        <p className="mt-8 text-xs text-[#5C4B3E]/80 dark:text-[#E0C9A0]/70">
          * Referral usage limits (e.g., “one time only”) must be enforced during checkout on the server or payment provider.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPage;
