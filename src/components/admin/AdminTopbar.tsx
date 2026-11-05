'use client';

import { LuMenu, LuBell, LuSearch, LuLogOut } from 'react-icons/lu';

type Session = {
  name: string;
  email?: string;
  role: string;
  roleLabel: string;
  permissions: string[];
};

const ROLE_TONE: Record<string, { bg: string; text: string; dot: string }> = {
  admin: { bg: 'bg-paddy/10', text: 'text-paddy-deep', dot: '#2f6b43' },
  production: { bg: 'bg-blue-50', text: 'text-blue-700', dot: '#1d4ed8' },
  logistics: { bg: 'bg-husk-soft', text: 'text-husk-text', dot: '#d3a61f' },
  sales: { bg: 'bg-amber-50', text: 'text-amber-700', dot: '#d97706' },
  reader: { bg: 'bg-grain/60', text: 'text-ink-muted', dot: '#5a6456' },
};

export default function AdminTopbar({
  session,
  onMenuOpen,
  onLogout,
}: {
  session: Session | null;
  onMenuOpen: () => void;
  onLogout: () => void;
}) {
  const roleTone = session ? (ROLE_TONE[session.role] ?? ROLE_TONE.reader) : ROLE_TONE.reader;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/95 backdrop-blur-sm px-4 sm:px-6">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMenuOpen}
        className="lg:hidden flex size-9 items-center justify-center rounded-xl border border-line text-ink-muted hover:bg-grain/60 hover:text-ink transition-colors"
        aria-label="Ouvrir le menu"
      >
        <LuMenu size={18} aria-hidden="true" />
      </button>

      {/* Search bar placeholder (desktop) */}
      <div className="hidden md:flex flex-1 max-w-xs">
        <div className="flex w-full items-center gap-2 rounded-xl border border-line bg-ground/60 px-3 py-1.5 text-sm text-ink-muted cursor-default">
          <LuSearch size={14} aria-hidden="true" className="shrink-0" />
          <span className="select-none text-xs">Rechercher…</span>
          <kbd className="ml-auto text-[10px] font-mono bg-line/60 rounded px-1 py-0.5 leading-none hidden lg:block">⌘K</kbd>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side controls */}
      {session && (
        <div className="flex items-center gap-2">
          {/* Role badge */}
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleTone.bg} ${roleTone.text}`}
          >
            <span
              className="size-1.5 rounded-full shrink-0"
              style={{ backgroundColor: roleTone.dot }}
              aria-hidden="true"
            />
            {session.roleLabel}
          </span>

          {/* Name */}
          <span className="hidden sm:block text-sm font-medium text-ink mx-1">
            {session.name}
          </span>

          {/* Notifications bell (placeholder) */}
          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted hover:bg-grain/50 hover:text-ink transition-colors"
            aria-label="Notifications"
          >
            <LuBell size={16} aria-hidden="true" />
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-all hover:border-danger/40 hover:bg-danger/5 hover:text-danger"
            aria-label="Déconnexion"
          >
            <LuLogOut size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      )}
    </header>
  );
}
