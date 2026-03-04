'use client';

import Link from 'next/link';
import { Dashboard } from '@/components/Dashboard';

export default function DemoPage() {
  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-olive-300 bg-olive-50 px-4 py-3 text-sm text-olive-800 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p className="font-semibold text-olive-900">Demo mode – mock data</p>
        <p className="mt-1 text-olive-700">
          This view uses sample applications only. Nothing you add, edit, or delete here is saved.
          To use your real data, use the main app at the root URL.
        </p>
        <p className="mt-2 text-olive-700">
          <strong>Blacklist:</strong> Try typing &ldquo;Acme Corp&rdquo; in the Company field to see the blacklist warning. Use the <strong>Blacklist</strong> view to see the demo blacklist.
        </p>
        <Link
          href="/"
          className="mt-2 inline-block text-sm font-medium text-olive-600 underline hover:text-olive-800"
        >
          ← Back to main app
        </Link>
      </div>
      <Dashboard isDemo={true} />
    </div>
  );
}
