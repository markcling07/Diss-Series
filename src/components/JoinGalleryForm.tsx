'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

// Codes are dictated across rooms and copied off printouts, which is why the
// alphabet in lib/gallery.ts has no vowels and no I/L/O/0/1. The same
// forgiveness applies to what gets typed back in: case, spacing and punctuation
// are all discarded before the lookup, and a pasted share link is unwrapped to
// the code inside it.
function extractCode(input: string): string {
  const raw = input.trim();
  const afterPath = raw.includes('/g/') ? raw.slice(raw.lastIndexOf('/g/') + 3) : raw;
  // Stop at the first /, ? or #, or a link carrying a query string ends up
  // welded to the code — "…/g/MXHXHXX5?utm=x" would read as MXHXHXX5UTMX.
  const segment = afterPath.split(/[/?#]/)[0];
  return segment.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export default function JoinGalleryForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractCode(value);

    if (!code) {
      setError('Enter the code someone shared with you.');
      return;
    }

    // Whether the code exists is the gallery page's problem — it already has a
    // "no gallery with that code" screen that names the code back to you, so
    // checking here first would only duplicate it.
    router.push(`/g/${code}`);
  };

  return (
    <form className="join-form" onSubmit={handleSubmit}>
      <label className="form-label" htmlFor="gallery-code">
        Have a gallery code?
      </label>

      <div className="join-row">
        <input
          id="gallery-code"
          className="form-input join-input"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. MXHXHXX5"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          maxLength={120}
          aria-describedby={error ? 'join-error' : undefined}
        />

        <button type="submit" className="btn btn-primary">
          <span>Open</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {error && (
        <p className="join-error" id="join-error">
          {error}
        </p>
      )}
    </form>
  );
}
