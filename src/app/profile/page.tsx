// src/app/profile/page.tsx
import nextDynamic from 'next/dynamic';

const ProfileClient = nextDynamic(() => import('@/components/profile/ProfileClient'), {
  ssr: false,
});

export default function ProfilePage() {
  return <ProfileClient />;
}

// ✅ No conflict now
export const dynamic = 'force-dynamic'; 
// (or: export const revalidate = 0;)
