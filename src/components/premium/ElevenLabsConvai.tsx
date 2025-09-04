// src/components/premium/ElevenLabsConvai.tsx
'use client';

import React, { useEffect } from 'react';

declare global {
  // allow the custom element in TSX
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': any;
    }
  }
}

type Props = {
  agentId?: string | null;
  hidden?: boolean;
};

/**
 * Lazy-injects the ElevenLabs embed script once per page
 * and mounts the custom element when an agentId is present.
 */
export default function ElevenLabsConvai({ agentId, hidden }: Props) {
  useEffect(() => {
    if (!agentId) return;
    // inject once
    const existing = document.querySelector('script[data-elevenlabs-convai]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      s.async = true;
      s.type = 'text/javascript';
      s.setAttribute('data-elevenlabs-convai', '1');
      document.body.appendChild(s);
    }
  }, [agentId]);

  if (!agentId || hidden) return null;

  // NOTE: widget positions itself; elevate a bit just in case
  // eslint-disable-next-line react/no-unknown-property
  return <elevenlabs-convai agent-id={agentId} style={{ zIndex: 60 }} />;
}
