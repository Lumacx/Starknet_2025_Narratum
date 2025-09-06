'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Info, Clipboard, ArrowDownLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

type InfoPopoverProps = {
  title?: string;
  docHref: string;
  noCache?: boolean;
  widthClassName?: string;
  className?: string;
  /** when a prompt block is clicked, send its text up */
  onInsertPrompt?: (text: string, target?: 'composer') => void;
  insertLabel?: string; // default: "Insert to Scene Composer"
};

export default function InfoPopover({
  title = 'More info',
  docHref,
  noCache = true,
  widthClassName,
  className,
  onInsertPrompt,
  insertLabel = 'Insert to Scene Composer',
}: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const [md, setMd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setOpen(false), []);

  // load markdown (with cache-buster so updates show immediately)
  useEffect(() => {
    if (!open) return;
    let aborted = false;
    (async () => {
      try {
        setError('');
        setLoading(true);
        const url = noCache ? `${docHref}${docHref.includes('?') ? '&' : '?'}v=${Date.now()}` : docHref;
        const res = await fetch(url, { cache: noCache ? 'no-store' : 'force-cache' });
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

  // close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const modalWidth = widthClassName || 'md:w-[60vw]';

  // Custom renderer for fenced code blocks marked as ```prompt
  function CodeRenderer(props: any) {
    const { inline, className, children } = props;
    const txt = String(children ?? '').trim();
    const isPrompt =
      !inline &&
      ((className && /language-prompt\b/.test(className)) ||
       (className && /\bprompt\b/.test(className)));

    if (!isPrompt) {
      return (
        <pre className="overflow-auto rounded-lg bg-slate-100 dark:bg-slate-800 p-3 text-sm">
          <code className={className}>{children}</code>
        </pre>
      );
    }

    const handleInsert = () => {
      if (onInsertPrompt) onInsertPrompt(txt, 'composer');
      // optional: smooth scroll to composer if the page has an anchor
      const el = document.getElementById('composer-box');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    const handleCopy = async () => {
      try { await navigator.clipboard.writeText(txt); } catch {}
    };

    return (
      <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 my-3">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs uppercase tracking-wide opacity-70">Prompt</span>
          <div className="flex gap-2">
            <button
              onClick={handleInsert}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700"
            >
              <ArrowDownLeft size={14} /> {insertLabel}
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700"
              title="Copy to clipboard"
            >
              <Clipboard size={14} /> Copy
            </button>
          </div>
        </div>
        <pre className="m-0 max-h-[40vh] overflow-auto px-3 pb-3 text-sm">
          <code className="whitespace-pre-wrap">{txt}</code>
        </pre>
      </div>
    );
  }

  return (
    <>
      {/* Trigger icon */}
      <button
        type="button"
        aria-label={title}
        title={title}
        className={['inline-flex items-center justify-center rounded-full p-1.5 border border-transparent hover:border-current transition', className].filter(Boolean).join(' ')}
        onClick={() => setOpen(true)}
      >
        <Info size={18} className="opacity-80" />
      </button>

      {/* Centered modal */}
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" onClick={close} />
          <div
            ref={panelRef}
            className={[
              'relative z-[1001] w-[90vw]', modalWidth,
              'max-h-[80vh] overflow-auto rounded-2xl shadow-2xl',
              'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
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
              {!loading && !error && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{ code: CodeRenderer as any }}
                >
                  {md}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
