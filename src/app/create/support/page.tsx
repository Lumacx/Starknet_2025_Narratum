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
function isImageCategory(k: TabKey) {
  return k === 'characters' || k === 'locations';
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

  // Unified Display + AI Describe state
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [descLoading, setDescLoading] = useState<boolean>(false);
  const [descError, setDescError] = useState<string>('');
  const [copied, setCopied] = useState(false);

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

    // clear selection and describe state on tab change
    setDisplayUrl('');
    setDesc('');
    setDescError('');
    setDescLoading(false);
    setCopied(false);
  }, [active]);

  useEffect(() => {
    if (!TABS.some((t) => t.key === active)) setActive('characters');
  }, [active]);

  const activeTab = useMemo(() => TABS.find((t) => t.key === active)!, [active]);

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

  // 🔒 handler seguro para onSaved
  const handleSaved = (item: { url?: string } | undefined) => {
    const u = item?.url;
    if (!u) return;
    setDisplayUrl(u);
    setDesc('');
    setDescError('');
    setCopied(false);
  };

  async function handleDescribe() {
    setDescError(''); setDesc('');
    if (!displayUrl) { setDescError('Select or paste an image first.'); return; }
    setDescLoading(true);
    try {
      const body = displayUrl.startsWith('data:') ? { dataUrl: displayUrl } : { imageUrl: displayUrl };
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

  const handleCopy = async () => {
    if (!desc) return;
    await navigator.clipboard.writeText(desc);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
      <div className="max-w-6xl mx-auto bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-[#2A3645] dark:border-[#4B5A6B] dark:text-[#E0C9A0] rounded-xl shadow-2xl">

        {/* Overrides: texto azul en inputs/textarea blancos del uploader en dark mode */}
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

          {/* Siempre dos columnas: izquierda uploader (y, si aplica, Display+Describe); derecha My Gallery */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* LEFT column */}
            <div className="space-y-4">
              {isImageCategory(activeTab.key) && (
                <>
                  {/* Display 1:1 */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Image Display</h3>
                    <div className="relative w-full bg-white dark:bg-[#0f1620] border rounded-lg overflow-hidden aspect-square">
                      {displayUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayUrl}
                          alt="Selected"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-xs opacity-70">
                          No image selected
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Describe (única sección) */}
                  <div className="rounded-xl border-2 border-[#3D4F60] dark:border-[#4B5A6B] bg-[#F3EADF] dark:bg-[#2A3645] p-4">
                    <h3 className="font-semibold mb-2">AI Describe (Image → Prompt)</h3>
                    <div className="flex gap-2 items-center mb-2">
                      <button
                        onClick={handleDescribe}
                        disabled={descLoading || !displayUrl}
                        className="px-4 py-2 rounded bg-[#E97451] text-white disabled:opacity-50"
                      >
                        {descLoading ? 'Describing…' : 'Describe Image'}
                      </button>
                      {descError && <span className="text-red-600 text-sm">{descError}</span>}
                    </div>
                    {!!desc && (
                      <>
                        <label className="block text-sm font-bold mb-1">Description (prompt-ready)</label>
                        <textarea
                          className="w-full p-2 border rounded dark:bg-white dark:text-[#3D4F60]"
                          rows={5}
                          value={desc}
                          onChange={(e) => setDesc(e.target.value)}
                        />
                        <div className="mt-2">
                          <button
                            onClick={handleCopy}
                            className={classNames(
                              'px-3 py-1 rounded border-2 transition select-none',
                              'border-[#3D4F60] text-[#3D4F60] bg-white',
                              'hover:bg-[#EAF1F7] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#3D4F60]',
                              'dark:border-[#4B5A6B] dark:text-[#E0C9A0] dark:bg-[#2A3645] dark:hover:bg-[#334154]/60 dark:focus:ring-[#4B5A6B]'
                            )}
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Uploader (siempre) */}
              <div className="uploader-scope">
                <UploadImageReference
                  mode="uploaderOnly"
                  variant={activeTab.variant}
                  assetCategory={activeTab.key}
                  accept={acceptByTab[activeTab.key]}
                  showInnerDescribe={false} // oculto aquí
                  onOpenTemplate={() => {}}
                  onSaved={handleSaved}
                />
              </div>
            </div>

            {/* RIGHT column: Gallery (siempre) */}
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
