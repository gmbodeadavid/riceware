'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandMark from '@/components/BrandMark';
import {
  LuLayoutDashboard,
  LuTrendingUp,
  LuPackage,
  LuFactory,
  LuShieldCheck,
  LuArchive,
  LuShoppingBag,
  LuLeaf,
  LuUsers,
  LuFileText,
  LuChartBar,
  LuUserCog,
  LuSettings,
  LuX,
} from 'react-icons/lu';

type Session = {
  name: string;
  email?: string;
  role: string;
  roleLabel: string;
  permissions: string[];
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permission: string;
  exact?: boolean;
};

const NAV_GROUPS: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Vue générale',
    items: [
      { href: '/admin', label: 'Tableau de bord', icon: LuLayoutDashboard, permission: 'dashboard:view', exact: true },
      { href: '/admin/analytics', label: 'Analyses', icon: LuTrendingUp, permission: 'dashboard:view' },
    ],
  },
  {
    group: 'Production',
    items: [
      { href: '/admin/lots', label: 'Lots de coques', icon: LuPackage, permission: 'lots:view' },
      { href: '/admin/production', label: 'Production', icon: LuFactory, permission: 'production:view' },
      { href: '/admin/qualite', label: 'Qualité', icon: LuShieldCheck, permission: 'quality:view' },
      { href: '/admin/stocks', label: 'Stocks', icon: LuArchive, permission: 'stocks:view' },
    ],
  },
  {
    group: 'Commerce',
    items: [
      { href: '/admin/commandes', label: 'Commandes', icon: LuShoppingBag, permission: 'orders:view' },
      { href: '/admin/rizieries', label: 'Rizeries', icon: LuLeaf, permission: 'lots:view' },
      { href: '/admin/partenaires', label: 'Partenaires', icon: LuUsers, permission: 'partners:view' },
      { href: '/admin/documents', label: 'Documents', icon: LuFileText, permission: 'documents:view' },
      { href: '/admin/rapports', label: 'Rapports', icon: LuChartBar, permission: 'reports:view' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: LuUserCog, permission: 'users:manage' },
      { href: '/admin/parametres', label: 'Paramètres', icon: LuSettings, permission: 'settings:manage' },
    ],
  },
];

export default function AdminSidebar({
  session,
  isOpen,
  onClose,
}: {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const initials = session?.name
    ? session.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const sidebarContent = (
    <div className="flex h-full w-[240px] flex-col bg-ink text-white">
      {/* Logo */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="flex items-center justify-center size-9 bg-surface rounded-lg shrink-0">
            <BrandMark className="h-7 w-auto" />
          </div>
          <div className="leading-none">
            <p className="font-display font-bold text-[15px] text-white">RiceWare CI</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-paddy-soft mt-0.5">Back-office</p>
          </div>
        </Link>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden flex size-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Fermer le menu"
        >
          <LuX size={18} />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="Navigation administration">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !session || session.permissions.includes(item.permission),
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.group} className="mb-4">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35">
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={onClose}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-paddy text-on-paddy'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon size={16} aria-hidden="true" className="shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      {session && (
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paddy text-[11px] font-bold text-on-paddy">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{session.name}</p>
              <p className="truncate text-[11px] text-white/50">{session.roleLabel}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop — always visible */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile — drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
