'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AdminRole } from '@/lib/rbac';
import BrandMark from '@/components/BrandMark';

type Session = {
  name: string;
  email?: string;
  role: AdminRole;
  roleLabel: string;
  permissions: string[];
};

const NAV_ITEMS: Array<{ href: string; label: string; permission: string; exact?: boolean }> = [
  { href: '/boutique/articles-admin', label: 'Produits', permission: 'catalog:manage', exact: true },
  { href: '/boutique/articles-admin/commandes', label: 'Commandes', permission: 'orders:view' },
];

const LOGIN_PATH = '/boutique/articles-admin/login';

export default function BoutiqueAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === LOGIN_PATH;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }

    let active = true;
    fetch('/api/boutique-admin/session', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          router.push(`${LOGIN_PATH}?suite=${encodeURIComponent(pathname)}`);
          return;
        }
        if (response.ok) {
          const data = (await response.json()) as Session;
          setSession(data);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) router.push(LOGIN_PATH);
      });

    return () => {
      active = false;
    };
  }, [isLoginPage, pathname, router]);

  // Page de login : rendu minimal sans navigation
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Vérification de session en cours
  if (!ready) {
    return (
      <div className="min-h-screen bg-ground flex items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-line border-t-paddy" />
      </div>
    );
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !session || session.permissions.includes(item.permission),
  );

  return (
    <div className="min-h-screen bg-ground font-body text-ink flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/boutique/articles-admin" className="flex flex-col items-start leading-none shrink-0">
            <div className="flex items-center gap-2">
              <BrandMark className="h-9 w-auto" />
              <span className="font-display font-bold text-paddy text-[18px] sm:text-[20px] whitespace-nowrap">
                RiceWare CI
              </span>
            </div>
            <span
              className="mt-0.5 ml-[44px] text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: '#f97316', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
            >
              Administration catalogue
            </span>
          </Link>
          <div className="flex-1" />

          <button
            type="button"
            onClick={async () => {
              await fetch('/api/boutique-admin/logout', {
                method: 'POST',
                credentials: 'same-origin',
              });
              router.push(LOGIN_PATH);
              router.refresh();
            }}
            className="rounded-control border border-line px-3 py-1.5 text-sm hover:bg-husk-soft"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 min-w-0 overflow-x-hidden mx-auto w-full max-w-page px-4 py-6 sm:px-6 sm:py-8">
        <nav
          aria-label="Navigation boutique administration"
          className="mb-6"
        >
          <ul className="flex gap-1 overflow-x-auto">
            {visibleItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex whitespace-nowrap rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-paddy text-on-paddy'
                        : 'text-ink-muted hover:bg-grain/60 hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {children}
      </main>

      <footer className="border-t border-line px-4 py-4 text-center text-xs text-ink-muted">
        RiceWare CI — Administration catalogue boutique
      </footer>
    </div>
  );
}
