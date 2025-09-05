'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';

type InfoPopoverProps = {
  /** Path to the markdown inside /public (or any static path). Example: "/info_tips/Character Creation template.md" */
  docHref: string;
  /** Optional: title for the header bar of the popover */
  title?: string;
  /** Pixel width (max) for the popover */
  maxWidth?: number;
  /** Positioning preference */
  align?: 'left' | 'right';
  /** Optional className for the trigger */
  className?: string;
};

/**
 * Hover/focus popover that:
 * - Renders `master_prompt_guidance.PNG` at top-left (25% width), floated with square text wrapping.
 * - Loads .md as plaintext and displays it under/around the image (kept simple for zero extra deps).
 */
const InfoPopover: React.FC<InfoPopoverProps> = ({
  docHref,
  title = 'Tips',
  maxWidth = 560,
  align = 'right',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<string>('Loading…');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  // Load the markdown text
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(docHref, { cache: 'force-cache' });
        const txt = await res.text();
        if (alive) setBody(txt || '(empty)');
      } catch (e) {
        if (alive) setBody('Failed to load tips.');
      }
    })();
    return () => { alive = false; };
  }, [docHref]);

  // Close on escape / outside click
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className || ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        aria-describedby={open ? id : undefined}
        aria-label="More info"
        className="inline-flex items-center justify-center rounded-full p-1.5 border border-[#3D4F60]/30 dark:border-[#4B5A6B]/30 hover:bg-black/5 dark:hover:bg-white/10 transition"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        type="button"
      >
        <Info size={16} className="text-[#3D4F60] dark:text-[#E0C9A0]" />
      </button>

      {/* Popover */}
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={title}
          className={`absolute z-50 mt-2 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ width: 'min(90vw, ' + maxWidth + 'px)' }}
        >
          <div className="rounded-xl shadow-2xl border-2 border-[#CBBBA0] dark:border-[#4B5A6B] bg-[#FFFBF5] dark:bg-[#1E2A36] text-[#2c3947] dark:text-[#E0C9A0] overflow-hidden">
            <div className="px-3 py-2 text-xs font-semibold bg-[#F3EADF] dark:bg-[#2A3645] border-b border-black/10 dark:border-white/10">
              {title}
            </div>
            <div className="p-3 text-sm leading-relaxed">
              {/* Image first, top-left, quarter width, with "square text wrap" (float) */}
              <img
                src="/info_tips/master_prompt_guidance.PNG"
                alt="Prompt guidance"
                className="float-left mr-3 mb-2"
                style={{ width: '100%', shapeOutside: 'inset(0 round 6px)' }}
              />
              {/* We keep markdown as plain text for zero deps; preserve newlines */}
              <pre className="whitespace-pre-wrap font-sans text-[13.5px] m-0">
                {body}
              </pre>
              <div className="clear-both" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoPopover;
