'use client';

import { Suspense } from 'react';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[200px] flex items-center justify-center bg-indigo-50/70">
          <p className="text-indigo-600 font-medium">Loading…</p>
        </div>
      }
    >
      <Dashboard isDemo={true} />
    </Suspense>
  );
}
