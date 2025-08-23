'use client';

import React from 'react';
import Link from 'next/link';
import UploadImageReference from '@/components/UploadImageReference';

export default function SupportPage() {
  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0]">
      <div className="max-w-6xl mx-auto bg-[#F9F6F0] border-2 border-[#3D4F60] rounded-xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#3D4F60]">Build References & AI Support</h1>
          <div className="flex gap-3">
            <Link className="underline text-sm" href="/create/begin">← Back</Link>
            <Link className="underline text-sm" href="/create/write">Skip to Writing →</Link>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2 text-[#3D4F60]">Character References</h2>
        <UploadImageReference
          variant="character"
          assetCategory="characters"
          onOpenTemplate={() => {/* open Character template modal if you like */}}
        />

        <div className="h-8" />

        <h2 className="text-xl font-bold mb-2 text-[#3D4F60]">Location References</h2>
        <UploadImageReference
          variant="location"
          assetCategory="locations"
          onOpenTemplate={() => {/* open Location template modal */}}
        />

        <div className="flex justify-end gap-3 mt-8">
          <Link className="px-6 py-2 rounded-md bg-[#E97451] text-white" href="/create/scenes">
            Next: AI Story eReader →
          </Link>
        </div>
      </div>
    </div>
  );
}
