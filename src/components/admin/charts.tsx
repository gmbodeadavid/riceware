import { formatNumber } from '@/lib/format';

type Point = { label: string; value: number; detail?: string };

export function LineChart({ data, unit = '' }: { data: Point[]; unit?: string }) {
  const width = 720;
  const height = 240;
  const padding = { top: 20, right: 18, bottom: 38, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((point) => point.value));
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;

  const coords = data.map((point, index) => ({
    x: padding.left + index * stepX,
    y: padding.top + innerHeight - (point.value / max) * innerHeight,
    ...point,
  }));

  const linePath = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${(padding.left + innerWidth).toFixed(1)} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Évolution de la production" className="h-auto w-full">
        <defs>
          <linearGradient id="production-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6b43" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2f6b43" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y = padding.top + innerHeight - tick * innerHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#ddd6bf" strokeWidth="1" strokeDasharray={tick === 0 ? undefined : '3 4'} />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#5a6456">
                {Math.round(tick * max).toLocaleString('fr-FR')}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#production-area)" />
        <path d={linePath} fill="none" stroke="#2f6b43" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />

        {coords.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="3.6" fill="#fffdf6" stroke="#2f6b43" strokeWidth="2" />
            <title>{`${point.label} : ${formatNumber(point.value, unit)}${point.detail ? ` — ${point.detail}` : ''}`}</title>
            <text x={point.x} y={height - 14} textAnchor="middle" fontSize="9.5" fill="#5a6456">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function BarChart({
  data,
  unit = '',
  color = '#2f6b43',
}: {
  data: Point[];
  unit?: string;
  color?: string;
}) {
  const width = 720;
  const height = 230;
  const padding = { top: 18, right: 16, bottom: 40, left: 54 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((point) => point.value));
  const slot = innerWidth / Math.max(1, data.length);
  const barWidth = Math.min(54, slot * 0.58);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Histogramme" className="h-auto w-full">
        {[0, 0.5, 1].map((tick) => {
          const y = padding.top + innerHeight - tick * innerHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#ddd6bf" strokeDasharray={tick === 0 ? undefined : '3 4'} />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#5a6456">
                {Math.round(tick * max).toLocaleString('fr-FR')}
              </text>
            </g>
          );
        })}
        {data.map((point, index) => {
          const barHeight = (point.value / max) * innerHeight;
          const x = padding.left + index * slot + (slot - barWidth) / 2;
          const y = padding.top + innerHeight - barHeight;
          return (
            <g key={point.label}>
              <rect x={x} y={y} width={barWidth} height={Math.max(1, barHeight)} rx="3" fill={color} opacity="0.88" />
              <title>{`${point.label} : ${formatNumber(point.value, unit)}`}</title>
              <text x={x + barWidth / 2} y={height - 16} textAnchor="middle" fontSize="9.5" fill="#5a6456">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const DONUT_COLORS = ['#b3401f', '#d3a61f', '#2f6b43', '#8a6a36', '#5a6456', '#71a57d'];

export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: Array<{ label: string; value: number }>;
  centerLabel: string;
  centerValue: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let angle = 0;
  const segments = data.map((item, index) => {
    const start = angle;
    const sweep = total ? (item.value / total) * 360 : 0;
    angle += sweep;
    return { ...item, start, end: angle, color: DONUT_COLORS[index % DONUT_COLORS.length] };
  });

  const gradient = total
    ? `conic-gradient(${segments.map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`).join(', ')})`
    : 'conic-gradient(#eae0ba 0deg 360deg)';

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative size-40 shrink-0 rounded-full" style={{ background: gradient }}>
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-surface text-center">
          <span className="font-display text-2xl font-bold">{centerValue}</span>
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.length === 0 ? (
          <li className="text-ink-muted">Aucun rebut enregistré.</li>
        ) : (
          segments.map((segment) => (
            <li key={segment.label} className="flex items-center gap-2">
              <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: segment.color }} aria-hidden="true" />
              <span className="flex-1 text-ink-muted">{segment.label}</span>
              <span className="font-mono-brand text-xs font-semibold text-ink">
                {segment.value} ({total ? Math.round((segment.value / total) * 100) : 0} %)
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
