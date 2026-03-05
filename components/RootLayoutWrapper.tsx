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
  if (pathname === '/reviews') {
    return <>{children}</>;
  }
  return (
    <>
      {header}
      <main className={mainClassName}>{children}</main>
    </>
  );
}
