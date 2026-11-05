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
  LuTrash2,
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
      { href: '/admin/packs', label: 'Lots de packs', icon: LuArchive, permission: 'production:view' },
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
      { href: '/admin/administration/corbeille', label: 'Éléments supprimés', icon: LuTrash2, permission: 'trash:manage' },
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
    <div className="flex h-full w-[248px] flex-col" style={{ background: 'linear-gradient(180deg, #1a2d1f 0%, #1c2a20 100%)' }}>
      {/* ── Logo ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Link href="/admin" className="flex items-center gap-3" onClick={onClose}>
          <div
            className="flex items-center justify-center size-9 rounded-xl shrink-0 shadow-sm"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
          >
            <BrandMark className="h-7 w-auto" />
          </div>
          <div className="leading-none">
            <p className="font-display font-bold text-[15px] text-white">RiceWare CI</p>
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.12em] mt-0.5"
              style={{ color: '#71a57d' }}
            >
              Back-office
            </p>
          </div>
        </Link>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden flex size-8 items-center justify-center rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          aria-label="Fermer le menu"
        >
          <LuX size={18} />
        </button>
      </div>

      {/* ── Nav ──────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Navigation administration">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !session || session.permissions.includes(item.permission),
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.group} className="mb-5">
              <p
                className="mb-1.5 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
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
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                          active
                            ? 'text-white shadow-sm'
                            : 'hover:text-white'
                        }`}
                        style={
                          active
                            ? {
                                background: 'linear-gradient(135deg, #2f6b43 0%, #245835 100%)',
                                boxShadow: '0 2px 8px rgba(47,107,67,0.35)',
                              }
                            : { color: 'rgba(255,255,255,0.65)' }
                        }
                        onMouseEnter={(e) => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = '';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
                          }
                        }}
                      >
                        <Icon
                          size={15}
                          aria-hidden="true"
                          className="shrink-0"
                          style={active ? { color: '#71a57d' } : {}}
                        />
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

      {/* ── User footer ──────────────────────────────── */}
      {session && (
        <div
          className="shrink-0 px-3 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ background: 'linear-gradient(135deg, #2f6b43 0%, #245835 100%)', color: '#fffdf6' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{session.name}</p>
              <p className="truncate text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {session.roleLabel}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop — always visible */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[248px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen shadow-xl">
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
