
// src/app/create/support/layout.tsx
"use client";

import { Suspense } from 'react';

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading support content...</div>}>
      {children}
    </Suspense>
  );
}
