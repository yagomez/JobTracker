'use client';

/**
 * Catches errors in the root layout and shows a message instead of a white screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', padding: 24, background: '#f5f5dc', color: '#333' }}>
        <div style={{ maxWidth: 600 }}>
          <h1 style={{ color: '#c53030' }}>Something went wrong</h1>
          <p style={{ marginBottom: 16 }}>{error.message}</p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: '8px 16px', background: '#4a5568', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
