'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <div className="min-h-screen bg-ground font-body text-ink flex flex-col">
      {!isLoginPage && (
        <header className="bg-surface border-b border-line px-4 py-3">
          <nav className="max-w-page mx-auto flex items-center gap-4">
            <Link href="/admin/articles" className="font-semibold text-paddy hover:text-paddy-deep">
              RiceWare Admin
            </Link>
            <div className="flex-1" />
            <Link href="/admin/articles/new" className="px-3 py-1.5 bg-paddy text-white rounded text-sm hover:bg-paddy-deep transition">
              Nouvel article
            </Link>
            <button
              onClick={async () => {
                await fetch('/api/admin/logout', { method: 'POST' });
                router.push('/admin/login');
              }}
              className="px-3 py-1.5 border border-line text-sm rounded hover:bg-husk-soft transition"
            >
              Déconnexion
            </button>
          </nav>
        </header>
      )}
      <main className="flex-1 max-w-page mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
