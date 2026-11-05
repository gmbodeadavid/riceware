'use client';

/**
 * charts.tsx — RiceWare CI Admin Charts
 *
 * Client-side chart components built with Recharts.
 * All colors follow the project design system (globals.css @theme tokens).
 *
 * Color palette:
 *   paddy       #2f6b43  (primary green)
 *   paddy-deep  #1f4d30
 *   paddy-soft  #71a57d
 *   bran        #8a6a36  (brown / cost)
 *   husk-deep   #d3a61f  (amber / warning)
 *   danger      #b3401f  (red / reject)
 *   line        #ddd6bf
 *   ink-muted   #5a6456
 *   ground      #f4f1e4
 */

import {
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  paddy: '#2f6b43',
  paddyDeep: '#1f4d30',
  paddySoft: '#71a57d',
  paddyPale: '#93c7a0',
  bran: '#8a6a36',
  huskDeep: '#d3a61f',
  danger: '#b3401f',
  line: '#ddd6bf',
  inkMuted: '#5a6456',
  ground: '#f4f1e4',
  surface: '#fffdf6',
};

const DONUT_PALETTE = [
  C.danger,
  C.huskDeep,
  C.paddy,
  C.bran,
  C.inkMuted,
  C.paddySoft,
  '#7c5cbf',  // violet
  '#1a7a9e',  // teal
];

// ─── Shared tooltip styles ────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: C.surface,
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 12,
  color: '#1c2a20',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};

const tooltipLabelStyle = {
  fontWeight: 700,
  color: '#1c2a20',
  marginBottom: 2,
};

const axisStyle = {
  fontSize: 10,
  fill: C.inkMuted,
  fontFamily: 'inherit',
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Point = { label: string; value: number; detail?: string };

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
  unit = '',
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload?: { detail?: string } }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const detail = payload[0]?.payload?.detail;
  return (
    <div style={tooltipStyle}>
      <p style={tooltipLabelStyle}>{label}</p>
      <p style={{ color: C.paddy, fontWeight: 600, fontSize: 13 }}>
        {typeof val === 'number' ? val.toLocaleString('fr-FR') : val}
        {unit ? ` ${unit}` : ''}
      </p>
      {detail && <p style={{ color: C.inkMuted, fontSize: 11, marginTop: 2 }}>{detail}</p>}
    </div>
  );
}

// ─── LineChart ────────────────────────────────────────────────────────────────
export function LineChart({
  data,
  unit = '',
  color = C.paddy,
}: {
  data: Point[];
  unit?: string;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-ink-muted">
        Pas encore de données sur cette période.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data.map((d) => ({ ...d, name: d.label }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`area-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 5" stroke={C.line} vertical={false} />
        <XAxis
          dataKey="name"
          tick={axisStyle}
          tickLine={false}
          axisLine={{ stroke: C.line }}
        />
        <YAxis
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
        />
        <Tooltip
          content={<CustomTooltip unit={unit} />}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 3' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#area-grad-${color.replace('#', '')})`}
          dot={{ fill: C.surface, stroke: color, strokeWidth: 2, r: 4 }}
          activeDot={{ fill: color, stroke: C.surface, strokeWidth: 2, r: 5.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── BarChart ─────────────────────────────────────────────────────────────────
export function BarChart({
  data,
  unit = '',
  color = C.paddy,
}: {
  data: Point[];
  unit?: string;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-ink-muted">
        Pas encore de données sur cette période.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReBarChart
        data={data.map((d) => ({ ...d, name: d.label }))}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 5" stroke={C.line} vertical={false} />
        <XAxis
          dataKey="name"
          tick={axisStyle}
          tickLine={false}
          axisLine={{ stroke: C.line }}
        />
        <YAxis
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={54}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
        />
        <Tooltip
          content={<CustomTooltip unit={unit} />}
          cursor={{ fill: `${color}12` }}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={56} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}

// ─── Multi-line chart (for comparing 2 series) ────────────────────────────────
export function MultiLineChart({
  data,
  series,
}: {
  data: Array<Record<string, number | string>>;
  series: Array<{ key: string; label: string; color: string; unit?: string }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-ink-muted">
        Pas encore de données sur cette période.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReLineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke={C.line} vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={{ stroke: C.line }} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          cursor={{ stroke: C.line, strokeDasharray: '4 3' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: C.inkMuted, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.5}
            dot={{ fill: C.surface, stroke: s.color, strokeWidth: 2, r: 3.5 }}
            activeDot={{ fill: s.color, stroke: C.surface, strokeWidth: 2, r: 5 }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}

// ─── Grouped BarChart (for comparing 2 series side by side) ──────────────────
export function GroupedBarChart({
  data,
  series,
}: {
  data: Array<Record<string, number | string>>;
  series: Array<{ key: string; label: string; color: string }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-ink-muted">
        Pas encore de données.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReBarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 5" stroke={C.line} vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={{ stroke: C.line }} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: `${C.paddy}0a` }} />
        <Legend wrapperStyle={{ fontSize: 11, color: C.inkMuted, paddingTop: 8 }} iconType="circle" iconSize={8} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={36} />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
}

// ─── DonutChart ───────────────────────────────────────────────────────────────
export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: Array<{ label: string; value: number }>;
  centerLabel: string;
  centerValue: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div
          className="relative flex size-40 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${C.line} 0deg 360deg)` }}
        >
          <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-surface text-center">
            <span className="font-display text-2xl font-bold text-ink">0</span>
            <span className="text-[10px] uppercase tracking-wide text-ink-muted">{centerLabel}</span>
          </div>
        </div>
        <p className="text-sm text-ink-muted">Aucun rebut enregistré.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
        <PieChart width={160} height={160}>
          <Pie
            data={data.map((d) => ({ name: d.label, value: d.value }))}
            cx={78}
            cy={78}
            innerRadius={48}
            outerRadius={72}
            paddingAngle={data.length > 1 ? 2 : 0}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ ...tooltipStyle, fontSize: 11 }}
            formatter={(value: any, name: any) => [
              `${Number(value || 0).toLocaleString('fr-FR')} (${total ? Math.round((Number(value || 0) / total) * 100) : 0} %)`,
              String(name ?? ''),
            ]}
          />
        </PieChart>
        {/* Centre label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-bold text-ink leading-none">{centerValue}</span>
          <span className="mt-0.5 text-[9px] uppercase tracking-widest text-ink-muted">{centerLabel}</span>
        </div>
      </div>

      <ul className="w-full space-y-1.5 text-sm">
        {data.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: DONUT_PALETTE[i % DONUT_PALETTE.length] }}
              aria-hidden="true"
            />
            <span className="flex-1 text-xs text-ink-muted">{item.label}</span>
            <span className="font-mono-brand text-xs font-semibold text-ink">
              {item.value.toLocaleString('fr-FR')}
              <span className="ml-1 font-normal text-ink-muted">
                ({total ? Math.round((item.value / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── RadialProgressChart ──────────────────────────────────────────────────────
export function RadialProgress({
  value,
  max,
  label,
  sublabel,
  color = C.paddy,
}: {
  value: number;
  max: number;
  label: string;
  sublabel?: string;
  color?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-32">
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke={C.line} strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-2xl font-bold text-ink leading-none">
            {pct.toFixed(1).replace('.', ',')}%
          </span>
        </div>
      </div>
      <p className="text-sm font-semibold text-ink">{label}</p>
      {sublabel && <p className="text-xs text-ink-muted">{sublabel}</p>}
    </div>
  );
}

// ─── MiniSparkline (inline, no axes) ─────────────────────────────────────────
export function Sparkline({
  data,
  color = C.paddy,
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
