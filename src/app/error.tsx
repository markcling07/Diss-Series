'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';

// Catches render-time exceptions anywhere below the root layout. Without this,
// an unhandled throw shows Next's own error screen — which in production is a
// blank page with a digest and nothing the person can act on.
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Goes to the server log via the browser console. The digest is the only
    // link between what someone saw and the stack trace on the server, so it
    // is worth printing even though the message itself is redacted in
    // production builds.
    console.error('Unhandled error:', error.digest ?? '(no digest)', error);
  }, [error]);

  return (
    <div className="state-narrow">
      <span className="eyebrow">Something broke</span>
      <h1 className="state-title">That didn&apos;t load.</h1>
      <p className="state-text">
        The page hit an error on its way in. Trying again often clears it — the
        photos themselves are unaffected.
      </p>

      <button type="button" className="btn btn-primary" onClick={() => unstable_retry()}>
        <RotateCw size={16} />
        <span>Try again</span>
      </button>

      {error.digest && (
        <p className="state-mono" style={{ marginTop: '1.5rem' }}>
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
