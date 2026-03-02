import type { Metadata } from 'next';
import { Righteous, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';

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
  return (
    <html lang="en">
      <body className={`bg-olive-100 text-white ${bricolage.className}`}>
        <div className="min-h-screen">
          <header className="bg-olive-700 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-6">
              <h1 className={`text-3xl font-bold text-white ${righteous.className}`}>Job Tracker</h1>
              <p className="text-olive-100">Track your job applications in one place</p>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
