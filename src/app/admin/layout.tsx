'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AdminRole } from '@/lib/rbac';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';

type Session = {
  name: string;
  email?: string;
  role: AdminRole;
  roleLabel: string;
  permissions: string[];
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;

    let active = true;
    fetch('/api/admin/session')
      .then(async (response) => {
        if (response.status === 401) {
          router.push('/admin/login');
          return null;
        }
        return response.ok ? ((await response.json()) as Session) : null;
      })
      .then((data) => {
        if (active) setSession(data);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [isLoginPage, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <div className="min-h-screen bg-ground font-body text-ink">{children}</div>;
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="admin-shell flex h-screen overflow-hidden bg-ground font-body text-ink">
      {/* Sidebar */}
      <AdminSidebar
        session={session}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        {/* Topbar */}
        <AdminTopbar
          session={session}
          onMenuOpen={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* Page content */}
        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>

      </div>
    </div>
  );
}
