// Do NOT add "use client" here — this is a Server Component.
// Keep all Next.js route options in this file.

import SubscriptionClient from './SubscriptionClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;               // no ISR/SSG
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export default function Page() {
  return <SubscriptionClient />;
}
