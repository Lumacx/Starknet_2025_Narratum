'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Reader() {
  const params = useSearchParams();
  const base = params.get('base'); // e.g. users/uid/stories/slug-123456789

  if (!base) return <div className="p-6">Missing reader base path.</div>;

  // Hand off to a static hosted reader (public/reader/index.html) with base param:
  const src = useMemo(() => `/reader-static/index.html?base=${encodeURIComponent(base)}`, [base]);

  return (
    <div className="w-screen h-screen">
      <iframe src={src} className="w-full h-full border-0" />
    </div>
  );
}
