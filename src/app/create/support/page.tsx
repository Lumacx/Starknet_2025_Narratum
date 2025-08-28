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
  { key: 'characters',      label: 'Characters',       blurb: 'Reference images for your cast.', icon: User,   variant: 'character' },
  { key: 'locations',       label: 'Locations',        blurb: 'Places, worlds, scenes.',         icon: MapPin, variant: 'location' },
  { key: 'audioNarrations', label: 'Narrations (MP3)', blurb: 'Voice lines or narration.',       icon: Music,  variant: 'cover'    },
  { key: 'audioEffects',    label: 'Sound FX (MP3)',   blurb: 'Ambient or effect sounds.',       icon: Wand2,  variant: 'cover'    },
  { key: 'videos',          label: 'Videos (MP4)',     blurb: 'Clips or motion shots.',          icon: Film,   variant: 'cover'    },
];

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}
const isImageTab = (k: TabKey) => k === 'characters' || k === 'locations';

function inferKind(url?: string, contentType?: string): 'image' | 'audio' | 'video' | 'unknown' {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.startsWith('video/')) return 'video';

  const u = url || '';
  try {
    const pathname = new URL(u).pathname.toLowerCase();
    if (/\.(png|jpe?g|gif|webp)$/.test(pathname)) return 'image';
    if (/\.(mp3)$/.test(pathname)) return 'audio';
    if (/\.(mp4)$/.test(pathname)) return 'video';
  } catch {
    if (u.startsWith('data:image/')) return 'image';
    if (u.startsWith('data:audio/')) return 'audio';
    if (u.startsWith('data:video/')) return 'video';
  }
  return 'unknown';
}

export default function SupportPage() {
  const { user, loading } = useAuth();
  const search = useSearchParams();
  const router = useRouter();

  const initialKey =
    (search.get('tab') as TabKey) ||
    (typeof window !== 'undefined' ? (localStorage.getItem('supportTab') as TabKey) : undefined) ||
    'characters';

  const [active, setActive] = useState<TabKey>(initialKey);

  // Single Display Box state
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const [displayContentType, setDisplayContentType] = useState<string | undefined>(undefined);

  // Describe-selected panel state
  const [desc, setDesc] = useState('');
  const [descLoading, setDescLoading] = useState(false);
  const [descError, setDescError] = useState('');

  const acceptByTab: Record<TabKey, string | undefined> = {
    characters: 'image/png,image/jpeg',
    locations:  'image/png,image/jpeg',
    audioNarrations: 'audio/mpeg,audio/mp3',
    audioEffects:    'audio/mpeg,audio/mp3',
    videos:          'video/mp4',
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', active);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    localStorage.setItem('supportTab', active);

    // clear selection/describe on tab change to avoid cross-media confusion
    setDisplayUrl('');
    setDisplayContentType(undefined);
    setDesc('');
    setDescError('');
    setDescLoading(false);
  }, [active]);

  useEffect(() => {
    if (!TABS.some((t) => t.key === active)) setActive('characters');
  }, [active]);

  const activeTab = useMemo(() => TABS.find((t) => t.key === active)!, [active]);
  const kind = inferKind(displayUrl, displayContentType);
  const canDescribeSelected = isImageTab(activeTab.key) && kind === 'image' && !!displayUrl;

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans grid place-items-center">
        <div className="flex items-center gap-3 text-[#3D4F60] dark:text-[#E0C9A0]">
          <Loader2 className="animate-spin" />
          <span className="font-semibold">Checking your session…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
        <div className="max-w-xl mx-auto bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-[#2A3645] dark:border-[#4B5A6B] dark:text-[#E0C9A0] rounded-xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
          <p className="text-[#3A4B5C]/80 dark:text-[#E0C9A0]/80 mb-6">
            Please sign in to upload or view your reference gallery.
          </p>
          <div className="flex gap-3">
            <Link href="/login" className="px-5 py-2 rounded-md bg-[#3D4F60] text-white dark:bg-[#4B5A6B] dark:text-[#F0D1B0]">
              Go to Login
            </Link>
            <button
              onClick={() => router.back()}
              className="px-5 py-2 rounded-md border-2 border-[#3D4F60] text-[#3D4F60] bg-white dark:border-[#4B5A6B] dark:text-[#E0C9A0] dark:bg-[#2A3645]"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Single handler fed by: Upload (original), Generate (PNG data URL), or Gallery pick
  const handleSaved = (item: { url?: string; contentType?: string } | undefined) => {
    const u = item?.url;
    if (!u) return;
    setDisplayUrl(u);
    setDisplayContentType(item?.contentType);
    setDesc(''); setDescError('');
  };

  async function handleDescribeSelected() {
    if (!canDescribeSelected) return;
    setDescError(''); setDesc(''); setDescLoading(true);
    try {
      const body = displayUrl.startsWith('data:')
        ? { dataUrl: displayUrl }
        : { imageUrl: displayUrl };
      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, responseModalities: ['TEXT'] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Describe failed');
      setDesc(json.description || '');
    } catch (e: any) {
      setDescError(e?.message || 'Describe failed');
    } finally {
      setDescLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
      <div className="max-w-6xl mx-auto bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-[#2A3645] dark:border-[#4B5A6B] dark:text-[#E0C9A0] rounded-xl shadow-2xl">

        {/* Dark override for white inputs in uploader */}
        <style jsx global>{`
          .dark .uploader-scope input[type="text"],
          .dark .uploader-scope textarea {
            color: #3D4F60 !important;
            background: #ffffff !important;
          }
        `}</style>

        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-6 border-b-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Build References & AI Support</h1>
            <p className="text-sm text-[#3A4B5C]/70 dark:text-[#E0C9A0]/70">
              Store image, audio, and video references used across your stories.
            </p>
          </div>
          <div className="flex gap-3">
            <Link className="underline text-sm text-[#3D4F5C] dark:text-[#E0C9A0]" href="/create/begin">← Back</Link>
            <Link className="underline text-sm text-[#3D4F5C] dark:text-[#E0C9A0]" href="/create/scenes">Next: AI Story eReader →</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 pt-4">
          <div role="tablist" aria-label="Reference categories" className="flex flex-wrap gap-2 sm:gap-3">
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
                      : 'bg-white text-[#3D4F60] border-[#3D4F60]/20 hover:border-[#3D4F60]/40 dark:bg-[#1A2533] dark:text-[#F0D1B0] dark:border-[#4B5A6B]/20 dark:hover:border-[#4B5A6B]/40'
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
        <section id={`panel-${activeTab.key}`} role="tabpanel" aria-labelledby={activeTab.key} className="p-4 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 mt-1">
              {activeTab.key === 'videos' ? (
                <Film className="text-[#3D4F60] dark:text-[#F0D1B0]" />
              ) : activeTab.key.includes('audio') ? (
                <Music className="text-[#3D4F60] dark:text-[#F0D1B0]" />
              ) : (
                <ImageIcon className="text-[#3D4F60] dark:text-[#F0D1B0]" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">{activeTab.label}</h2>
              <p className="text-sm text-[#3A4B5C]/80 dark:text-[#E0C9A0]/80">{activeTab.blurb}</p>
            </div>
          </div>

          {/* Two columns: LEFT = Display + Describe Selected + Uploader(AI) / RIGHT = Gallery */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* LEFT column */}
            <div className="space-y-4">
              {/* Display */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Display</h3>
                <div className="relative w-full bg-white dark:bg-[#0f1620] border rounded-lg overflow-hidden aspect-square grid place-items-center">
                  {!displayUrl ? (
                    <div className="text-xs opacity-70">Nothing selected</div>
                  ) : kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayUrl} alt="Selected" className="absolute inset-0 w-full h-full object-contain" />
                  ) : kind === 'audio' ? (
                    <audio controls src={displayUrl} className="w-11/12" />
                  ) : kind === 'video' ? (
                    <video controls src={displayUrl} className="absolute inset-0 w-full h-full object-contain" />
                  ) : (
                    <div className="text-xs opacity-70">Unsupported media</div>
                  )}
                </div>
              </div>

              {/* Describe Selected (works for image tabs on whatever is in Display) */}
              {isImageTab(activeTab.key) && (
                <div className="rounded-xl border-2 border-[#3D4F60] dark:border-[#4B5A6B] bg-[#F3EADF] dark:bg-[#2A3645] p-4">
                  <h3 className="font-semibold mb-2">AI Describe — Selected Image</h3>
                  <div className="flex gap-2 items-center mb-2">
                    <button
                      onClick={handleDescribeSelected}
                      disabled={!canDescribeSelected || descLoading}
                      className="px-4 py-2 rounded bg-[#E97451] text-white disabled:opacity-50"
                    >
                      {descLoading ? 'Describing…' : 'Describe Selected'}
                    </button>
                    {descError && <span className="text-red-600 text-sm">{descError}</span>}
                    {!displayUrl && <span className="text-sm opacity-70">Pick from gallery, upload, or generate first.</span>}
                  </div>
                  {!!desc && (
                    <>
                      <label className="block text-sm font-bold mb-1">Description</label>
                      <textarea
                        className="w-full p-2 border rounded dark:bg-white dark:text-[#3D4F60]"
                        rows={5}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                      />
                      <div className="mt-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(desc)}
                          className="px-3 py-1 rounded border-2 border-[#3D4F60] text-[#3D4F60] bg-white hover:bg-[#EAF1F7] active:scale-95 dark:border-[#4B5A6B] dark:text-[#E0C9A0] dark:bg-[#2A3645] dark:hover:bg-[#334154]/60"
                        >
                          Copy
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Uploader + AI (Upload, Describe, Generate; Save to Gallery lives inside) */}
              <div className="uploader-scope">
                <UploadImageReference
                  mode="uploaderOnly"
                  variant={activeTab.variant}
                  assetCategory={activeTab.key}
                  accept={acceptByTab[activeTab.key]}
                  showInnerDescribe={true}
                  onOpenTemplate={() => {}}
                  onSaved={handleSaved}
                />
              </div>
            </div>

            {/* RIGHT column: Gallery (select feeds Display) */}
            <div className="border-2 border-[#3D4F60] dark:border-[#4B5A6B] rounded-xl p-3 bg-white/60 dark:bg-transparent">
              <h4 className="font-semibold mb-3">My Gallery — <span className="opacity-80">{activeTab.label}</span></h4>
              <UploadImageReference
                mode="galleryOnly"
                variant={activeTab.variant}
                assetCategory={activeTab.key}
                onSaved={handleSaved}
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t-2 border-[#3D4F5]/10 dark:border-[#4B5A6B]/20">
          <Link
            className="px-4 py-2 rounded-md border border-[#3D4F60] text-[#3D4F60] bg-white dark:border-[#4B5A6B] dark:text-[#E0C9A0] dark:bg-[#2A3645]"
            href="/create/begin"
          >
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
