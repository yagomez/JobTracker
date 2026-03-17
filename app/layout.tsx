import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import './globals.css';
import { RootLayoutWrapper } from '@/components/RootLayoutWrapper';

export const metadata: Metadata = {
  title: 'Job Tracker',
  description: 'Simple job application tracking dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const header = (
    <header className="bg-zinc-900/50 border-b border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center shrink-0" aria-label="Job Tracker home">
          <span className="text-zinc-400 text-sm font-medium">Job Tracker</span>
        </Link>
      </div>
    </header>
  );
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <RootLayoutWrapper header={header} mainClassName="min-h-screen">
          {children}
        </RootLayoutWrapper>
      </body>
    </html>
  );
}
