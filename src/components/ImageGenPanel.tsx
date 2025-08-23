'use client';

import React, { useState } from 'react';

export default function ImageGenPanel() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1'|'16:9'|'9:16'>('1:1');
  const [img, setImg] = useState<string|undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();

  const generate = async () => {
    setLoading(true);
    setError(undefined);
    setImg(undefined);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, count: 1, aspectRatio })
      });
      const { dataUrl, error } = await res.json();
      if (!res.ok || error) throw new Error(error || `HTTP ${res.status}`);
      setImg(dataUrl);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border">
      <label className="text-sm font-medium">Prompt</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full min-h-24 p-2 rounded border bg-transparent"
        placeholder="Robot holding a red skateboard"
      />
      <div className="flex items-center gap-3">
        <label className="text-sm">Aspect Ratio</label>
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as any)}
          className="p-2 rounded border bg-transparent"
        >
          <option value="1:1">1:1</option>
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
        </select>
        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {img && (
        <div className="mt-2">
          <img src={img} alt="generated" className="max-w-full rounded-lg" />
          <a href={img} download="imagen.png" className="text-blue-500 underline text-sm">
            Download PNG
          </a>
        </div>
      )}
    </div>
  );
}
