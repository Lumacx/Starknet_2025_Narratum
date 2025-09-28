//src/app/create/begin/page.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import GenreMultiSelect from '@/components/GenreMultiSelect';
import CoverImageManager from '@/components/CoverImageManager';

import { useAuth } from '@/context/AuthContext';
import { app, db, storage } from '@/lib/firebase'; // ensure `app` is exported
import {
  serverTimestamp,
  updateDoc,
  doc as fsDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { useCreateStory } from '@/hooks/useCreateStory';
import { uploadCoverToStory } from '@/lib/uploadCover';

/* 🔗 Cloud Functions (credits) */
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

/* 🌐 i18n */
import { useLocale } from '@/context/LocaleContext';

//export const dynamic = 'force-dynamic';
//export const revalidate = 0;

/* ------------------------------------------------------------------ */
/* Page constants & types                                              */
/* ------------------------------------------------------------------ */
const GENRES = [
  'Fantasy','Sci-Fi','Mystery','Horror','Romance','Adventure',"Children's",
  'Comedy','Drama','Action','Other',
] as const;

const CATEGORIES = [
  { key: 'short',    min: 1, max: 10 },
  { key: 'novela',   min: 5, max: 20 },
  { key: 'campaign', min: 1, max: 20 },
] as const;

const LANGUAGES = [
  { code: 'en', labelKey: 'langEnglish' },
  { code: 'es', labelKey: 'langSpanish' },
  { code: 'pt', labelKey: 'langPortuguese' },
  { code: 'fr', labelKey: 'langFrench' },
  { code: 'de', labelKey: 'langGerman' },
  { code: 'it', labelKey: 'langItalian' },
  { code: 'ja', labelKey: 'langJapanese' },
  { code: 'ko', labelKey: 'langKorean' },
  { code: 'zh', labelKey: 'langChinese' },
  { code: 'hi', labelKey: 'langHindi' },
  { code: 'ar', labelKey: 'langArabic' },
] as const;

type LangCode = typeof LANGUAGES[number]['code'];

type Draft = {
  storyId?: string;
  title: string;
  genres: string[];
  synopsis: string;
  category: typeof CATEGORIES[number]['key'];
  pages: number;
  coverUrl?: string | null;
  language: LangCode;
  campaignName?: string;

  scenes?: Array<{
    text: string;
    imagePrompt: string;
    imageDescription?: string;
    imageUrl?: string | null;
    audioUrl?: string | null;
  }>;

  reader?: {
    avatarUrl?: string;
    backgroundUrl?: string;
  };

  premium?: {
    convaiAgentId?: string;
    teaserVideoUrl?: string;
    freeNavigationIndex?: boolean;
  };
};

type StorySummary = {
  id: string;
  title: string;
  synopsis: string;
  genres: string[];
  category: Draft['category'];
  pageCount: number;
  coverImageUrl: string | null;
  updatedAt?: any;
};

const DRAFT_KEY = 'newStoryDraft';
const DEFAULTS = {
  avatarUrl: '/story_reader_avatars/Default.png',
  backgroundUrl: '/story_reader_backgrounds/dream-background.png',
};

/* ⭐ UI hint for costs (server is source of truth) */
const CREATION_CREDIT_COSTS: Record<Draft['category'], number> = {
  short: 5,
  novela: 10,
  campaign: 15,
};
function getCreationCreditCost(category: Draft['category']): number {
  return CREATION_CREDIT_COSTS[category];
}

/* Server storyType used by the callable */
type ServerStoryType = 'basic' | 'premium' | 'convai';
function categoryToStoryType(cat: Draft['category']): ServerStoryType {
  if (cat === 'short') return 'basic';
  if (cat === 'novela') return 'premium';
  return 'convai'; // campaign
}

/* Helpers */
function isHttpUrl(u?: string | null) {
  return !!u && (u.startsWith('http://') || u.startsWith('https://'));
}
function clampPagesForCategory(catKey: Draft['category'], pages: number) {
  const cfg = CATEGORIES.find(c => c.key === catKey)!;
  const n = Math.floor(Number.isFinite(pages as any) ? pages : cfg.min);
  return Math.max(cfg.min, Math.min(cfg.max, n));
}

// ----- premium payload builder (draft-safe) -----
function buildPremiumPayloadFromDraft(d: any) {
  const p = (d?.premium ?? {}) as any;

  const convai = (p.convaiAgentId ?? d?.convaiAgentId ?? '').trim?.() ?? '';
  const teaser = (p.teaserVideoUrl ?? d?.teaserVideoUrl ?? '').trim?.() ?? '';
  const freeIdx =
    typeof p.freeNavigationIndex === 'boolean'
      ? p.freeNavigationIndex
      : typeof d?.freeNavigationIndex === 'boolean'
      ? d.freeNavigationIndex
      : undefined;

  const out: any = {};
  if (convai) out.convaiAgentId = convai;
  if (teaser) out.teaserVideoUrl = teaser;
  if (typeof freeIdx === 'boolean') out.freeNavigationIndex = freeIdx;

  return Object.keys(out).length ? { premium: out } : {};
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function BeginPage() {
  const router = useRouter();
  const { t } = useLocale();

  // simple {placeholder} interpolation
  const tr = React.useCallback(
    (key: string, vars?: Record<string, any>) => {
      let s = t(key) as string;
      if (!vars) return s;
      return s.replace(/\{(\w+)\}/g, (_, m) =>
        vars[m] !== undefined && vars[m] !== null ? String(vars[m]) : `{${m}}`
      );
    },
    [t]
  );

  /* 🔄 credits from Auth */
  const { user, credits: userCredits } = useAuth();
  const createStory = useCreateStory();

  /* 🔗 Callable types & instances (scoped to region) */
  type CreateReq = { storyType: ServerStoryType };
  type CreateRes = { success: boolean; message: string; remainingCredits: number };

  const functions = useMemo(() => {
    const f = getFunctions(app, 'us-central1');
    if (typeof window !== 'undefined' && location.hostname === 'localhost') {
      try { connectFunctionsEmulator(f, '127.0.0.1', 5001); } catch {}
    }
    return f;
  }, []);
  
  const deductCreditsForCreation = useMemo(
    () => httpsCallable<CreateReq, CreateRes>(functions, 'deductCreditsForCreation'),
    [functions]
  );
  

  /* ---------------- Draft state ---------------- */
  const [draft, setDraft] = useState<Draft>({
    title: '',
    genres: [],
    synopsis: '',
    category: 'short',
    pages: 3,
    coverUrl: undefined,
    storyId: undefined,
    language: 'en',
    campaignName: '',
    reader: { avatarUrl: DEFAULTS.avatarUrl, backgroundUrl: DEFAULTS.backgroundUrl },
    premium: { convaiAgentId: '', teaserVideoUrl: '', freeNavigationIndex: false },
  });

  const [showPremium, setShowPremium] = useState<boolean>(false);

  /* ---------------- Story Mode (New / Continue) ---------------- */
  const [storyMode, setStoryMode] = useState<'new' | 'continue'>('new');
  const [existingStoryId, setExistingStoryId] = useState<string>('');

  /* ---------------- Visibility for Book Cover block ---------------- */
  const [showCover, setShowCover] = useState<boolean>(false);

  /* ---------------- Story list for Continue ---------------- */
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesLast, setStoriesLast] = useState<QueryDocumentSnapshot | null>(null);
  const isFetchingStoriesRef = useRef(false);

  // Order
  const [sortKey, setSortKey] = useState<'updatedAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  /* ---------------- Buttons/progress ---------------- */
  const [starting, setStarting] = useState(false);
  const [jumpingScenes, setJumpingScenes] = useState(false);

  /* ---------------- AI Describe state ---------------- */
  const [descLoading, setDescLoading] = useState(false);
  const [descText, setDescText] = useState<string>('');
  const [descError, setDescError] = useState<string>('');

  /* ---------------- Load draft from localStorage ---------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDraft((d) => ({
          ...d,
          ...parsed,
          reader: {
            avatarUrl: parsed?.reader?.avatarUrl || DEFAULTS.avatarUrl,
            backgroundUrl: parsed?.reader?.backgroundUrl || DEFAULTS.backgroundUrl,
          },
          premium: {
            convaiAgentId: parsed?.premium?.convaiAgentId || '',
            teaserVideoUrl: parsed?.premium?.teaserVideoUrl || '',
            freeNavigationIndex: !!parsed?.premium?.freeNavigationIndex,
          },
          language: parsed?.language || 'en',
          campaignName: parsed?.campaignName || '',
        }));
        setShowCover(Boolean(parsed?.storyId));
      } else {
        setDraft((d) => ({
          ...d,
          scenes: Array.from({ length: d.pages }, () => ({
            text: '',
            imagePrompt: '',
            imageDescription: '',
            imageUrl: null,
            audioUrl: null,
          })),
        }));
      }
    } catch {}
  }, []);

  /* ---------------- Keep scenes length in sync ---------------- */
  useEffect(() => {
    setDraft((d) => {
      const target = clampPagesForCategory(d.category, d.pages);
      const cur = d.scenes?.length ?? 0;
      if (cur === target) return d;
      const next = d.scenes ? [...d.scenes] : [];
      if (target > cur) {
        for (let i = 0; i < target - cur; i++) {
          next.push({ text: '', imagePrompt: '', imageDescription: '', imageUrl: null, audioUrl: null });
        }
      } else {
        next.length = target;
      }
      return { ...d, pages: target, scenes: next };
    });
  }, [draft.pages, draft.category]);

  /* ---------------- Persist draft (localStorage) ---------------- */
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [draft]);

  const cat = useMemo(() => CATEGORIES.find((c) => c.key === draft.category)!, [draft.category]);
  const isLongForm = draft.category === 'novela' || draft.category === 'campaign';

  /* ---------------- Fetch user's stories for Continue ---------------- */
  const fetchStoriesPage = useCallback(async (after?: QueryDocumentSnapshot) => {
    if (!user) return;
    if (isFetchingStoriesRef.current) return;
    isFetchingStoriesRef.current = true;
    setStoriesLoading(true);

    try {
      const secondaryDir = sortOrder;
      const base: any[] = [
        where('ownerUid', '==', user.uid),
        orderBy(sortKey, sortOrder),
        orderBy('__name__', secondaryDir),
        limit(50),
      ];

      const qy = after
        ? query(collection(db, 'stories'), ...base, startAfter(after))
        : query(collection(db, 'stories'), ...base);

      const snap = await getDocs(qy);
      const page: StorySummary[] = snap.docs.map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          title: d?.title || '(untitled)',
          synopsis: d?.synopsis || '',
          genres: d?.genres || [],
          category: (d?.category || 'short') as Draft['category'],
          pageCount: d?.pageCount || 1,
          coverImageUrl: d?.coverImageUrl ?? null,
          updatedAt: d?.updatedAt,
        };
      });

      setStories((prev) => (after ? [...prev, ...page] : page));
      setStoriesLast(snap.docs.at(-1) ?? null);
    } catch (e) {
      console.error('Failed to load stories for user', e);
    } finally {
      setStoriesLoading(false);
      isFetchingStoriesRef.current = false;
    }
  }, [user, sortKey, sortOrder]);

  useEffect(() => {
    if (!user) return;
    setStories([]);
    setStoriesLast(null);
    fetchStoriesPage();
  }, [user, sortKey, sortOrder, fetchStoriesPage]);

  /* ---------------- Ensure story exists ---------------- */
  async function ensureStoryId(): Promise<string> {
    if (!user) throw new Error(t('alertsSignIn'));
    if (draft.storyId) return draft.storyId;

    const premiumPayload = buildPremiumPayloadFromDraft(draft);

    const id = await createStory({
      title: draft.title || '(untitled)',
      synopsis: draft.synopsis || '',
      genres: draft.genres || [],
      category: draft.category,
      pageCount: clampPagesForCategory(draft.category, draft.pages),
      coverImageUrl: null,
      visibility: 'private',
      status: 'draft',
      language: draft.language,
      metadata: draft.campaignName ? { campaignName: draft.campaignName } : {},
      ...premiumPayload,
    } as any);

    setDraft((d) => ({ ...d, storyId: id }));
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      obj.storyId = id;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
    } catch {}
    return id;
  }

  /* ---------------- Upload cover helpers ---------------- */
  async function uploadCoverViaSdk(userUid: string, storyId: string, srcUrl: string) {
    const path = `users/${userUid}/stories/${storyId}/images/cover.png`;
    const r = ref(storage, path);
    if (srcUrl.startsWith('data:')) {
      await uploadString(r, srcUrl, 'data_url');
    } else {
      const resp = await fetch(srcUrl);
      const blob = await resp.blob();
      await uploadBytes(r, blob, { contentType: blob.type || 'image/png' });
    }
    return await getDownloadURL(r);
  }

  const handleCoverImageSaved = async (url: string) => {
    setDraft((d) => ({ ...d, coverUrl: url }));
    try {
      if (!user) throw new Error(t('alertsSignIn'));
      const id = await ensureStoryId();

      let httpsUrl = url;

      try {
        const out: any = await (uploadCoverToStory as any)?.({
          uid: user.uid,
          storyId: id,
          src: url,
        });
        if (typeof out === 'string') httpsUrl = out;
        else if (out && typeof out.publicUrl === 'string') httpsUrl = out.publicUrl;
      } catch {
        try {
          httpsUrl = await uploadCoverViaSdk(user.uid, id, url);
        } catch {
          httpsUrl = url;
        }
      }

      await updateDoc(fsDoc(db, 'stories', id), {
        coverImageUrl: httpsUrl,
        updatedAt: serverTimestamp(),
      });

      setDraft((d) => ({ ...d, coverUrl: httpsUrl }));
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        obj.coverUrl = httpsUrl;
        obj.storyId = id;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
      } catch {}
    } catch (e: any) {
      console.error('Failed to persist cover to story path:', e?.message || e);
    }
  };

  /* ---------------- Premium: save helper ---------------- */
  async function savePremiumField(path: 'premium.convaiAgentId'|'premium.teaserVideoUrl'|'premium.freeNavigationIndex', value: any) {
    try {
      const id = await ensureStoryId();
      await updateDoc(fsDoc(db, 'stories', id), {
        [path]: value,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('[premium save] failed', e);
    }
  }

  /* ---------------- AI Describe for cover ---------------- */
  async function describeCurrentCover() {
    setDescError('');
    setDescText('');
    if (!draft.coverUrl) {
      setDescError(t('alertsCoverFirst'));
      return;
    }
    setDescLoading(true);
    try {
      const payload = isHttpUrl(draft.coverUrl)
        ? { imageUrl: draft.coverUrl }
        : { dataUrl: draft.coverUrl };

      const lang = draft.language || 'en';
      const langLabel = (() => {
        const map: Record<string, string> = {
          en: t('langEnglish'), es: t('langSpanish'), pt: t('langPortuguese'),
          fr: t('langFrench'), de: t('langGerman'), it: t('langItalian'),
          ja: t('langJapanese'), ko: t('langKorean'), zh: t('langChinese'),
          hi: t('langHindi'), ar: t('langArabic')
        };
        return map[lang] || t('langEnglish');
      })();

      const promptText =
        lang === 'es'
          ? 'Describe esta imagen en un solo párrafo claro y conciso (sin viñetas). Concéntrate en el sujeto, el entorno, la iluminación y el estado de ánimo. Responde únicamente en español.'
          : `Describe this image in one clear, concise paragraph (no bullets). Focus on subject, setting, lighting, and mood. Respond only in ${langLabel}.`;

      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          prompt: promptText,
          language: lang,
          targetLanguage: lang,
          responseModalities: ['TEXT'],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Describe failed');
      setDescText(json.description || '');
    } catch {
      setDescError(t('aiDescribeFailed'));
    } finally {
      setDescLoading(false);
    }
  }

  /* ---------------- Continue: load selected story ---------------- */
  useEffect(() => {
    (async () => {
      if (!user) return;
      if (!existingStoryId || storyMode !== 'continue') return;
      try {
        const sRef = fsDoc(db, 'stories', existingStoryId);
        const snap = await getDoc(sRef);
        if (!snap.exists()) return;

        const s = snap.data() as any;
        setDraft((d) => ({
          ...d,
          storyId: existingStoryId,
          title: s.title || d.title,
          synopsis: s.synopsis || d.synopsis,
          genres: Array.isArray(s.genres) ? s.genres : d.genres,
          category: (s.category || d.category) as Draft['category'],
          pages: typeof s.pageCount === 'number'
            ? clampPagesForCategory((s.category || d.category) as Draft['category'], s.pageCount)
            : d.pages,
          coverUrl: s.coverImageUrl ?? d.coverUrl ?? null,
          language: (s.language as LangCode) || d.language,
          campaignName: s?.metadata?.campaignName || d.campaignName || '',
          premium: {
            convaiAgentId: s?.premium?.convaiAgentId || '',
            teaserVideoUrl: s?.premium?.teaserVideoUrl || '',
            freeNavigationIndex: !!s?.premium?.freeNavigationIndex,
          },
        }));
        setShowCover(true);
        if (s?.premium) setShowPremium(true);
      } catch (e) {
        console.error('Failed to load story details', e);
      }
    })();
  }, [user, existingStoryId, storyMode]);

  /* Persist language */
  useEffect(() => {
    (async () => {
      try {
        if (!draft.storyId || !user) return;
        await updateDoc(fsDoc(db, 'stories', draft.storyId), {
          language: draft.language,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Could not persist language change', e);
      }
    })();
  }, [draft.language, draft.storyId, user]);

  /* Persist campaignName */
  useEffect(() => {
    (async () => {
      try {
        if (!draft.storyId || !user) return;
        if (typeof draft.campaignName === 'undefined') return;
        await updateDoc(fsDoc(db, 'stories', draft.storyId), {
          metadata: { campaignName: draft.campaignName || '' },
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Could not persist campaignName change', e);
      }
    })();
  }, [draft.campaignName, draft.storyId, user]);

  /* Persist category/pageCount */
  useEffect(() => {
    (async () => {
      try {
        if (!draft.storyId || !user) return;
        const pageCount = clampPagesForCategory(draft.category, draft.pages);
        await updateDoc(fsDoc(db, 'stories', draft.storyId), {
          category: draft.category,
          pageCount,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Could not persist category/pageCount change', e);
      }
    })();
  }, [draft.category, draft.pages, draft.storyId, user]);

  /* ---------------- Buttons ---------------- */
  const canStartNew =
    draft.title.trim() !== '' &&
    draft.genres.length > 0 &&
    draft.synopsis.trim() !== '' &&
    (draft.category !== 'campaign' || (draft.campaignName || '').trim() !== '');

  /* 🔥 Start Story with credit deduction (only if new) */
  async function onStartStory() {
    try {
      setStarting(true);
      if (storyMode === 'continue') {
        if (!existingStoryId) throw new Error(t('alertsSelectStory'));
        setDraft((d) => ({ ...d, storyId: existingStoryId }));
        setShowCover(true);
        return;
      }
      if (!canStartNew) throw new Error(t('alertsFillRequired'));
      if (!user) throw new Error(t('alertsSignIn'));

      let id = draft.storyId;

      if (!id) {
        const cost = getCreationCreditCost(draft.category);
        if (userCredits == null || userCredits < cost) {
          alert(tr('alertsNeedCredits', { cost, category: t(draft.category), have: userCredits ?? 0 }));
          router.push('/buy-credits');
          return;
        }

        const storyType = categoryToStoryType(draft.category);
        const { data } = await deductCreditsForCreation({ storyType });
        if (!data?.success) {
          throw new Error(data?.message || t('alertsFailedStart'));
        }

        const premiumPayload = buildPremiumPayloadFromDraft(draft);

        id = await createStory({
          title: draft.title.trim(),
          synopsis: draft.synopsis.trim(),
          genres: draft.genres,
          category: draft.category,
          pageCount: clampPagesForCategory(draft.category, draft.pages),
          coverImageUrl: null,
          visibility: 'private',
          status: 'draft',
          language: draft.language,
          metadata: draft.campaignName ? { campaignName: draft.campaignName } : {},
          ...premiumPayload,
        } as any);

        setDraft((d) => ({ ...d, storyId: id }));
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          const obj = raw ? JSON.parse(raw) : {};
          obj.storyId = id;
          localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
        } catch {}
      }

      setShowCover(true);
    } catch (e: any) {
      alert(e?.message || t('alertsFailedStart'));
    } finally {
      setStarting(false);
    }
  }

  /* 🔥 Skip to Scenes (deduct only if new) */
  async function handleSkipToScenes() {
    try {
      setJumpingScenes(true);

      if (storyMode === 'continue') {
        if (!existingStoryId) throw new Error(t('alertsPickToContinue'));
        router.push(`/create/scenes?storyId=${existingStoryId}`);
        return;
      }

      if (!canStartNew) throw new Error(t('alertsFillRequired'));
      if (!user) throw new Error(t('alertsSignIn'));

      let id = draft.storyId;

      if (!id) {
        const cost = getCreationCreditCost(draft.category);
        if (userCredits == null || userCredits < cost) {
          alert(tr('alertsNeedCredits', { cost, category: t(draft.category), have: userCredits ?? 0 }));
          router.push('/buy-credits');
          return;
        }

        const storyType = categoryToStoryType(draft.category);
        const { data } = await deductCreditsForCreation({ storyType });
        if (!data?.success) {
          throw new Error(data?.message || t('alertsFailedStart'));
        }

        const premiumPayload = buildPremiumPayloadFromDraft(draft);

        id = await createStory({
          title: draft.title.trim(),
          synopsis: draft.synopsis.trim(),
          genres: draft.genres,
          category: draft.category,
          pageCount: clampPagesForCategory(draft.category, draft.pages),
          coverImageUrl: null,
          visibility: 'private',
          status: 'draft',
          language: draft.language,
          metadata: draft.campaignName ? { campaignName: draft.campaignName } : {},
          ...premiumPayload,
        } as any);

        setDraft(d => ({ ...d, storyId: id }));
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          const obj = raw ? JSON.parse(raw) : {};
          obj.storyId = id;
          localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
        } catch {}
      }

      router.push(`/create/scenes?storyId=${id}`);
    } catch (e: any) {
      alert(e?.message || t('alertsCouldNotScenes'));
    } finally {
      setJumpingScenes(false);
    }
  }

  const isNextButtonEnabled =
    draft.title.trim() !== '' &&
    draft.genres.length > 0 &&
    draft.synopsis.trim() !== '' &&
    draft.coverUrl != null &&
    (draft.category !== 'campaign' || (draft.campaignName || '').trim() !== '');

  /* ---------------- UI ---------------- */
  const selectedCost = getCreationCreditCost(draft.category);

  const categoryLabel = (key: Draft['category']) => {
    const cfg = CATEGORIES.find(c => c.key === key)!;
    if (key === 'short') return tr('catShortRange', { min: cfg.min, max: cfg.max });
    if (key === 'novela') return tr('catNovelaRange', { min: cfg.min, max: cfg.max });
    return tr('catCampaignRange', { min: cfg.min, max: cfg.max });
  };

  return (
    <div
      id="begin-page"
      className="min-h-screen p-6 pb-28 text-slate-800 bg-gradient-to-b from-slate-50 to-slate-200 dark:text-[#E0C9A0] dark:bg-gradient-to-b dark:from-[#0d1b2a] dark:to-[#1b263b] font-sans"
    >
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">{t('beginANewTale')}</h1>
          <Link href="/" className="text-sm underline text-slate-700 dark:text-[#C8D6E5]">
            {t('backToLanding')}
          </Link>
        </div>

        {/* Top Form */}
        <div
          className={[
            'mb-5 rounded-xl border-2 shadow p-6',
            'border-slate-300 bg-white text-slate-800',
            'dark:border-[#344b63] dark:bg-[#142436] dark:text-[#E0C9A0]',
          ].join(' ')}
        >
          {/* Resumen de créditos */}
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-black/30">
              {t('yourCredits')} <strong>{userCredits ?? 0}</strong>
            </span>
            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-black/30">
              {tr('costToCreateType', { type: t(draft.category) })} <strong>{selectedCost}</strong>
            </span>
          </div>

          {/* Title + Genres + Story Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">{t('titleLabel')}</label>
              <input
                className={`
                  w-full p-3 border-2 rounded-md
                  bg-white text-slate-900 border-slate-300
                  focus:outline-none focus:ring-2 focus:ring-slate-300
                  dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55] dark:focus:ring-[#2c3f55]
                `}
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="The Rise of the Shadow Dragon"
              />
            </div>

            {/* Genres */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold mb-2">{t('genresLabel')}</label>
              <GenreMultiSelect
                genresList={GENRES as any}
                selectedGenres={draft.genres}
                onSelectedGenresChange={(genres) => setDraft((d) => ({ ...d, genres }))}
              />
            </div>

            {/* Story Mode */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold mb-1">{t('storyMode')}</label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setStoryMode('new'); setExistingStoryId(''); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition
                    ${storyMode === 'new'
                      ? 'bg-[#E97451] text-white shadow-md'
                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[.98] dark:bg-[#0f2334] dark:text-[#C8D6E5] dark:hover:bg-[#152b42]'}`}
                  aria-pressed={storyMode === 'new'}
                >
                  {t('new')}
                </button>
                <button
                  type="button"
                  onClick={() => setStoryMode('continue')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition
                    ${storyMode === 'continue'
                      ? 'bg-[#E97451] text-white shadow-md'
                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[.98] dark:bg-[#0f2334] dark:text-[#C8D6E5] dark:hover:bg-[#152b42]'}`}
                  aria-pressed={storyMode === 'continue'}
                >
                  {t('continue')}
                </button>
              </div>

              {storyMode === 'continue' && (
                <select
                  id="continue-select"
                  disabled={storyMode !== 'continue'}
                  className={`
                    w-full p-3 border-2 rounded-md
                    bg-white text-slate-900 border-slate-300
                    dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
                  `}
                  value={existingStoryId}
                  onChange={(e) => setExistingStoryId(e.target.value)}
                >
                  <option value="">{t('selectAStory')}</option>
                  {stories.map((s) => (
                    <option key={s.id} value={s.id}>{s.title || '(untitled)'}</option>
                  ))}
                </select>
              )}
              {storyMode === 'continue' && storiesLoading && (
                <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">{t('loadingYourStories')}</p>
              )}
            </div>

            {/* Language */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">{t('language')}</label>
              <select
                className={`
                  w-full p-3 border-2 rounded-md
                  bg-white text-slate-900 border-slate-300
                  dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
                `}
                value={draft.language}
                onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value as LangCode }))}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{t(l.labelKey)}</option>
                ))}
              </select>
              <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">
                {t('aiWillUseLanguage')}
              </p>
            </div>

            <div className="hidden md:block" />
          </div>

          {/* Synopsis */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">{t('synopsisLabel')}</label>
            <textarea
              rows={4}
              className={`
                w-full p-3 border-2 rounded-md
                bg-white text-slate-900 border-slate-300
                dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
              `}
              value={draft.synopsis}
              onChange={(e) => setDraft((d) => ({ ...d, synopsis: e.target.value }))}
              placeholder="A young mage discovers a hidden power that could save or shatter the kingdom..."
            />
          </div>

          {/* Current Story (Category + Pages + Campaign Name) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2">{t('currentStoryLabel')}</label>
              <select
                className={`
                  w-full p-3 border-2 rounded-md
                  bg-white text-slate-900 border-slate-300
                  dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
                `}
                value={draft.category}
                onChange={(e) => {
                  const nextKey = e.target.value as Draft['category'];
                  setDraft((d) => {
                    const nextPages = clampPagesForCategory(nextKey, d.pages);
                    return { ...d, category: nextKey, pages: nextPages };
                  });
                }}
              >
                {CATEGORIES.map((c) => {
                  const label = categoryLabel(c.key as Draft['category']);
                  const cost = getCreationCreditCost(c.key as Draft['category']);
                  return (
                    <option key={c.key} value={c.key}>
                      {label} ({tr('xCredits', { x: cost })})
                    </option>
                  );
                })}
              </select>
              <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">
                {tr('allowedPages', { min: cat.min, max: cat.max })}
              </p>

              {draft.category === 'campaign' && (
                <div className="mt-4">
                  <label className="block text-sm font-bold mb-2">{t('campaignName')}</label>
                  <input
                    className={`
                      w-full p-3 border-2 rounded-md
                      bg-white text-slate-900 border-slate-300
                      focus:outline-none focus:ring-2 focus:ring-slate-300
                      dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55] dark:focus:ring-[#2c3f55]
                    `}
                    value={draft.campaignName || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, campaignName: e.target.value }))}
                    placeholder="p. ej., Reto de lectura de verano"
                  />
                  <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">
                    {t('campaignSavedNote')}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">{t('numberOfPages')}</label>
              <input
                type="range"
                min={cat.min}
                max={cat.max}
                value={draft.pages}
                onChange={(e) => setDraft((d) => ({ ...d, pages: clampPagesForCategory(d.category, Number(e.target.value)) }))}
                className="w-full accent-[#E97451]"
              />
              <div className="text-sm mt-1">
                {tr('pagesCount', { n: draft.pages })}
              </div>
            </div>
          </div>

          {/* Premium features toggle */}
          <div className="mt-6 border-t border-slate-300 dark:border-[#2c3f55] pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t('premiumFeatures')}</h2>
              <label className="flex items-center gap-2 text-sm">
                <span>{t('showPanel')}</span>
                <input
                  type="checkbox"
                  checked={showPremium}
                  onChange={(e) => setShowPremium(e.target.checked)}
                />
              </label>
            </div>

            {showPremium && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Convai Agent ID */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold mb-2">{t('convaiAgentId')}</label>
                  <input
                    className="w-full p-3 border-2 rounded-md bg-white text-slate-900 border-slate-300 dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]"
                    placeholder="agent_01jz5wxyxyxyxyxyxyxyxyxyxy"
                    value={draft.premium?.convaiAgentId || ''}
                    onChange={async (e) => {
                      const v = e.target.value;
                      setDraft((d) => ({ ...d, premium: { ...(d.premium||{}), convaiAgentId: v }}));
                      await savePremiumField('premium.convaiAgentId', v || null);
                    }}
                  />
                  <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">
                    {t('convaiHint')}
                  </p>
                </div>

                {/* Teaser (solo Novela/Campaña) */}
                {isLongForm && (
                  <div className="col-span-1">
                    <label className="block text-sm font-bold mb-2">{t('teaserVideo')}</label>
                    <input
                      className="w-full p-3 border-2 rounded-md bg-white text-slate-900 border-slate-300 dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]"
                      placeholder="URL a tu video de YouTube"
                      value={draft.premium?.teaserVideoUrl || ''}
                      onChange={async (e) => {
                        const v = e.target.value.trim();
                        setDraft((d) => ({ ...d, premium: { ...(d.premium||{}), teaserVideoUrl: v }}));
                        await savePremiumField('premium.teaserVideoUrl', v || null);
                      }}
                    />
                    <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">
                      {t('teaserHint')}
                    </p>
                  </div>
                )}

                {/* Free nav index (solo Novela/Campaña) */}
                {isLongForm && (
                  <div className="col-span-1">
                    <label className="block text-sm font-bold mb-2">{t('freeNavIndex')}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!draft.premium?.freeNavigationIndex}
                        onChange={async (e) => {
                          const v = e.target.checked;
                          setDraft((d) => ({ ...d, premium: { ...(d.premium||{}), freeNavigationIndex: v }}));
                          await savePremiumField('premium.freeNavigationIndex', v);
                        }}
                      />
                      <span className="text-sm">{t('freeNavHint')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex justify-end flex-wrap gap-3 mt-6">
            <button
              className="px-5 py-2 rounded-md border bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[.98] dark:bg-gray-700/40 dark:text-[#C8D6E5] dark:hover:bg-gray-700/70"
              onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} location.reload(); }}
            >
              {t('reset')}
            </button>

            <button
              onClick={onStartStory}
              disabled={
                starting ||
                (storyMode === 'new' ? !canStartNew : !existingStoryId)
              }
              className={`
                px-6 py-2 rounded-md text-white font-semibold transition transform active:scale-[.98]
                ${storyMode === 'new'
                  ? (canStartNew ? 'bg-[#2e7d32] hover:bg-[#276a2b]' : 'bg-[#2e7d32]/50')
                  : (existingStoryId ? 'bg-[#2e7d32] hover:bg-[#276a2b]' : 'bg-[#2e7d32]/50')}
              `}
              title={storyMode==='continue' ? t('updateStory') : t('startStory')}
            >
              {storyMode==='new' ? (starting ? t('starting') : t('startStory')) : t('updateStory')}
            </button>

            <button
              className="px-6 py-2 rounded-md font-semibold disabled:opacity-50 bg-[#E97451] text-white hover:bg-[#D46342]"
              onClick={async () => {
                try {
                  const id = await ensureStoryId();
                  router.push(`/create/support?storyId=${id}`);
                } catch (e: any) {
                  alert(e?.message || t('alertsFailedStart'));
                }
              }}
              disabled={!isNextButtonEnabled}
            >
              {t('nextBuildRefs')}
            </button>

            <button
              onClick={handleSkipToScenes}
              disabled={
                jumpingScenes ||
                (storyMode === 'new' ? !canStartNew : !existingStoryId)
              }
              className="px-6 py-2 rounded-md border-2 border-slate-300 text-slate-800 bg-white hover:bg-slate-100 active:scale-[.98] disabled:opacity-50 dark:border-[#3D4F60] dark:text-[#C8D6E5] dark:bg-[#0f2334] dark:hover:bg-[#152b42]"
            >
              {t('skipToScenes')}
            </button>
          </div>
        </div>

        {/* Book Cover */}
        {showCover && (
          <div
            className={[
              'rounded-xl border-2 shadow p-6',
              'border-slate-300 bg-white text-slate-800',
              'dark:border-[#344b63] dark:bg-[#142436] dark:text-[#E0C9A0]',
            ].join(' ')}
          >
            <h2 className="text-xl font-bold mb-4">{t('bookCoverImage')}</h2>

            <CoverImageManager
              initialCoverUrl={draft.coverUrl ?? undefined}
              onCoverImageSaved={handleCoverImageSaved}
              storyId={draft.storyId}
              assetRole="cover"
              promptContext={{
                title: draft.title,
                genres: draft.genres,
                synopsis: draft.synopsis,
                language: draft.language,
              }}
            />

            {/* AI Describe */}
            <div className="mt-4 p-3 rounded-lg border border-slate-300 bg-slate-50 dark:border-[#344b63] dark:bg-black/20">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <button
                  onClick={describeCurrentCover}
                  disabled={descLoading || !draft.coverUrl}
                  className="px-4 py-2 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 hover:bg-[#D46342]"
                >
                  {descLoading ? t('describing') : t('aiDescribeBtn')}
                </button>
                {descError && <span className="text-red-600 dark:text-red-400 text-sm">{descError}</span>}
              </div>

              {!!descText && (
                <div className="mt-3">
                  <label className="block text-sm font-bold mb-1">{t('aiDescription')}</label>
                  <textarea
                    className={`
                      w-full p-3 border-2 rounded-md
                      bg-white text-slate-900 border-slate-300
                      dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55]
                    `}
                    rows={3}
                    value={descText}
                    onChange={(e) => setDescText(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setDraft((d) => ({ ...d, synopsis: descText }))}
                      className="px-3 py-1 rounded-md border bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-700/40 dark:text-[#C8D6E5] dark:hover:bg-gray-700/70"
                    >
                      {t('useAsSynopsis')}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(descText)}
                      className="px-3 py-1 rounded-md border bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[.98] dark:bg-gray-700/40 dark:text-[#C8D6E5] dark:hover:bg-gray-700/70"
                    >
                      {t('copy')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PREMIUM debajo de portada */}
        {showCover && (
          <div
            className={[
              'mt-6 rounded-xl border-2 shadow p-6',
              'border-slate-300 bg-white text-slate-800',
              'dark:border-[#344b63] dark:bg-[#142436] dark:text-[#E0C9A0]',
            ].join(' ')}
          >
            <h2 className="text-xl font-bold mb-2">{t('convaiExplainHeader')}</h2>
            <p className="text-sm text-slate-600 dark:text-[#C8D6E5]/70 mb-4">
              {t('convaiExplainBody')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">{t('convaiIdLabel')}</label>
                <input
                  className={`
                    w-full p-3 border-2 rounded-md
                    bg-white text-slate-900 border-slate-300
                    focus:outline-none focus:ring-2 focus:ring-slate-300
                    dark:bg-[#0f2334] dark:text-white dark:border-[#2c3f55] dark:focus:ring-[#2c3f55]
                  `}
                  value={draft.premium?.convaiAgentId ?? ''}
                  placeholder="e.g., agent_01jz5xyxyxyxyxyxyxyxyxyxy"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      premium: { ...(d.premium || {}), convaiAgentId: e.target.value },
                    }))
                  }
                />
                <p className="text-xs mt-1 text-slate-600 dark:text-[#C8D6E5]/70">
                  {t('convaiSavedNote')}
                </p>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[.98] dark:bg-gray-700/40 dark:text-[#C8D6E5] dark:hover:bg-gray-700/70"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      premium: { ...(d.premium || {}), convaiAgentId: '' },
                    }))
                  }
                >
                  {t('clear')}
                </button>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-600 dark:text-[#C8D6E5]/70">
              Reader side will inject:
              <pre className="mt-2 p-2 rounded bg-slate-100 dark:bg-black/30 overflow-x-auto">{`<elevenlabs-convai agent-id="<this value>"></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* 🔧 Dark-mode input text & placeholder fix (page scoped) */}
      <style jsx global>{`
        .dark #begin-page input,
        .dark #begin-page textarea,
        .dark #begin-page select {
          color: #ffffff !important;
        }
        .dark #begin-page input::placeholder,
        .dark #begin-page textarea::placeholder {
          color: rgba(255, 255, 255, 0.75) !important;
        }
      `}</style>
    </div>
  );
}
