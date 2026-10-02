import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Overview } from '../lib/types';
import { formatDay, formatNumber } from '../lib/utils';

const BRAND_DARK = '#03475E';
const BRAND_CYAN = '#0AC8E0';
const BRAND_CYAN_LIGHT = '#02E6FF';

type Series = Overview['series'];

const axis = { fontSize: 11, fill: '#a1a1aa' };

function ChartTooltip({ active, payload, label, names }: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  names: Record<string, string>;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="min-w-[150px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-zinc-950">{formatDay(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <span className="size-2 rounded-sm" style={{ background: p.color }} />
            {names[p.dataKey]}
          </span>
          <span className="font-medium text-zinc-950 tabular-nums">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Mostra no máximo ~8 datas no eixo, para não amontoar. */
const tickInterval = (n: number) => Math.max(0, Math.ceil(n / 8) - 1);

export function TrafficChart({ data }: { data: Series }) {
  const names = { visitors: 'Visitantes', views: 'Visualizações' };
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_CYAN} stopOpacity={0.22} />
            <stop offset="100%" stopColor={BRAND_CYAN} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_DARK} stopOpacity={0.18} />
            <stop offset="100%" stopColor={BRAND_DARK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f4f4f5" />
        <XAxis dataKey="date" tickFormatter={formatDay} tick={axis} tickLine={false} axisLine={false} interval={tickInterval(data.length)} tickMargin={8} />
        <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={<ChartTooltip names={names} />} cursor={{ stroke: '#e4e4e7' }} />
        <Area type="monotone" dataKey="views" stroke={BRAND_CYAN} strokeWidth={2} fill="url(#fillViews)" dot={false} activeDot={{ r: 3.5 }} />
        <Area type="monotone" dataKey="visitors" stroke={BRAND_DARK} strokeWidth={2} fill="url(#fillVisitors)" dot={false} activeDot={{ r: 3.5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SignupsChart({ data }: { data: Series }) {
  const names = { clients: 'Clientes', professionals: 'Profissionais' };
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="#f4f4f5" />
        <XAxis dataKey="date" tickFormatter={formatDay} tick={axis} tickLine={false} axisLine={false} interval={tickInterval(data.length)} tickMargin={8} />
        <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={<ChartTooltip names={names} />} cursor={{ fill: '#fafafa' }} />
        <Bar dataKey="clients" stackId="u" fill={BRAND_DARK} radius={[0, 0, 0, 0]} />
        <Bar dataKey="professionals" stackId="u" fill={BRAND_CYAN_LIGHT} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: number }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="size-2 rounded-sm" style={{ background: i.color }} />
          {i.label}
          {i.value !== undefined && <span className="font-medium text-zinc-900 tabular-nums">{formatNumber(i.value)}</span>}
        </span>
      ))}
    </div>
  );
}

export const CHART_COLORS = { dark: BRAND_DARK, cyan: BRAND_CYAN, cyanLight: BRAND_CYAN_LIGHT };
