'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Copy, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import {
  ref as sref,
  uploadString,
  getDownloadURL,
  listAll,
  deleteObject,
  uploadBytesResumable,
} from 'firebase/storage';
import {
  doc as fsDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  deleteDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import InfoPopover from '@/components/InfoPopover';

/* ---------- Types ---------- */
type LangCode =
  | 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh' | 'hi' | 'ar';

export type GalleryItem = {
  name: string;
  url: string;
  fullPath: string;
  contentType?: string;
  indexId?: string;
  storagePath?: string;
};
type AssetCategory =
  | 'covers'
  | 'avatars'
  | 'characters'
  | 'locations'
  | 'backgrounds'
  | 'audioNarrations'
  | 'audioEffects'
  | 'videos'
  | 'generatedImages'
  | 'others';

type Mode = 'full' | 'uploaderOnly' | 'galleryOnly';

type SortField = 'name' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';

type Props = {
  variant: 'character' | 'location' | 'cover';
  onSaved?: (item: GalleryItem) => void;
  assetCategory: AssetCategory;
  mode?: Mode;
  onGenerateRequest?: (prompt: string) => void;
  isGenerating?: boolean;
  generatedImageUrl?: string;
  selection?: string[];
  onSelectionChange?: (newSelection: string[]) => void;
  maxSelection?: number;
  nounOverride?: string;
  onOpenTemplate?: () => void;
  mainPromptLabel?: string;
  accept?: string;
  showInnerDescribe?: boolean;
  preferredLanguage?: LangCode;
  storyId?: string;
  disableSaveButtons?: boolean;
  sortField?: SortField;
  sortDir?: SortDir;
  pageSize?: number;
};

/* ---------- Helpers ---------- */
const isImageCategory = (c: AssetCategory) =>
  ['covers', 'avatars', 'characters', 'locations', 'backgrounds', 'generatedImages'].includes(c);

const KB = 1024;
const MB = 1024 * KB;

const LIMITS: Record<string, { min: number; max: number }> = {
  'image/png':  { min: 10 * KB, max: 12 * MB },
  'image/jpeg': { min: 10 * KB, max: 12 * MB },
  'image/jpg':  { min: 10 * KB, max: 12 * MB },
  'image/gif':  { min: 10 * KB, max: 12 * MB },
  'image/webp': { min: 10 * KB, max: 12 * MB },
  'audio/mpeg': { min: 10 * KB, max: 16 * MB },
  'audio/mp3':  { min: 10 * KB, max: 16 * MB },
  'audio/wav':  { min: 10 * KB, max: 16 * MB },
  'video/mp4':  { min: 0.5 * MB,  max: 64 * MB },
};
const fmt = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / KB)} KB`);

function validate(file: File, t: (k: string) => string) {
  const l = LIMITS[file.type];
  if (!l) {
    return { ok: false, msg: t('uploader.unsupportedType').replace('{type}', file.type) };
  }
  if (file.size < l.min) return { ok: false, msg: t('uploader.fileTooSmall').replace('{min}', fmt(l.min)) };
  if (file.size > l.max) return { ok: false, msg: t('uploader.fileTooLarge').replace('{max}', fmt(l.max)) };
  return { ok: true as const };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function sanitizeId(name: string) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 120) || 'asset';
}

function extFromMime(mime: string) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'audio/mpeg') return 'mp3';
  const parts = mime.split('/');
  return parts[1] || 'bin';
}

function buildIndexTarget(params: { uid: string; storyId?: string; category: string; docId: string }) {
  const base = params.storyId
    ? `users/${params.uid}/assetIndex/stories/${params.storyId}/${params.category}`
    : `users/${params.uid}/assetIndex/uncategorized/${params.category}`;
  return { path: `${base}/${params.docId}` };
}
function buildIndexCollectionPath(params: { uid: string; storyId?: string; category: string }) {
  return params.storyId
    ? `users/${params.uid}/assetIndex/stories/${params.storyId}/${params.category}`
    : `users/${params.uid}/assetIndex/uncategorized/${params.category}`;
}

/* ---------- Component ---------- */
export default function UploadImageReference({
  variant,
  nounOverride,
  onSaved,
  mainPromptLabel,
  assetCategory,
  accept: propAccept,
  mode = 'full',
  showInnerDescribe = true,
  onGenerateRequest,
  isGenerating,
  generatedImageUrl,
  selection = [],
  onSelectionChange,
  maxSelection = 1,
  storyId,
  disableSaveButtons,
  sortField = 'updatedAt',
  sortDir = 'desc',
  pageSize = 24,
}: Props) {
  const { t } = useLocale();
  const { user: currentUser } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const storyIdRef = useRef<string | undefined>(storyId);
  useEffect(() => { storyIdRef.current = storyId; }, [storyId]);

  const pathFor = useCallback((uid: string, sid: string | undefined, category: string, name?: string) => {
    const base = sid
      ? `users/${uid}/assetIndex/stories/${sid}/${category}`
      : `users/${uid}/assetIndex/uncategorized/${category}`;
    return name ? `${base}/${name}` : base;
  }, []);

  const noun =
    nounOverride ??
    (variant === 'character' ? t('noun.character') : variant === 'location' ? t('noun.location') : t('noun.cover'));
  const generateCta = t('uploader.generateCta').replace('{noun}', noun);

  const tipDocForOne =
    assetCategory === 'locations'
      ? '/info_tips/location-generation-template.md'
      : assetCategory === 'characters'
      ? '/info_tips/character-creation-template.md'
      : null;
  const tipDocForTwo = '/info_tips/master_prompt_guidance.PNG';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [nameToSave, setNameToSave] = useState('');
  const [suggestedPrompt, setSuggestedPrompt] = useState('');
  const [mainPrompt, setMainPrompt] = useState('');
  const [isDescribing, setIsDescribing] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [err, setErr] = useState('');
  const [localGeneratedUrl, setLocalGeneratedUrl] = useState('');

  const [loadingGallery, setLoadingGallery] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [usedIndex, setUsedIndex] = useState<boolean>(false);

  const resetUploader = useCallback(() => {
    if (inputRef.current) {
      try { inputRef.current.value = ''; } catch {}
    }
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setNameToSave('');
    setSuggestedPrompt('');
  }, [previewUrl]);

  const accept = useMemo(() => {
    if (isImageCategory(assetCategory)) {
      return 'image/png, image/jpeg, image/jpg, image/gif, image/webp';
    }
    return propAccept;
  }, [assetCategory, propAccept]);

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent<{ text?: string }>;
        const txt = ce?.detail?.text ?? '';
        if (txt) setMainPrompt(txt);
      } catch {}
    };
    window.addEventListener('set-uploader-prompt', handler as EventListener);
    return () => window.removeEventListener('set-uploader-prompt', handler as EventListener);
  }, []);

  useEffect(() => {
    setLocalGeneratedUrl(generatedImageUrl || '');
    if (generatedImageUrl && !nameToSave.trim()) {
      setNameToSave(`${noun.toLowerCase().replace(' ', '-')}-${Math.floor(Date.now() / 1000)}`);
    }
  }, [generatedImageUrl, noun, nameToSave]);

  useEffect(() => {
    return () => { if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const buildIndexQuery = useCallback(() => {
    if (!currentUser) return null;
    const sid = storyIdRef.current;
    const colPath = buildIndexCollectionPath({
      uid: currentUser.uid,
      storyId: sid,
      category: assetCategory,
    });
    const colRef = collection(db, colPath);

    const fieldMap: Record<SortField, string> = {
      name: 'nameLower',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const primaryField = fieldMap[sortField] || 'updatedAt';
    const dir = sortDir;

    let qBase = query(colRef, orderBy(primaryField as any, dir as any), limit(pageSize));

    if (lastDocRef.current) {
      qBase = query(qBase, startAfter(lastDocRef.current));
    }

    return qBase;
  }, [currentUser, assetCategory, sortField, sortDir, pageSize]);

  const loadGallery = useCallback(async (reset = true) => {
    if (!currentUser) {
      setGallery([]);
      return;
    }
    const sid = storyIdRef.current;

    setLoadingGallery(true);
    try {
      if (reset) {
        lastDocRef.current = null;
        setGallery([]);
      }

      const qy = buildIndexQuery();
      let usedIndexThisCall = false;

      if (qy) {
        try {
          const snap = await getDocs(qy);
          const docs = snap.docs;

          if (docs.length > 0) {
            usedIndexThisCall = true;
            const items: GalleryItem[] = docs.map((d) => {
              const x = d.data() as any;
              return {
                name: (x.fileName || x.name || d.id) as string,
                url: (x.url as string) ?? '',
                fullPath: (x.storagePath as string) ?? '',
                contentType: (x.contentType as string) ?? undefined,
                indexId: d.id,
                storagePath: (x.storagePath as string) ?? undefined,
              };
            });

            setGallery((g) => (reset ? items : [...g, ...items]));
            lastDocRef.current = docs[docs.length - 1];
            setHasMore(docs.length === pageSize);
            setUsedIndex(true);
          } else {
            if (reset) {
              usedIndexThisCall = false;
            }
            setHasMore(false);
          }
        } catch (indexErr) {
          console.warn('Index query failed; will fall back to Storage listAll:', indexErr);
        }
      }

      if (!usedIndexThisCall) {
        try {
          const base = sref(storage, pathFor(currentUser.uid, sid, assetCategory));
          const res = await listAll(base);
          const items = await Promise.all(
            res.items.map(async (i) => ({
              name: i.name,
              fullPath: i.fullPath,
              url: await getDownloadURL(i),
            }))
          );

          const sorted = items.sort((a, b) => {
            const av = a.name.toLowerCase();
            const bv = b.name.toLowerCase();
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });

          const pageSlice = sorted.slice(0, pageSize);
          setGallery(pageSlice);
          setHasMore(sorted.length > pageSlice.length);
          setUsedIndex(false);
          setErr('');
        } catch (e: any) {
          console.error(`Failed to load gallery (fallback) for ${sid ? `story ${sid}` : 'uncategorized'}:`, e);
          const msg = String(e?.message || e);
          if (msg.includes('storage/unauthorized')) {
            setErr(
              t('uploader.uploadBlocked').replace('{uid}', currentUser.uid)
            );
          } else {
            setErr(`${t('uploader.saveFailed')}: ${msg}`);
          }
          setGallery([]);
          setHasMore(false);
        }
      } else {
        setErr('');
      }
    } finally {
      setLoadingGallery(false);
    }
  }, [assetCategory, currentUser, pageSize, pathFor, sortDir, buildIndexQuery, t]);

  useEffect(() => {
    loadGallery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetCategory, storyId, sortField, sortDir, pageSize]);

  const loadMore = useCallback(() => {
    if (usedIndex && hasMore && !loadingGallery) {
      loadGallery(false);
    }
  }, [usedIndex, hasMore, loadingGallery, loadGallery]);

  async function onChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const check = validate(f, t);
    if (!check.ok) {
      setErr(check.msg!);
      return;
    }
    setErr('');
    setSelectedFile(f);
    const objectUrl = URL.createObjectURL(f);
    setPreviewUrl(objectUrl);
    setNameToSave(f.name.replace(/\.[^.]+$/, ''));
    onSaved?.({ name: f.name, url: objectUrl, fullPath: 'local://selected', contentType: f.type });
  }

  async function handleDescribe() {
    if (!selectedFile) return;
    setIsDescribing(true);
    try {
      setSuggestedPrompt(t('uploader.aiWillPlaceHere'));
    } finally {
      setIsDescribing(false);
    }
  }

  async function handleSaveOriginal() {
    if (!currentUser || !selectedFile || !nameToSave.trim()) return;

    try {
      const ext = extFromMime(selectedFile.type);
      const cleanName = sanitizeId(nameToSave);
      const filename = `${cleanName}.${ext}`;
      const sid = storyIdRef.current;
      const path = pathFor(currentUser.uid, sid, assetCategory, filename);

      const storageRef = sref(storage, path);

      const meta: Record<string, string> = {
        displayName: cleanName,
        category: assetCategory,
        source: 'uploaded',
        createdAt: String(Date.now()),
        'narratum:role': variant,
      };
      if (sid) meta['narratum:storyId'] = sid;

      const task = uploadBytesResumable(storageRef, selectedFile, {
        contentType: selectedFile.type || undefined,
        customMetadata: meta,
      });

      await new Promise<void>((resolve, reject) => {
        task.on('state_changed', () => {}, (err) => reject(err), () => resolve());
      });

      const downloadUrl = await getDownloadURL(task.snapshot.ref);

      const item: GalleryItem = {
        name: filename,
        url: downloadUrl,
        fullPath: path,
        contentType: selectedFile.type,
      };
      setGallery((g) => [item, ...g]);
      onSaved?.(item);

      try {
        const { path: docPath } = buildIndexTarget({
          uid: currentUser.uid,
          storyId: sid,
          category: assetCategory,
          docId: cleanName,
        });
        await setDoc(
          fsDoc(db, docPath),
          {
            url: downloadUrl,
            name: cleanName,
            nameLower: cleanName.toLowerCase(),
            fileName: filename,
            contentType: selectedFile.type || 'application/octet-stream',
            storagePath: path,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            source: 'uploaded',
            storyId: sid ?? null,
            role: variant,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Failed to write index doc for original upload:', err);
      }

      alert(t('uploader.savedToGallery'));
      resetUploader();

      loadGallery(true);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('storage/unauthorized')) {
        alert(t('uploader.uploadBlocked').replace('{uid}', currentUser?.uid ?? ''));
      } else {
        alert(t('uploader.saveFailed'));
      }
    }
  }

  function handleGenerate() {
    onGenerateRequest?.(mainPrompt);
  }

  async function handleSaveGenerated() {
    if (!currentUser || !localGeneratedUrl || !nameToSave.trim()) return;

    try {
      const cleanName = sanitizeId(nameToSave);
      const filename = `${cleanName}.png`;
      const sid = storyIdRef.current;
      const path = pathFor(currentUser.uid, sid, assetCategory, filename);

      const storageRef = sref(storage, path);

      const meta: Record<string, string> = {
        displayName: cleanName,
        category: assetCategory,
        source: 'ai-generated',
        createdAt: String(Date.now()),
        'narratum:role': variant,
      };
      if (sid) meta['narratum:storyId'] = sid;

      await uploadString(storageRef, localGeneratedUrl, 'data_url', { customMetadata: meta });

      const downloadUrl = await getDownloadURL(storageRef);
      const item: GalleryItem = { name: filename, url: downloadUrl, fullPath: path, contentType: 'image/png' };
      setGallery((g) => [item, ...g]);
      onSaved?.(item);

      try {
        const { path: docPath } = buildIndexTarget({
          uid: currentUser.uid,
          storyId: sid,
          category: assetCategory,
          docId: cleanName,
        });
        await setDoc(
          fsDoc(db, docPath),
          {
            url: downloadUrl,
            name: cleanName,
            nameLower: cleanName.toLowerCase(),
            fileName: filename,
            contentType: 'image/png',
            storagePath: path,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            source: 'ai-generated',
            storyId: sid ?? null,
            role: variant,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Failed to write index doc for generated upload:', err);
      }

      alert(t('uploader.savedToGallery'));
      resetUploader();
      setLocalGeneratedUrl('');

      loadGallery(true);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('storage/unauthorized')) {
        alert(t('uploader.saveBlocked'));
      } else {
        alert(t('uploader.saveFailed'));
      }
    }
  }

  function handleRegenerate() {
    setLocalGeneratedUrl('');
  }

  async function handleDelete(item: GalleryItem) {
    if (!confirm(t('uploader.deleteConfirmName').replace('{name}', item.name))) return;
    try {
      await deleteObject(sref(storage, item.fullPath));
      if (currentUser) {
        const sid = storyIdRef.current;
        if (item.indexId) {
          const colPath = buildIndexCollectionPath({
            uid: currentUser.uid,
            storyId: sid,
            category: assetCategory,
          });
          await deleteDoc(fsDoc(db, `${colPath}/${item.indexId}`));
        } else if (item.storagePath) {
          const maybeId = item.name.replace(/\.[^.]+$/, '');
          const colPath = buildIndexCollectionPath({
            uid: currentUser.uid,
            storyId: sid,
            category: assetCategory,
          });
          try { await deleteDoc(fsDoc(db, `${colPath}/${maybeId}`)); } catch {}
        }
      }

      setGallery((g) => g.filter((x) => x.fullPath !== item.fullPath));
    } catch (e: any) {
      alert(t('uploader.deleteFailed'));
    }
  }

  const handleGalleryItemClick = (item: GalleryItem) => {
    if (onSelectionChange) {
      const isSelected = selection.includes(item.url);
      let newSelection: string[];
      if (isSelected) {
        newSelection = selection.filter((url) => url !== item.url);
      } else {
        if (selection.length >= maxSelection) {
          alert(t('gallery.maxSelectionAlert').replace('{count}', String(maxSelection)));
          return;
        }
        newSelection = [...selection, item.url];
      }
      onSelectionChange(newSelection);
    } else {
      onSaved?.(item);
    }
  };

  function PreviewBlock() {
    if (!previewUrl || !selectedFile) return null;
    if (selectedFile.type.startsWith('image/')) {
      return (
        <div className="mt-3">
          <Image
            src={previewUrl}
            alt={t('uploader.alt.preview')}
            width={240}
            height={240}
            className="mx-auto max-h-48 rounded-md border object-contain"
            unoptimized
          />
        </div>
      );
    }
    if (selectedFile.type.startsWith('audio/')) {
      return (
        <div className="mt-3">
          <audio controls src={previewUrl} className="w-full" />
        </div>
      );
    }
    if (selectedFile.type.startsWith('video/')) {
      return (
        <div className="mt-3">
          <video controls src={previewUrl} className="w-full max-h-48 rounded-md border" />
        </div>
      );
    }
    return null;
  }

  function UploaderUI() {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-bold text-[#3D4F60] mb-2 uppercase tracking-wide">
          {isImageCategory(assetCategory) ? t('uploader.uploadImage') : t('uploader.uploadFile')}
        </label>
        <div className="border-2 border-dashed border-[#B0C4DE] rounded-md p-4 text-center">
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChoose} />
          <button className="cursor-pointer text-[#E97451] font-semibold" onClick={() => inputRef.current?.click()}>
            {t('uploader.clickToUploadImage')}
          </button>
          <p className="text-sm text-[#3D4F60]/70 mt-1">{t('uploader.orDragDrop')}</p>
          {selectedFile && (
            <div className="mt-3 text-sm">
              {t('uploader.selected')} <span className="font-medium">{selectedFile.name}</span>
            </div>
          )}
          <PreviewBlock />
        </div>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        {selectedFile && (
          <div className="flex gap-2">
            <input
              className="flex-1 p-2 border-2 border-[#B0C4DE] rounded-md"
              placeholder={t('uploader.nameToSave')}
              value={nameToSave}
              onChange={(e) => setNameToSave(e.target.value)}
              disabled={disableSaveButtons}
            />
            <button
              onClick={handleSaveOriginal}
              className="px-4 py-2 rounded-md bg-[#3D4F60] text-white disabled:opacity-50"
              disabled={disableSaveButtons}
            >
              {t('uploader.saveToGallery')}
            </button>
          </div>
        )}

        {/* ---------- IMAGE-SPECIFIC SECTION ---------- */}
        {isImageCategory(assetCategory) && (
          <>
            <div className="border-t my-4" />

            {showInnerDescribe && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{t('uploader.suggestedPromptTitle')}</h4>

                  {tipDocForOne && (
                    <InfoPopover
                      title={assetCategory === 'locations' ? t('uploader.locationTemplate') : t('uploader.characterTemplate')}
                      docHref={tipDocForOne}
                      onUsePrompt={(text) => setMainPrompt(text)}
                    />
                  )}

                  {!!suggestedPrompt && (
                    <button
                      type="button"
                      title={t('uploader.copy')}
                      className="ml-auto inline-flex items-center gap-1"
                      onClick={() => navigator.clipboard.writeText(suggestedPrompt)}
                    >
                      <Copy size={14} /> {t('uploader.copy')}
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDescribe}
                    disabled={!selectedFile || isDescribing}
                    className="px-3 py-2 rounded-md border bg-white disabled:opacity-50"
                  >
                    {isDescribing ? t('uploader.describing') : t('uploader.aiDescribe')}
                  </button>
                  <textarea
                    className="flex-1 min-h-[90px] border rounded-md p-2"
                    placeholder={t('uploader.aiWillPlaceHere')}
                    value={suggestedPrompt}
                    onChange={(e) => setSuggestedPrompt(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">
                  {mainPromptLabel ?? t('uploader.mainPromptTitleDefault').replace('{noun}', noun)}
                </h4>
                <InfoPopover
                  title={t('uploader.proTipsPrompting')}
                  docHref={tipDocForTwo}
                  onUsePrompt={(text) => setMainPrompt(text)}
                />
              </div>

              <textarea
                className="w-full min-h-[120px] border rounded-md p-2"
                placeholder={t('uploader.describeNounPlaceholder').replace('{noun}', noun.toLowerCase())}
                value={mainPrompt}
                onChange={(e) => setMainPrompt(e.target.value)}
                disabled={disableSaveButtons}
              />
            </div>

            {!localGeneratedUrl ? (
              <button
                onClick={() => onGenerateRequest?.(mainPrompt)}
                disabled={isGenerating || !mainPrompt.trim() || disableSaveButtons}
                className="w-full py-3 rounded-md bg-[#E97451] text-white font-semibold disabled:opacity-50 transition"
              >
                {isGenerating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin inline-block h-5 w-5 rounded-full border-2" />
                    {t('uploader.generating')}
                  </span>
                ) : (
                  generateCta
                )}
              </button>
            ) : (
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  className="flex-1 border rounded-md px-3 py-2"
                  placeholder={t('uploader.nameToSave')}
                  value={nameToSave}
                  onChange={(e) => setNameToSave(e.target.value)}
                  disabled={disableSaveButtons}
                />
                <button
                  className="px-4 py-2 rounded-md bg-[#3D4F60] text-white disabled:opacity-50"
                  onClick={handleSaveGenerated}
                  disabled={disableSaveButtons}
                >
                  {t('uploader.saveToGallery')}
                </button>
                <button className="px-4 py-2 rounded-md border" onClick={handleRegenerate}>
                  {t('uploader.regenerate')}
                </button>
              </div>
            )}

            {localGeneratedUrl && (
              <div className="mt-3 border rounded-xl p-3">
                <p className="text-sm mb-2">{t('uploader.generatedImage')}</p>
                <Image
                  src={localGeneratedUrl}
                  alt={t('uploader.alt.generated')}
                  width={512}
                  height={512}
                  className="max-w-full rounded-md"
                  unoptimized
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function GalleryUI() {
    const galleryMessage = storyIdRef.current
      ? (gallery.length === 0 && !loadingGallery ? t('gallery.noFilesForStory') : null)
      : (gallery.length === 0 && !loadingGallery ? t('gallery.noUncategorized') : null);

    return (
      <div>
        {galleryMessage ? (
          <p className="text-sm text-neutral-500">{galleryMessage}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gallery.map((it) => {
                const isSelected = selection.includes(it.url);
                const isSelectionMode = !!onSelectionChange;

                return (
                  <div
                    key={it.fullPath + (it.indexId ?? '')}
                    className="relative group border rounded-md overflow-hidden p-1 cursor-pointer transition-all duration-200"
                    onClick={() => handleGalleryItemClick(it)}
                    style={{
                      borderColor: isSelected ? '#3b82f6' : 'transparent',
                      borderWidth: isSelected ? '3px' : '1px',
                      opacity: isSelectionMode && selection.length > 0 && !isSelected ? 0.6 : 1,
                    }}
                  >
                    <Image
                      src={it.url}
                      alt={it.name}
                      width={150}
                      height={150}
                      className="w-full h-32 object-cover rounded"
                      unoptimized
                    />
                    <button
                      title={t('gallery.deleteTitle')}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(it);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition bg-white/90 rounded-full p-1 shadow"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                    {isSelected && (
                      <div className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-0.5 shadow">
                        <CheckCircle2 size={20} />
                      </div>
                    )}
                    <div className="px-2 py-1 text-xs truncate">{it.name}</div>
                  </div>
                );
              })}
            </div>

            {/* Pager */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs opacity-60">
                {(usedIndex ? t('gallery.pager.indexed') : t('gallery.pager.fallback')) + ' '}•{' '}
                {t('gallery.pager.sort')
                  .replace('{field}', sortField)
                  .replace('{dir}', sortDir)
                  .replace('{size}', String(pageSize))}
              </div>
              <div className="flex items-center gap-2">
                {loadingGallery && <span className="text-xs opacity-70">{t('gallery.loading')}</span>}
                {usedIndex && hasMore && !loadingGallery && (
                  <button
                    className="px-3 py-1.5 rounded-md border text-sm"
                    onClick={loadMore}
                  >
                    {t('gallery.loadMore')}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (mode === 'uploaderOnly') {
    return <div className="p-4 bg-white border rounded-xl">{UploaderUI()}</div>;
  }
  if (mode === 'galleryOnly') {
    return <div>{GalleryUI()}</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <UploaderUI />
      <GalleryUI />
    </div>
  );
}
