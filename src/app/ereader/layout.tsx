
// src/app/ereader/layout.tsx
"use client";

import { Suspense } from 'react';

export default function EReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading e-reader...</div>}>
      {children}
    </Suspense>
  );
}
