'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import BrandMark from '@/components/BrandMark';

const NAV_ITEMS = [
  { href: '/blog/admin/articles', label: 'Articles' },
];

export default function BlogAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/blog/admin/login';
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }

    let active = true;
    fetch('/api/blog-admin/session', { credentials: 'same-origin' })
      .then((res) => {
        if (!active) return;
        if (res.status === 401) {
          router.push('/blog/admin/login');
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        if (active) router.push('/blog/admin/login');
      });

    return () => {
      active = false;
    };
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-gray-50 font-body text-gray-900">
        {children}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-body text-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-screen-xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog/admin/articles" className="flex flex-col items-start leading-none shrink-0">
            <div className="flex items-center gap-2">
              <BrandMark className="h-9 w-auto" />
              <span className="font-display font-bold text-paddy text-[18px] sm:text-[20px] whitespace-nowrap">
                RiceWare CI
              </span>
            </div>
            <span
              className="mt-0.5 ml-[44px] text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: '#059669', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
            >
              Rédaction &amp; blog
            </span>
          </Link>

          <div className="flex-1" />

          <button
            type="button"
            onClick={async () => {
              await fetch('/api/blog-admin/logout', { method: 'POST', credentials: 'same-origin' });
              router.push('/blog/admin/login');
              router.refresh();
            }}
            className="rounded-control border border-line px-3 py-1.5 text-sm hover:bg-husk-soft"
          >
            Déconnexion
          </button>
        </div>

      </header>

      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-line px-4 py-4 text-center text-xs text-ink-muted">
        RiceWare CI — Administration du blog
      </footer>
    </div>
  );
}
