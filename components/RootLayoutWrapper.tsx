'use client';

import { usePathname } from 'next/navigation';

export function RootLayoutWrapper({
  children,
  header,
  mainClassName,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  mainClassName: string;
}) {
  const pathname = usePathname();
  const isReviewsApp = pathname === '/reviews' || (pathname?.startsWith('/reviews/') ?? false);
  const isDashboardApp = pathname === '/' || pathname === '/demo';
  if (isReviewsApp) {
    return <>{children}</>;
  }
  if (isDashboardApp) {
    return <div className={mainClassName}>{children}</div>;
  }
  return (
    <>
      {header}
      <main className={mainClassName}>{children}</main>
    </>
  );
}
