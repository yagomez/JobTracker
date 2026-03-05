import type { Metadata } from 'next';
import { Righteous, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { RootLayoutWrapper } from '@/components/RootLayoutWrapper';

const righteous = Righteous({ weight: '400', subsets: ['latin'] });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

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
    <header className="bg-olive-800 shadow-md border-b border-olive-700">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
        <h1 className={`text-2xl sm:text-3xl font-bold text-white tracking-tight ${righteous.className}`}>Job Tracker</h1>
        <p className="text-olive-200 text-sm mt-0.5">Track your job applications in one place</p>
      </div>
    </header>
  );
  return (
    <html lang="en">
      <body className={`bg-olive-50 text-olive-900 ${bricolage.className}`}>
        <div className="min-h-screen">
          <RootLayoutWrapper header={header} mainClassName="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </RootLayoutWrapper>
        </div>
      </body>
    </html>
  );
}
