// src/components/InfoPopover.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Info, X, Clipboard, Check } from 'lucide-react';

type InfoPopoverProps = {
  title: string;
  /** Path to a markdown file. Relative to /public works great, e.g. /info_tips/character-creation-template.md */
  docHref: string;
  /** Called when a fenced ```prompt block is used */
  onUsePrompt?: (text: string) => void;
  /** Optional size for the info icon */
  size?: number;
};

export default function InfoPopover({ title, docHref, onUsePrompt, size = 16 }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const [md, setMd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Fetch markdown when opening, with cache-busting and no-store
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const bust = docHref.includes('?') ? `&v=${Date.now()}` : `?v=${Date.now()}`;
        // encodeURI protects spaces etc. when you keep original file names
        const url = encodeURI(`${docHref}${bust}`);
        const res = await fetch(url, { cache: 'no-store' });
        const text = res.ok ? await res.text() : `⚠️ Could not load: ${docHref}\n\nHTTP ${res.status}`;
        if (!cancelled) setMd(text);
      } catch (e: any) {
        if (!cancelled) setMd(`⚠️ Error loading ${docHref}\n\n${e?.message || e}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, docHref]);

  // Extract fenced ```prompt blocks to show “Use in App” / Copy
  const promptBlocks = useMemo(() => {
    const arr: string[] = [];
    const re = /```prompt\s*([\s\S]*?)```/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md))) arr.push(m[1].trim());
    return arr;
  }, [md]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    // Prevent body scroll when modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const copy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1200);
    } catch {}
  };

  const useInApp = (text: string) => {
    onUsePrompt?.(text);
    // Copy to clipboard too (nice UX)
    navigator.clipboard.writeText(text).catch(() => {});
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs hover:bg-black/5 dark:hover:bg-white/10"
        aria-label={`Open: ${title}`}
        onClick={() => setOpen(true)}
      >
        <Info size={size} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div
            ref={panelRef}
            className="relative bg-white dark:bg-[#0f1620] text-[#1b2a3a] dark:text-[#E0C9A0] w-[60vw] max-w-[1000px] min-w-[320px] max-h-[80vh] rounded-xl shadow-2xl border overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <header className="sticky top-0 bg-white/90 dark:bg-[#0f1620]/90 backdrop-blur p-3 border-b flex items-center gap-2">
              <h3 className="font-semibold flex-1 truncate">{title}</h3>
              {promptBlocks.length > 0 && (
                <div className="text-xs px-2 py-1 rounded-full border">
                  {promptBlocks.length} prompt{promptBlocks.length > 1 ? 's' : ''} found
                </div>
              )}
              <button
                type="button"
                className="ml-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div className="grid md:grid-cols-[1fr,250px]">
              <article className="p-4 overflow-auto prose prose-sm md:prose max-w-none dark:prose-invert">
                {loading ? (
                  <div className="opacity-70 text-sm">Loading…</div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{md || '_No content_'}</ReactMarkdown>
                )}
              </article>

              <aside className="p-4 border-t md:border-t-0 md:border-l flex flex-col gap-3">
                <div className="font-semibold text-sm">Actions</div>
                {promptBlocks.length === 0 ? (
                  <>
                    <button
                      className="px-3 py-2 rounded bg-[#E97451] text-white text-sm"
                      onClick={() => useInApp(md.trim())}
                    >
                      Use entire doc in app
                    </button>
                    <button
                      className="px-3 py-2 rounded border text-sm"
                      onClick={() => copy(md.trim(), 0)}
                    >
                      Copy entire doc
                    </button>
                  </>
                ) : (
                  promptBlocks.map((p, i) => (
                    <div key={i} className="rounded-lg border p-2">
                      <div className="text-xs mb-2 font-semibold">Prompt #{i + 1}</div>
                      <div className="flex gap-2">
                        <button
                          className="flex-1 px-3 py-2 rounded bg-[#E97451] text-white text-sm"
                          onClick={() => useInApp(p)}
                        >
                          Use in App
                        </button>
                        <button
                          className="px-3 py-2 rounded border text-sm inline-flex items-center gap-1"
                          onClick={() => copy(p, i)}
                          title="Copy to clipboard"
                        >
                          {copiedIdx === i ? <Check size={14} /> : <Clipboard size={14} />}
                          {copiedIdx === i ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
