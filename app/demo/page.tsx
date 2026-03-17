'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Dashboard } from '@/components/Dashboard';

// Prevent SSG/prerender issues with `useSearchParams` inside Dashboard.
export const dynamic = 'force-dynamic';

export default function DemoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p className="font-semibold text-emerald-400">Demo mode – mock data</p>
        <p className="mt-1 text-zinc-400">
          This view uses sample applications only. Nothing you add, edit, or delete here is saved.
          To use your real data, use the main app at the root URL.
        </p>
        <p className="mt-2 text-zinc-400">
          <strong className="text-zinc-300">Blacklist:</strong> Try typing &ldquo;Acme Corp&rdquo; in the Company field to see the blacklist warning. Use the <strong className="text-zinc-300">Blacklist</strong> view to see the demo blacklist.
        </p>
        <p className="mt-2 text-zinc-400">
          <strong className="text-zinc-300">Analytics:</strong> Open the <strong className="text-zinc-300">Analytics</strong> tab for trends, rejection insights, and &ldquo;Rejected but still listed as active&rdquo; (ghost post detection). Use <strong className="text-zinc-300">Update</strong> / <strong className="text-zinc-300">Mark as rejected</strong> on the list to try the flow (changes aren&apos;t saved in demo).
        </p>
        <Link
          href="/"
          className="mt-2 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300 underline"
        >
          ← Back to main app
        </Link>
      </div>
      <div className="flex-1 min-h-0">
        <Suspense
          fallback={
            <div className="h-full min-h-[200px] rounded-xl border border-zinc-700 bg-zinc-900" />
          }
        >
          <Dashboard isDemo={true} />
        </Suspense>
      </div>
    </div>
  );
}
