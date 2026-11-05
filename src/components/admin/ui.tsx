import type { ReactNode } from 'react';
import Link from 'next/link';

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-ink-muted" aria-label="Fil d'Ariane">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className="text-line">›</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-paddy transition-colors">{crumb.label}</Link>
              ) : (
                <span className="font-medium text-ink">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm text-ink-muted leading-relaxed">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
const TONES = {
  default: {
    card: 'border-line bg-surface hover:border-line/80',
    icon: 'bg-grain/70 text-ink-muted',
    value: 'text-ink',
  },
  paddy: {
    card: 'border-paddy/25 bg-paddy/5 hover:border-paddy/40',
    icon: 'bg-paddy/15 text-paddy',
    value: 'text-paddy-deep',
  },
  warning: {
    card: 'border-husk-deep/30 bg-husk-soft/60 hover:border-husk-deep/50',
    icon: 'bg-husk-soft text-husk-text',
    value: 'text-husk-text',
  },
  danger: {
    card: 'border-danger/25 bg-danger/5 hover:border-danger/40',
    icon: 'bg-danger/10 text-danger',
    value: 'text-danger',
  },
} as const;

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  href,
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  href?: string;
  /** Optional trend: positive = good, negative = bad */
  trend?: { value: number; label?: string };
}) {
  const t = TONES[tone];

  const inner = (
    <div
      className={`group relative rounded-panel border p-4 sm:p-5 transition-all duration-200 ${t.card} ${
        href ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {icon ? (
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${t.icon} transition-transform group-hover:scale-105`}
          >
            {icon}
          </div>
        ) : null}
      </div>

      <p className={`mt-2.5 font-display text-2xl font-bold leading-tight sm:text-3xl ${t.value}`}>
        {value}
      </p>

      {hint ? (
        <p className="mt-1.5 text-xs leading-5 text-ink-muted">{hint}</p>
      ) : null}

      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium">
          <span
            className={
              trend.value > 0
                ? 'text-paddy-deep'
                : trend.value < 0
                ? 'text-danger'
                : 'text-ink-muted'
            }
          >
            {trend.value > 0 ? '↑' : trend.value < 0 ? '↓' : '→'}{' '}
            {Math.abs(trend.value).toFixed(1).replace('.', ',')}%
          </span>
          {trend.label && (
            <span className="text-ink-muted font-normal">{trend.label}</span>
          )}
        </div>
      )}

      {href && (
        <div
          className="pointer-events-none absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-ink-muted"
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const BADGE_TONES = {
  neutral: 'bg-grain/60 text-ink-muted',
  success: 'bg-paddy/10 text-paddy-deep ring-1 ring-paddy/20',
  warning: 'bg-husk-soft text-husk-text ring-1 ring-husk-deep/20',
  danger: 'bg-danger/10 text-danger ring-1 ring-danger/20',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
} as const;

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-panel border border-dashed border-line bg-ground/50 px-6 py-10 text-center">
      {icon ? (
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-grain/60 text-ink-muted">
          {icon}
        </div>
      ) : null}
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
export function Section({
  title,
  description,
  actions,
  children,
  noPad,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  noPad?: boolean;
}) {
  return (
    <section className="rounded-panel border border-line bg-surface overflow-hidden">
      <div className={`flex flex-wrap items-start justify-between gap-3 px-5 pt-5 ${noPad ? 'pb-4' : 'pb-0'} sm:px-6 sm:pt-6`}>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
      <div className={noPad ? '' : 'px-5 pb-5 pt-4 sm:px-6 sm:pb-6'}>{children}</div>
    </section>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────
export function DataTable({
  headers,
  children,
  minWidth,
}: {
  headers: string[];
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-sm ${minWidth ? `min-w-[${minWidth}]` : ''}`}>
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
            {headers.map((h, i) => (
              <th key={i} className="pb-2.5 pr-3 font-semibold last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function DataRow({ children, href }: { children: ReactNode; href?: string }) {
  const tr = (
    <tr className={`border-b border-line/50 last:border-0 ${href ? 'hover:bg-ground/40 cursor-pointer transition-colors' : ''}`}>
      {children}
    </tr>
  );
  return tr;
}

export function DataCell({ children, muted, mono }: { children: ReactNode; muted?: boolean; mono?: boolean }) {
  return (
    <td
      className={`py-2.5 pr-3 last:pr-0 ${muted ? 'text-ink-muted' : ''} ${mono ? 'font-mono-brand text-xs' : ''}`}
    >
      {children}
    </td>
  );
}

// ─── LinkButton ───────────────────────────────────────────────────────────────
export function LinkButton({
  href,
  children,
  variant = 'secondary',
  target,
  icon,
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  target?: string;
  icon?: ReactNode;
}) {
  const cls =
    variant === 'primary'
      ? 'inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-paddy px-4 py-2 text-sm font-semibold text-on-paddy shadow-sm transition-all hover:bg-paddy-deep hover:shadow-md active:scale-[0.98]'
      : variant === 'danger'
      ? 'inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-danger/10 px-4 py-2 text-sm font-semibold text-danger ring-1 ring-danger/25 transition-all hover:bg-danger/20 hover:ring-danger/40 active:scale-[0.98]'
      : 'inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-sm transition-all hover:border-paddy/50 hover:text-paddy hover:shadow active:scale-[0.98]';

  return (
    <Link href={href} target={target} className={cls}>
      {icon}
      {children}
    </Link>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({
  value,
  label,
  color,
  size = 'md',
}: {
  value: number;
  label?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const safe = Math.max(0, Math.min(100, value));
  const heightCls = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-4' : 'h-2.5';
  const bgColor =
    safe >= 90 ? '#2f6b43' : safe >= 60 ? '#d3a61f' : '#b3401f';

  return (
    <div>
      {label ? (
        <div className="mb-1.5 flex justify-between text-xs text-ink-muted">
          <span>{label}</span>
          <span className="font-semibold text-ink">{safe.toFixed(1).replace('.', ',')} %</span>
        </div>
      ) : null}
      <div
        className={`${heightCls} w-full overflow-hidden rounded-full bg-grain/70`}
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${safe}%`, backgroundColor: color ?? bgColor }}
        />
      </div>
    </div>
  );
}

// ─── KpiGroupLabel ────────────────────────────────────────────────────────────
export function KpiGroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-7 mb-2.5 flex items-center gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted whitespace-nowrap">
        {children}
      </p>
      <div className="flex-1 border-t border-line/70" />
    </div>
  );
}

// ─── AlertBanner ─────────────────────────────────────────────────────────────
export function AlertBanner({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'danger' | 'success';
}) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    warning: 'border-husk-deep/30 bg-husk-soft/80 text-husk-text',
    danger: 'border-danger/30 bg-danger/5 text-danger',
    success: 'border-paddy/25 bg-paddy/5 text-paddy-deep',
  };
  return (
    <div className={`mb-5 rounded-control border px-4 py-3 text-sm ${styles[tone]}`} role="alert">
      {children}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  if (label) {
    return (
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 border-t border-line" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted px-1">
          {label}
        </span>
        <div className="flex-1 border-t border-line" />
      </div>
    );
  }
  return <div className="my-4 border-t border-line" />;
}
