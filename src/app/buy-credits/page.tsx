// Server wrapper to control caching/prerendering for the buy-credits page.
// Do NOT place "use client" in this file.

import BuyCreditsClient from './BuyCreditsClient';

// Prevent static prerender (SSG) and disable caching so PayPal/client-only code runs at runtime.
export const dynamic = 'force-dynamic';
export const revalidate = 0;                // number | false — 0 disables ISR
export const fetchCache = 'force-no-store'; // ensure no fetch caching for this route
// If you intentionally run on Edge, you can switch to 'edge'. Node is safest for most SDKs:
export const runtime = 'nodejs';

export default function Page() {
  return <BuyCreditsClient />;
}
