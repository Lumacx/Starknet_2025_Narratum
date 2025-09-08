
// src/app/create/scenes/layout.tsx
"use client";

import { Suspense } from 'react';

export default function ScenesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading scenes...</div>}>
      {children}
    </Suspense>
  );
}
