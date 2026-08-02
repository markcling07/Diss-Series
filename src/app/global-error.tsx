'use client'; // Error boundaries must be Client Components

// Last resort: this replaces the root layout, so it runs when the failure was
// in the layout itself and error.tsx never got a chance to mount. It has to
// bring its own <html> and <body>, and it cannot rely on the app's fonts or
// stylesheet having loaded — hence the inline styles.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0f',
          color: '#f5f5f4',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <p
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              opacity: 0.6,
              margin: '0 0 1rem',
            }}
          >
            DissPic
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
            The app failed to start.
          </h1>
          <p style={{ opacity: 0.75, lineHeight: 1.6, margin: '0 0 1.75rem' }}>
            This is a fault on our side, not a problem with your link. Reloading
            may be enough; if it is not, the server needs a look.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              font: 'inherit',
              fontWeight: 500,
              padding: '0.6rem 1.4rem',
              borderRadius: '999px',
              border: '1px solid rgba(245,245,244,0.25)',
              background: '#f5f5f4',
              color: '#0d0d0f',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.75rem',
                opacity: 0.5,
                marginTop: '1.75rem',
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
