'use client';

import { LuMenu } from 'react-icons/lu';

type Session = {
  name: string;
  email?: string;
  role: string;
  roleLabel: string;
  permissions: string[];
};

const ROLE_TONE: Record<string, string> = {
  admin: 'bg-paddy/15 text-paddy-deep',
  production: 'bg-blue-50 text-blue-700',
  logistics: 'bg-husk-soft text-husk-text',
  sales: 'bg-amber-50 text-amber-700',
  reader: 'bg-grain/60 text-ink-muted',
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
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMenuOpen}
        className="lg:hidden flex size-9 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-grain/60 hover:text-ink"
        aria-label="Ouvrir le menu"
      >
        <LuMenu size={18} aria-hidden="true" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Session info */}
      {session && (
        <div className="flex items-center gap-3">
          <span
            className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              ROLE_TONE[session.role] ?? ROLE_TONE.reader
            }`}
          >
            {session.roleLabel}
          </span>
          <span className="hidden sm:block text-sm font-medium text-ink">{session.name}</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-danger/40 hover:bg-danger/5 hover:text-danger"
          >
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}
