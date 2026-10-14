import type { ReactNode } from 'react';

export default function SectionLabel({ children, dark }: { children: ReactNode, dark?: boolean }) {
  return (
    <p className={`font-mono-brand text-xs font-medium uppercase tracking-[0.1em] mb-3 ${dark ? 'text-white/75' : 'text-ink-muted'}`}>
      {children}
    </p>
  );
}
