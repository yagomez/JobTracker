import Link from 'next/link';
import Image from 'next/image';

import logo from '../images/BlacklistInc_Logo.png';

const navLinkClass = 'text-sm text-zinc-400 hover:text-white transition-colors';

export default function ReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      {/* Top navigation */}
      <header className="border-b border-white/10 shrink-0">
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/reviews" className="flex items-center gap-2 shrink-0">
            <Image
              src={logo}
              alt="Blacklist Inc."
              width={220}
              height={66}
              className="h-14 sm:h-16 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-6">
            <a href="/reviews#top" className={navLinkClass}>
              Reviews
            </a>
            <a href="/reviews#add-review" className={navLinkClass}>
              Add review
            </a>
            <Link href="/" className={navLinkClass}>
              Back to Job Tracker
            </Link>
          </div>
        </nav>
      </header>

      <div id="top" className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 flex flex-col min-h-0">
        {children}
      </div>

      {/* Bottom navigation */}
      <footer className="border-t border-white/10 shrink-0 mt-auto">
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/reviews" className="flex items-center gap-2 shrink-0 opacity-80 hover:opacity-100 transition-opacity">
            <Image
              src={logo}
              alt="Blacklist Inc."
              width={180}
              height={54}
              className="h-12 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-6">
            <a href="/reviews#top" className={navLinkClass}>
              Reviews
            </a>
            <a href="/reviews#add-review" className={navLinkClass}>
              Add review
            </a>
            <Link href="/" className={navLinkClass}>
              Back to Job Tracker
            </Link>
          </div>
        </nav>
      </footer>
    </div>
  );
}
