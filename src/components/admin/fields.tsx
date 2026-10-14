import type { ReactNode } from 'react';

const inputBase =
  'w-full rounded-control border border-line px-3 py-2.5 text-base text-ink outline-hidden transition-colors placeholder:text-ink-muted/60 focus:border-paddy focus:ring-2 focus:ring-paddy/20 disabled:opacity-60 sm:text-sm';

/** Champ posé sur une surface claire (`bg-surface`). */
export const inputClassName = `${inputBase} bg-ground`;

/** Champ posé sur un fond `bg-ground` (blocs de contenu). */
export const inputOnGroundClassName = `${inputBase} bg-surface`;

const buttonBase =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paddy disabled:cursor-not-allowed disabled:opacity-50';

const buttonVariants = {
  primary: 'bg-paddy text-on-paddy hover:bg-paddy-deep',
  secondary: 'border border-line bg-surface text-ink hover:border-paddy hover:text-paddy',
  ghost: 'text-ink-muted hover:bg-grain/50 hover:text-ink',
  danger: 'border border-danger/30 bg-surface text-danger hover:bg-danger/10',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClassName(variant: ButtonVariant = 'primary', extra = ''): string {
  return `${buttonBase} ${buttonVariants[variant]} ${extra}`.trim();
}

export function Panel({
  title,
  description,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-panel border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {title ? <h2 className="m-0 font-display text-lg font-semibold text-ink">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  counter,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  counter?: { value: number; max: number };
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">{label}</label>
        {counter ? (
          <span className={`font-mono-brand text-[11px] tabular-nums ${counter.value > counter.max ? 'text-danger' : 'text-ink-muted'}`}>
            {counter.value}/{counter.max}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? <p className="m-0 text-xs leading-5 text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function FormFeedback({
  type,
  message,
  issues,
}: {
  type: 'error' | 'success';
  message: string;
  issues?: string[];
}) {
  const isError = type === 'error';
  const details = issues?.length && issues.join(' ') !== message ? issues : null;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`rounded-control border px-4 py-3 text-sm ${isError ? 'border-danger/30 bg-danger/5 text-danger' : 'border-paddy/30 bg-paddy/5 text-paddy-deep'}`}
    >
      <p className="m-0 font-medium">{message}</p>
      {details ? (
        <ul className="mt-1 list-disc pl-5">
          {details.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
