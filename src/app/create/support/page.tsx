// app/create/support/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UploadImageReference from '@/components/UploadImageReference';
import { ImageIcon, MapPin, User, Music, Wand2, Film, Loader2 } from 'lucide-react';

type TabKey = 'characters' | 'locations' | 'audioNarrations' | 'audioEffects' | 'videos';

const TABS: Array<{
  key: TabKey;
  label: string;
  blurb: string;
  icon: React.ComponentType<any>;
  variant: 'character' | 'location' | 'cover';
}> = [
  { key: 'characters',      label: 'Characters',      blurb: 'Reference images for your cast.', icon: User,      variant: 'character' },
  { key: 'locations',       label: 'Locations',       blurb: 'Places, worlds, scenes.',         icon: MapPin,    variant: 'location' },
  { key: 'audioNarrations', label: 'Narrations (MP3)',blurb: 'Voice lines or narration.',       icon: Music,     variant: 'cover'    },
  { key: 'audioEffects',    label: 'Sound FX (MP3)',  blurb: 'Ambient or effect sounds.',       icon: Wand2,     variant: 'cover'    },
  { key: 'videos',          label: 'Videos (MP4)',    blurb: 'Clips or motion shots.',          icon: Film,      variant: 'cover'    },
];

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

export default function SupportPage() {
  const { user, loading } = useAuth();
  console.log('Current authenticated user UID:', user?.uid); // Add this line
  const search = useSearchParams();
  const router = useRouter();

  // 1) compute initial tab from ?tab=, localStorage, or default
  const initialKey = (search.get('tab') as TabKey) ||
    (typeof window !== 'undefined' ? (localStorage.getItem('supportTab') as TabKey) : undefined) ||
    'characters';

  const [active, setActive] = useState<TabKey>(initialKey);

  // keep URL + localStorage in sync when active changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', active);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', next);
    localStorage.setItem('supportTab', active);
  }, [active]);

  // ensure active is one of TABS (fallback if a weird param was provided)
  useEffect(() => {
    if (!TABS.some(t => t.key === active)) setActive('characters');
  }, [active]);

  const activeTab = useMemo(() => TABS.find(t => t.key === active)!, [active]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] grid place-items-center">
        <div className="flex items-center gap-3 text-[#3D4F60]">
          <Loader2 className="animate-spin" />
          <span className="font-semibold">Checking your session…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0]">
        <div className="max-w-xl mx-auto bg-[#F9F6F0] border-2 border-[#3D4F60] rounded-xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-[#3D4F60] mb-2">Sign in required</h1>
          <p className="text-[#3D4F60]/80 mb-6">Please sign in to upload or view your reference gallery.</p>
          <div className="flex gap-3">
            <Link href="/login" className="px-5 py-2 rounded-md bg-[#3D4F60] text-white">Go to Login</Link>
            <button onClick={() => router.back()} className="px-5 py-2 rounded-md border-2 border-[#3D4F60] text-[#3D4F60] bg-white">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0]">
      <div className="max-w-6xl mx-auto bg-[#F9F6F0] border-2 border-[#3D4F60] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-6 border-b-2 border-[#3D4F60]/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#3D4F60]">Build References & AI Support</h1>
            <p className="text-sm text-[#3D4F60]/70">Store image, audio, and video references used across your stories.</p>
          </div>
          <div className="flex gap-3">
            <Link className="underline text-sm" href="/create/begin">← Back</Link>
            <Link className="underline text-sm" href="/create/write">Skip to Writing →</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 pt-4">
          <div
            role="tablist"
            aria-label="Reference categories"
            className="flex flex-wrap gap-2 sm:gap-3"
          >
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = active === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${key}`}
                  onClick={() => setActive(key)}
                  className={classNames(
                    'inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border transition',
                    isActive
                      ? 'bg-[#E97451] text-white border-[#E97451] shadow'
                      : 'bg-white text-[#3D4F60] border-[#3D4F60]/20 hover:border-[#3D4F60]/40'
                  )}
                >
                  <Icon size={16} />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active panel */}
        <section
          id={`panel-${activeTab.key}`}
          role="tabpanel"
          aria-labelledby={activeTab.key}
          className="p-4 sm:p-6"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 mt-1">
              {activeTab.key === 'videos' ? <Film className="text-[#3D4F60]" />
                : activeTab.key.includes('audio') ? <Music className="text-[#3D4F60]" />
                : <ImageIcon className="text-[#3D4F60]" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#3D4F60]">{activeTab.label}</h2>
              <p className="text-sm text-[#3D4F60]/80">{activeTab.blurb}</p>
            </div>
          </div>

          <div className="bg-white border border-[#3D4F60]/15 rounded-xl">
            <UploadImageReference
              variant={activeTab.variant}
              assetCategory={activeTab.key}
              // Optional callbacks:
              onOpenTemplate={() => {}}
              onSaved={() => {}}
            />
          </div>
        </section>

        {/* Footer CTAs */}
        <div className="flex justify-end gap-3 p-6 border-t-2 border-[#3D4F60]/10">
          <Link className="px-4 py-2 rounded-md border border-[#3D4F60] text-[#3D4F60] bg-white" href="/create/begin">
            ← Back
          </Link>
          <Link className="px-6 py-2 rounded-md bg-[#E97451] text-white" href="/create/scenes">
            Next: AI Story eReader →
          </Link>
        </div>
      </div>
    </div>
  );
}
