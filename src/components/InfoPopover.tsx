'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw'; // only if your .md has trusted inline HTML

type InfoPopoverProps = {
  /** Button label shown in tooltip/aria (icon always shown) */
  title?: string;
  /** Path to a Markdown file (e.g., /info_tips/MyDoc.md) */
  docHref: string;
  /** If true, add a cache-buster & disable HTTP caching so updates show immediately */
  noCache?: boolean;
  /** Optional: size override; defaults to 60vw on md+ screens */
  widthClassName?: string; // e.g., "md:w-[70vw]"
  /** Optional: pass a className to the trigger button wrapper */
  className?: string;
};

export default function InfoPopover({
  title = 'More info',
  docHref,
  noCache = true,
  widthClassName,
  className,
}: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const [md, setMd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  // Load markdown when opened
  useEffect(() => {
    if (!open) return;
    let aborted = false;
    (async () => {
      try {
        setError('');
        setLoading(true);
        const url = noCache ? `${docHref}${docHref.includes('?') ? '&' : '?'}v=${Date.now()}` : docHref;
        const res = await fetch(url, { cache: noCache ? 'no-store' as RequestCache : 'force-cache' });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const txt = await res.text();
        if (!aborted) setMd(txt);
      } catch (e: any) {
        if (!aborted) setError(e?.message || 'Failed to load document');
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [open, docHref, noCache]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const modalWidth = widthClassName || 'md:w-[60vw]';

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        aria-label={title}
        title={title}
        className={['inline-flex items-center justify-center rounded-full p-1.5 border border-transparent hover:border-current transition', className].filter(Boolean).join(' ')}
        onClick={() => setOpen(true)}
      >
        <Info size={18} className="opacity-80" />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* Overlay (click to close) */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" onClick={close} />

          {/* Panel */}
          <div
            ref={panelRef}
            className={[
              'relative z-[1001] w-[90vw]',
              modalWidth,
              'max-h-[80vh] overflow-auto rounded-2xl shadow-2xl',
              'bg-white text-slate-800',
              'dark:bg-slate-900 dark:text-slate-100',
              'p-5 md:p-7',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-lg md:text-xl font-semibold">{title}</h3>
              <button
                onClick={close}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
              >
                Close
              </button>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              {loading && <p className="opacity-70">Loading…</p>}
              {error && <p className="text-red-600">{error}</p>}
              {!loading && !error && <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]} // remove if you don't need raw HTML
                      >
                        {md}
                      </ReactMarkdown>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
