'use client';

import { useEffect } from 'react';

/**
 * Catches errors in the page and shows a message instead of a white screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ color: '#c53030' }}>Something went wrong</h2>
      <p style={{ marginBottom: 16, color: '#4a5568' }}>{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500"
      >
        Try again
      </button>
    </div>
  );
}
