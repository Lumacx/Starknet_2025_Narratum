// src/app/create/support/page.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UploadImageReference from '@/components/UploadImageReference';
import { ImageIcon, MapPin, User, Music, Wand2, Film, Loader2 } from 'lucide-react';

// 🔹 Firestore (para leer contexto de la historia)
import { db } from '@/lib/firebase';
import { doc as fsDoc, getDoc } from 'firebase/firestore';

import InfoPopover from '@/components/InfoPopover';

/* --- LOGIC MOVED HERE from UploadImageReference --- */
function extractImageAndModel(json: any): { dataUrl?: string; modelUsed?: string } {
  if (Array.isArray(json?.images) && json.images.length) {
    const first = json.images[0];
    const dataUrl = typeof first === 'string' ? (first.startsWith('data:') ? first : `data:image/png;base64,${first}`) : undefined;
    return { dataUrl, modelUsed: json.modelUsed || json.model || json.modelName };
  }
  if (typeof json?.imageBase64 === 'string') {
    return {
      dataUrl: `data:image/png;base64,${json.imageBase64}`,
      modelUsed: json.modelUsed || json.model,
    };
  }
  return {};
}

function genreDescriptors(genres: string[] = []): string[] {
  const g = genres.map(s => s.toLowerCase().trim());
  const out: string[] = [];
  if (g.includes('fantasy')) out.push('mythic, magical realism, ornate details, ethereal glow');
  if (g.includes('sci-fi') || g.includes('science fiction')) out.push('futuristic, sleek materials, volumetric light, high contrast');
  if (g.includes('mystery')) out.push('moody, chiaroscuro, suspenseful framing');
  if (g.includes('horror')) out.push('ominous, high shadow depth, desaturated tones');
  if (g.includes('romance')) out.push('warm palette, soft bokeh, intimate framing');
  if (g.includes('adventure')) out.push('dynamic angle, epic scale, dramatic skies');
  if (g.includes("children's")) out.push('whimsical, friendly shapes, bright but harmonious colors');
  if (g.includes('comedy')) out.push('playful, lighthearted expressions, lively composition');
  if (g.includes('drama')) out.push('cinematic lighting, emotive atmosphere');
  if (g.includes('action')) out.push('kinetic energy, sense of motion, bold contrasts');
  return out;
}

function composePromptForImagen(
  userPrompt: string,
  ctx?: { title?: string; genres?: string[]; synopsis?: string; language?: string }
) {
  const lines: string[] = [];
  lines.push(`Use ${ctx?.language || 'English'} to interpret all descriptive concepts. Do not render any textual characters in the image.`);
  lines.push('Create a professional, illustration-style image (no text). Use a single striking composition with a clear focal subject, cinematic lighting, and a cohesive palette.');
  if (ctx?.synopsis) lines.push(`PRIMARY GUIDANCE (Story Synopsis — highest priority): ${ctx.synopsis}`);
  if (ctx?.genres?.length) {
    const desc = genreDescriptors(ctx.genres);
    lines.push(`SECONDARY GUIDANCE (Genre atmosphere): ${ctx.genres.join(', ')}.` + (desc.length ? ` Visual tone cues: ${desc.join('; ')}.` : ''));
  }
  if (userPrompt) lines.push(`TERTIARY GUIDANCE (Additional creative direction): ${userPrompt}`);
  if (ctx?.title) lines.push(`LIGHT INFLUENCE (Title motif — do NOT add text): ${ctx.title}. Use it only as thematic inspiration.`);
  const negativesBase = 'text, watermark, logo, low-res, blurry, jpeg artifacts, malformed anatomy, extra limbs, cropped face';
  return { prompt: lines.join('\n'), negativePrompt: negativesBase };
}
/* --- END OF MOVED LOGIC --- */

/* -------------------------------- Types ------------------------------- */
type TabKey = 'characters' | 'locations' | 'audioNarrations' | 'audioEffects' | 'videos';

const TABS: Array<{
  key: TabKey;
  label: string;
  blurb: string;
  icon: React.ComponentType<any>;
  variant: 'character' | 'location' | 'cover';
}> = [
  { key: 'characters',      label: 'Characters',        blurb: 'Reference images for your cast.', icon: User,   variant: 'character' },
  { key: 'locations',       label: 'Locations',         blurb: 'Places, worlds, scenes.',         icon: MapPin, variant: 'location' },
  { key: 'audioNarrations', label: 'Narrations (MP3)',  blurb: 'Voice lines or narration.',       icon: Music,  variant: 'cover'     },
  { key: 'audioEffects',    label: 'Sound FX (MP3)',    blurb: 'Ambient or effect sounds.',       icon: Wand2,  variant: 'cover'     },
  { key: 'videos',          label: 'Videos (MP4)',      blurb: 'Clips or motion shots.',          icon: Film,   variant: 'cover'     },
];

type LangCode =
  | 'en' | 'es' | 'pt' | 'fr' | 'de'
  | 'it' | 'ja' | 'ko' | 'zh' | 'hi' | 'ar';

type PromptContext = {
  title: string;
  genres: string[];
  synopsis: string;
  language: LangCode;
};

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German',
  it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic',
};

const DRAFT_KEY = 'newStoryDraft';

/* ------------------------------ Utils -------------------------------- */
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

/* ============================== Component ============================== */
export default function SupportPage() {
  const { user, loading } = useAuth();
  const search = useSearchParams();
  const router = useRouter();

  const storyId = search.get('storyId') || undefined;
  const [context, setContext] = useState<PromptContext>({ title: '', genres: [], synopsis: '', language: 'en' });
  const langLabel = LANG_LABELS[context.language] || 'English';

  useEffect(() => {
    (async () => {
      if (!user || !storyId) return;
      try {
        const ref = fsDoc(db, 'stories', storyId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const s = snap.data() as any;

        let langFromDoc = s?.language as LangCode | undefined;
        if (!langFromDoc) {
          try {
            const raw = localStorage.getItem(DRAFT_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            langFromDoc = (parsed?.language as LangCode) || 'en';
          } catch {}
        }

        setContext((prev) => ({ ...prev, title: s?.title || prev.title, genres: Array.isArray(s?.genres) ? s.genres : prev.genres, synopsis: s?.synopsis || prev.synopsis, language: (langFromDoc || prev.language) as LangCode }));
      } catch (e) { console.error('Failed to fetch story for context', e); }
    })();
  }, [user, storyId]);

  const initialKey = (search.get('tab') as TabKey) || (typeof window !== 'undefined' ? (localStorage.getItem('supportTab') as TabKey) : undefined) || 'characters';
  const [active, setActive] = useState<TabKey>(initialKey);
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const [displayContentType, setDisplayContentType] = useState<string | undefined>(undefined);
  const [desc, setDesc] = useState('');
  const [descLoading, setDescLoading] = useState(false);
  const [descError, setDescError] = useState('');
  
  // ▼▼ NEW STATE for image combination ▼▼
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]); // URLs of selected characters
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]); // URLs of selected locations
  const [composerPrompt, setComposerPrompt] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  // ▼▼ NEW: Add state for the model flag ▼▼
  const [lastModelUsed, setLastModelUsed] = useState<string>('');
  // ▲▲ END NEW STATE ▲▲

  // NEW state for managing generation logic which now lives here
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrlForChild, setGeneratedImageUrlForChild] = useState('');

  const acceptByTab: Record<TabKey, string | undefined> = { characters: 'image/png,image/jpeg', locations:  'image/png,image/jpeg', audioNarrations: 'audio/mpeg,audio/mp3', audioEffects:    'audio/mpeg,audio/mp3', videos:          'video/mp4' };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', active);
    if (storyId) params.set('storyId', storyId);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);

    localStorage.setItem('supportTab', active);
    setDisplayUrl('');
    setDisplayContentType(undefined);
    setDesc('');
    setDescError('');
    setDescLoading(false);
    setGeneratedImageUrlForChild(''); // Also reset the generated image
    setLastModelUsed(''); // <-- ADD THIS LINE
  }, [active, storyId]);

  useEffect(() => { if (!TABS.some((t) => t.key === active)) setActive('characters'); }, [active]);

  const activeTab = useMemo(() => TABS.find((t) => t.key === active)!, [active]);
  const kind = inferKind(displayUrl, displayContentType);
  const canDescribeSelected = isImageTab(activeTab.key) && kind === 'image' && !!displayUrl;
  const memoizedPromptContext = useMemo(() => ({ title: context.title, genres: context.genres, synopsis: context.synopsis, language: context.language }), [context.title, context.genres, context.synopsis, context.language]);

  const handleSaved = useCallback((item: { url?: string; contentType?: string } | undefined) => {
    const u = item?.url;
    if (!u) return;
    setDisplayUrl(u);
    setDisplayContentType(item?.contentType);
    setDesc('');
    setDescError('');
  }, []);

  const handleGenerateRequest = async (userPrompt: string) => {
    if (!userPrompt.trim()) {
      alert('Please enter a description to generate an image.');
      return;
    }
    setIsGenerating(true);
    setGeneratedImageUrlForChild('');
    try {
      const { prompt, negativePrompt } = composePromptForImagen(userPrompt, memoizedPromptContext);
      const res = await fetch('/api/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, negativePrompt, count: 1 }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'AI image generation failed');

       // MODIFIED: Capture modelUsed here
      const { dataUrl, modelUsed } = extractImageAndModel(json);
      setLastModelUsed(modelUsed || 'Unknown'); // <-- ADD THIS LINE

      if (!dataUrl) throw new Error('No image was returned by the generator.');
      setGeneratedImageUrlForChild(dataUrl);
      handleSaved({ url: dataUrl, contentType: 'image/png' });
    } catch (e: any) { alert(e?.message || 'Image generation error'); } 
    finally { setIsGenerating(false); }
  };

  async function handleDescribeSelected() {
    if (!canDescribeSelected) return;
    setDescError('');
    setDesc('');
    setDescLoading(true);
    try {
      const body = displayUrl.startsWith('data:') ? { dataUrl: displayUrl } : { imageUrl: displayUrl };
      const lang = (context.language || 'en') as LangCode;
      const langLabel = LANG_LABELS[lang] || 'English';
      const promptText = lang === 'es' ? 'Describe esta imagen en un solo párrafo claro y conciso...' : `Describe this image in one clear, concise paragraph... Respond only in ${langLabel}.`;
     
      const res = await fetch('/api/describe-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, prompt: promptText, language: lang, targetLanguage: lang, context: { title: context.title, genres: context.genres, synopsis: context.synopsis, }, responseModalities: ['TEXT'], }), });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Describe failed');
      setDesc(json.description || '');
    } catch (e: any) { setDescError(e?.message || 'Describe failed'); } 
    finally { setDescLoading(false); }
  }

    const handleSceneGeneration = async () => {
      if (!composerPrompt.trim() || (selectedCharacters.length === 0 && selectedLocations.length === 0)) {
          alert('Please select at least one image and provide a prompt.');
          return;
      }
      setIsComposing(true);
      setGeneratedImageUrlForChild(''); // Clear previous generation

      try {
          const imagesToCombine = [...selectedCharacters, ...selectedLocations];

          // The API now expects an 'images' array of data URLs
          const res = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  prompt: composerPrompt,
                  images: imagesToCombine, // Send the array of selected image URLs
              }),
          });
          
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error || 'AI scene generation failed');

          // MODIFIED: Capture modelUsed here
          const { dataUrl, modelUsed } = extractImageAndModel(json);
          setLastModelUsed(modelUsed || 'Unknown'); // <-- ADD THIS LINE

          if (!dataUrl) throw new Error('No image was returned by the generator.');

          console.log(`Scene generated with model: ${modelUsed}`);
          setGeneratedImageUrlForChild(dataUrl); // This will pass it to the uploader component
          handleSaved({ url: dataUrl, contentType: 'image/png' }); // This will update the main display
          
          // Clear the composer after success
          setSelectedCharacters([]);
          setSelectedLocations([]);
          setComposerPrompt('');

      } catch (e: any) {
          alert(e?.message || 'Scene generation error');
      } finally {
          setIsComposing(false);
      }
  };

   // Decide which doc to show for the #1 icon based on the active tab
   const tipDocForOne =
   active === 'locations'
     ? '/info_tips/Location Generation Template.md'
     : '/info_tips/Character Creation template.md';

    // #2 is the same for both tabs
    const tipDocForTwo = '/info_tips/Pro Tips for Prompting Images.md';

  if (loading) { return ( <div className="min-h-screen grid place-items-center"><div className="flex items-center gap-3"><Loader2 className="animate-spin" /><span>Checking your session…</span></div></div> ); }
  if (!user) { return ( <div className="min-h-screen p-6"><div className="max-w-xl mx-auto bg-[#F3EADF] rounded-xl p-8"><h1 className="text-2xl font-bold mb-2">Sign in required</h1><p className="mb-6">Please sign in to upload or view your reference gallery.</p><div className="flex gap-3"><Link href="/login" className="px-5 py-2 rounded-md bg-[#3D4F60] text-white">Go to Login</Link><button onClick={() => router.back()} className="px-5 py-2 rounded-md border-2">← Back</button></div></div></div> ); }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[#D4E1EE] to-[#F0D1B0] dark:from-[#1A2533] dark:to-[#3A2B26] text-[#3A4B5C] dark:text-[#E0C9A0] font-sans">
      <div className="max-w-6xl mx-auto bg-[#F3EADF] border-2 border-[#CBBBA0] text-[#3A4B5C] dark:bg-[#2A3645] dark:border-[#4B5A6B] dark:text-[#E0C9A0] rounded-xl shadow-2xl">
        <style jsx global>{`.dark .uploader-scope input[type="text"], .dark .uploader-scope textarea { color: #3D4F60 !important; background: #ffffff !important; }`}</style>
        
        {/* --- HEADER --- */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-6 border-b-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Build References & AI Support</h1>
            <p className="text-sm text-[#3A4B5C]/70 dark:text-[#E0C9A0]/70">Store image, audio, and video references used across your stories.</p>
            <p className="text-xs mt-1 text-[#3A4B5C]/60 dark:text-[#E0C9A0]/60">AI language: <strong>{langLabel}</strong>{context.title ? ` • Context: ${context.title}` : ''}</p>
          </div>
          <div className="flex gap-3">
            <Link className="underline text-sm" href="/create/begin">← Back</Link>
            <Link className="underline text-sm" href="/create/scenes">Next: AI Story eReader →</Link>
          </div>
        </div>
        
         {/* --- TABS --- */}
         <div className="px-4 sm:px-6 pt-4">
          <div role="tablist" aria-label="Reference categories" className="flex flex-wrap gap-2 sm:gap-3">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={active === key}
                onClick={() => setActive(key)}
                className={classNames(
                  'inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border transition',
                  active === key
                    ? 'bg-[#E97451] text-white border-[#E97451] shadow'
                    : 'bg-white text-[#3D4F60] border-[#3D4F60]/20 hover:border-[#3D4F60]/40 dark:bg-[#1A2533] dark:text-[#F0D1B0] dark:border-[#4B5A6B]/20 dark:hover:border-[#4B5A6B]/40'
                )}
              >
                <Icon size={16} />
                <span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* ===================== MAIN CONTENT SECTION ============================ */}
        {/* ======================================================================= */}
        <section id={`panel-${activeTab.key}`} role="tabpanel" className="p-4 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 mt-1">{React.createElement(activeTab.icon, { className: "text-[#3D4F60] dark:text-[#F0D1B0]" })}</div>
            <div>
              <h2 className="text-lg font-bold">{activeTab.label}</h2>
              <p className="text-sm text-[#3A4B5C]/80 dark:text-[#E0C9A0]/80">{activeTab.blurb}</p>
            </div>
          </div>
          
          {/* --- CORRECTED TWO-COLUMN LAYOUT GRID --- */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* ---------------------------------------------------------------- */}
            {/* ------------------------- LEFT COLUMN -------------------------- */}
            {/* ---------------------------------------------------------------- */}
            <div className="flex flex-col gap-6">
            
              {/* --- 1. DISPLAY COMPONENT --- */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Display</h3>
                <div className="relative w-full bg-white dark:bg-[#0f1620] border rounded-lg overflow-hidden aspect-square grid place-items-center">
                  {!displayUrl ? <div className="text-xs opacity-70">Nothing selected</div>
                  : kind === 'image' ? <img src={displayUrl} alt="Selected" className="absolute inset-0 w-full h-full object-contain" />
                  : kind === 'audio' ? <audio controls src={displayUrl} className="w-11/12" />
                  : kind === 'video' ? <video controls src={displayUrl} className="absolute inset-0 w-full h-full object-contain" />
                  : <div className="text-xs opacity-70">Unsupported media</div>}
                  
                  {displayUrl && lastModelUsed && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-mono rounded-md px-2 py-1 backdrop-blur-sm shadow-lg">
                      Model: {lastModelUsed}
                    </div>
                  )}
                </div>
              </div>

              {/* --- 2. AI DESCRIBE COMPONENT --- */}
              {isImageTab(activeTab.key) && (
                <div className="rounded-xl border-2 border-[#3D4F60] dark:border-[#4B5A6B] bg-[#F3EADF] dark:bg-[#2A3645] p-4">
                  <h3 className="font-semibold mb-2">AI Describe — Selected Image</h3>
                  <div className="flex gap-2 items-center mb-2">
                    <button onClick={handleDescribeSelected} disabled={!canDescribeSelected || descLoading} className="px-4 py-2 rounded bg-[#E97451] text-white disabled:opacity-50">
                      {descLoading ? 'Describing…' : 'Describe Selected'}
                    </button>
                    {descError && <span className="text-red-600 text-sm">{descError}</span>}
                    {!displayUrl && <span className="text-sm opacity-70">Pick from gallery, upload, or generate first.</span>}
                  </div>
                  {!!desc && (
                    <>
                      <label className="block text-sm font-bold mb-1">Description</label>
                      <textarea className="w-full p-2 border rounded dark:bg-white dark:text-[#3D4F60]" rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} />
                      <div className="mt-2">
                        <button onClick={() => navigator.clipboard.writeText(desc)} className="px-3 py-1 rounded border-2 border-[#3D4F60] text-[#3D4F60] bg-white hover:bg-[#EAF1F7] active:scale-95 dark:border-[#4B5A6B] dark:text-[#E0C9A0] dark:bg-[#2A3645] dark:hover:bg-[#334154]/60">Copy</button>
                      </div>
                    </>
                  )}
                </div>
              )}
              
               {/* --- 3. UPLOAD / GENERATE COMPONENT --- */}
              <div className="uploader-scope">
                <div className="flex items-center gap-3 text-xs mb-2">
                  <span className="opacity-70">Generation Tips:</span>
                  <div className="inline-flex items-center gap-1">
                    <span className="opacity-60">#1</span>
                    {/* Centered modal popovers; fresh markdown fetch */}
                    <InfoPopover
                      title={active === 'locations' ? 'Location Template' : 'Character Template'}
                      docHref={active === 'locations'
                        ? '/info_tips/Location Generation Template.md'
                        : '/info_tips/Character Creation template.md'}
                      noCache
                    />
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <span className="opacity-60">#2</span>
                    <InfoPopover
                      title="Pro Tips for Prompting Images"
                      docHref="/info_tips/Pro Tips for Prompting Images.md"
                      noCache
                    />
                  </div>
                </div>
                <UploadImageReference
                  mode="uploaderOnly"
                  variant={activeTab.variant}
                  assetCategory={activeTab.key}
                  accept={acceptByTab[activeTab.key]}
                  showInnerDescribe={false} // Describe is now a separate component
                  onSaved={handleSaved}
                  onGenerateRequest={handleGenerateRequest}
                  isGenerating={isGenerating}
                  generatedImageUrl={generatedImageUrlForChild}
                />
              </div>
            </div>
            
            {/* ----------------------------------------------------------------- */}
            {/* ------------------------- RIGHT COLUMN -------------------------- */}
            {/* ----------------------------------------------------------------- */}
            <div className="flex flex-col gap-6">

              {/* --- 4. AI SCENE COMPOSER --- */}
              {isImageTab(activeTab.key) && (
                <div className="border-2 border-dashed border-[#E97451] rounded-xl p-4 bg-[#F3EADF] dark:bg-[#2A3645]">
                  <h3 className="font-semibold mb-3 text-lg">AI Scene Composer</h3>
                  
                  {selectedCharacters.length === 0 && selectedLocations.length === 0 ? (
                     <p className="text-sm text-gray-500">Select images from your gallery below to begin combining them.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[...selectedCharacters, ...selectedLocations].map(url => (
                          <img key={url} src={url} className="w-16 h-16 rounded object-cover border" alt="Selected Asset" />
                        ))}
                      </div>
                      <textarea
                        className="w-full p-2 border rounded dark:bg-white dark:text-[#3D4F60]"
                        rows={3}
                        placeholder="e.g., Make the character stand in front of the castle at sunset..."
                        value={composerPrompt}
                        onChange={(e) => setComposerPrompt(e.target.value)}
                      />
                      <div className="flex items-center gap-4 mt-2">
                        <button onClick={handleSceneGeneration} disabled={isComposing || !composerPrompt.trim()} className="px-4 py-2 rounded bg-[#E97451] text-white disabled:opacity-50 flex items-center gap-2">
                          {isComposing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                          {isComposing ? 'Generating...' : 'Generate Scene'}
                        </button>
                        <button onClick={() => { setSelectedCharacters([]); setSelectedLocations([]); setComposerPrompt(''); }} className="text-xs underline">
                          Clear Selection
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* --- 5. MY GALLERY --- */}
              <div className="border-2 border-[#3D4F60] dark:border-[#4B5A6B] rounded-xl p-3 bg-white/60 dark:bg-transparent">
                <h4 className="font-semibold mb-3">My Gallery — <span className="opacity-80">{activeTab.label}</span></h4>
                {isImageTab(activeTab.key) && <p className="text-xs text-gray-500 mb-2">Select up to 3 characters and 2 locations to combine them.</p>}
                {/* @ts-ignore */}
                <UploadImageReference
                  mode="galleryOnly"
                  variant={activeTab.variant}
                  assetCategory={activeTab.key}
                  onSaved={handleSaved}
                  selection={activeTab.key === 'characters' ? selectedCharacters : selectedLocations}
                  onSelectionChange={activeTab.key === 'characters' ? setSelectedCharacters : setSelectedLocations}
                  maxSelection={activeTab.key === 'characters' ? 3 : 2}
                />
              </div>

            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <div className="flex justify-end gap-3 p-6 border-t-2 border-[#3D4F60]/10 dark:border-[#4B5A6B]/20">
          <Link className="px-4 py-2 rounded-md border border-[#3D4F60] text-[#3D4F60] bg-white dark:border-[#4B5A6B] dark:text-[#E0C9A0] dark:bg-[#2A3645]" href="/create/begin">
            ← Back
          </Link>
          <Link className="px-6 py-2 rounded-md bg-[#E97451] text-white" href={storyId ? `/create/scenes?storyId=${storyId}` : '/create/scenes'}>
            Next: AI Story eReader →
          </Link>
        </div>
        
      </div>
    </div>
  );
}