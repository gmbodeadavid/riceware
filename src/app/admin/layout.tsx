'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token && pathname !== '/admin/login') {
      router.push('/admin/login');
    } else if (token) {
      setAuthed(true);
    }
    setChecking(false);
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-paddy"></div>
      </div>
    );
  }

  if (!authed && pathname !== '/admin/login') {
    return null;
  }

  return (
    <div className="min-h-screen bg-ground font-body text-ink flex flex-col">
      {authed && (
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
              onClick={() => {
                localStorage.removeItem('admin_token');
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