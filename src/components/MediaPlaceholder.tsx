export default function MediaPlaceholder({
  title,
  detail,
  className = 'aspect-[4/3]',
}: {
  title: string;
  detail: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${title}. ${detail}`}
      className={`flex ${className} flex-col items-center justify-center gap-2 rounded-md border border-dashed border-paddy/35 bg-paddy/5 p-4 text-center text-paddy-deep`}
    >
      <svg width="28" height="24" viewBox="0 0 28 24" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="26" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
        <circle cx="9" cy="8" r="2" fill="currentColor" />
        <path d="M3 20l7-7 4 4 3-3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-mono-brand text-[10px] font-semibold uppercase tracking-[0.08em]">{title}</span>
      <span className="max-w-sm text-xs leading-5 text-ink-muted">{detail}</span>
    </div>
  );
}
