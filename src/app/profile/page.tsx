// src/app/profile/page.tsx
import ProfileClient from '@/components/profile/ProfileClient';

export const dynamic = 'force-dynamic'; // or: export const revalidate = 0;

export default function ProfilePage() {
  return <ProfileClient />; // ProfileClient is "use client" so this is fine
}
