// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login'); // Redirect to the login page
  }, [router]);

  return (
    // Optional: You can add a loading spinner or a simple message here
    // while the redirect happens, though it should be very quick.
    <main>
      <p>Loading...</p>
    </main>
  );
}
