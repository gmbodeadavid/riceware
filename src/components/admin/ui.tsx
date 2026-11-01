import type { ReactNode } from 'react';
import Link from 'next/link';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const TONES = {
  default: 'border-line bg-surface',
  paddy: 'border-paddy/25 bg-paddy/5',
  warning: 'border-husk-deep/30 bg-husk-soft/70',
  danger: 'border-danger/25 bg-danger/5',
} as const;

const ICON_TONES = {
  default: 'bg-grain/70 text-ink-muted',
  paddy: 'bg-paddy/15 text-paddy',
  warning: 'bg-husk-soft text-husk-text',
  danger: 'bg-danger/10 text-danger',
} as const;

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  href?: string;
}) {
  const inner = (
    <div className={`group rounded-panel border p-4 sm:p-5 transition-all ${TONES[tone]} ${href ? 'hover:shadow-sm hover:-translate-y-px cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        {icon ? (
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${ICON_TONES[tone]}`}>
            {icon}
          </div>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-ink-muted">{hint}</p> : null}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

const BADGE_TONES = {
  neutral: 'bg-grain/60 text-ink-muted',
  success: 'bg-paddy/10 text-paddy-deep',
  warning: 'bg-husk-soft text-husk-text',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-blue-50 text-blue-700',
} as const;

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Section({ title, description, actions, children }: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-panel border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'secondary',
  target,
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  target?: string;
}) {
  const className =
    variant === 'primary'
      ? 'inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep'
      : 'inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-paddy hover:text-paddy';
  return (
    <Link href={href} target={target} className={className}>
      {children}
    </Link>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-ink-muted">
          <span>{label}</span>
          <span className="font-semibold text-ink">{safe.toFixed(1).replace('.', ',')} %</span>
        </div>
      ) : null}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-grain/70" role="progressbar" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-paddy" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

/** Thin labeled divider to visually separate KPI groups on the dashboard */
export function KpiGroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-center gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{children}</p>
      <div className="flex-1 border-t border-line" />
    </div>
  );
}
