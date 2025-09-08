
// src/app/reader/layout.tsx
"use client";

import { Suspense } from 'react';

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading reader...</div>}>
      {children}
    </Suspense>
  );
}
