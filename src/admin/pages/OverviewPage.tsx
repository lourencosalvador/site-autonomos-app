import { useState } from 'react';
import {
  ClipboardList, Eye, MonitorSmartphone, RefreshCw, Shield, Star, User, UserPlus, Users,
} from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { BarList, KpiCard } from '../components/blocks';
import { CHART_COLORS, Legend, SignupsChart, TrafficChart } from '../components/charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '../ui/card';
import { Button } from '../ui/button';
import { ErrorBanner, Segmented } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { actionLabel, APP_REQUEST_STATUS, pageLabel, ROLE_LABELS } from '../lib/labels';
import type { ActivityItem, Overview } from '../lib/types';
import { cn, formatNumber, formatTime, timeAgo } from '../lib/utils';

type Range = '7' | '30' | '90';
const DEVICE_LABELS = { mobile: 'Telemóvel', tablet: 'Tablet', desktop: 'Computador' } as const;

export function OverviewPage() {
  const [range, setRange] = useState<Range>('30');
  const [chart, setChart] = useState<'traffic' | 'signups'>('traffic');
  const q = useAdminQuery(() => rpc<Overview>('admin_overview', { p_days: Number(range) }), [range], 60_000);
  const d = q.data;
  const loading = !d;
  const t = d?.traffic;
  const users = d?.users ?? {};

  return (
    <>
      <PageHeader
        title="Visão geral"
        description="O que está a acontecer no site e na app."
        actions={
          <>
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: '7', label: '7 dias' },
                { value: '30', label: '30 dias' },
                { value: '90', label: '90 dias' },
              ]}
            />
            <Button variant="outline" size="sm" onClick={() => void q.reload()} disabled={q.loading} title="Atualiza sozinho a cada minuto">
              <RefreshCw className={cn(q.loading && 'animate-spin')} />
              {q.updatedAt ? formatTime(q.updatedAt) : 'Atualizar'}
            </Button>
          </>
        }
      />

      {q.error && (
        <div className="mb-6">
          <ErrorBanner message={q.error} onRetry={() => void q.reload()} />
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Visitantes únicos"
          icon={Users}
          loading={loading}
          value={t?.visitors ?? 0}
          previous={t?.visitors_prev}
          footnote={`${formatNumber(t?.sessions)} sessões`}
        />
        <KpiCard
          label="Visualizações de página"
          icon={Eye}
          loading={loading}
          value={t?.views ?? 0}
          previous={t?.views_prev}
          footnote={t?.sessions ? pagesPerSession(t.views, t.sessions) : undefined}
        />
        <KpiCard
          label="Pedidos pelo site"
          icon={ClipboardList}
          loading={loading}
          value={d?.site_requests.period ?? 0}
          previous={d?.site_requests.prev}
          footnote={`${formatNumber(d?.site_requests.open)} por tratar`}
        />
        <KpiCard
          label="Novos utilizadores"
          icon={UserPlus}
          loading={loading}
          value={users.new ?? 0}
          previous={users.new_prev}
          footnote={`${formatNumber(users.new_clients)} clientes · ${formatNumber(users.new_professionals)} profissionais`}
        />
      </div>

      {/* Gráfico + utilizadores */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>{chart === 'traffic' ? 'Tráfego do site' : 'Registos na app'}</CardTitle>
              <CardDescription className="mt-1">
                {chart === 'traffic' ? 'Visitantes e visualizações por dia.' : 'Novas contas de clientes e profissionais por dia.'}
              </CardDescription>
            </div>
            <Segmented
              value={chart}
              onChange={setChart}
              options={[
                { value: 'traffic', label: 'Tráfego' },
                { value: 'signups', label: 'Registos' },
              ]}
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : chart === 'traffic' ? (
              <TrafficChart data={d.series} />
            ) : (
              <SignupsChart data={d.series} />
            )}
            <div className="mt-3">
              {chart === 'traffic' ? (
                <Legend items={[{ label: 'Visitantes', color: CHART_COLORS.dark }, { label: 'Visualizações', color: CHART_COLORS.cyan }]} />
              ) : (
                <Legend
                  items={[
                    { label: 'Clientes', color: CHART_COLORS.dark, value: users.new_clients },
                    { label: 'Profissionais', color: CHART_COLORS.cyanLight, value: users.new_professionals },
                  ]}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilizadores da app</CardTitle>
            <CardDescription>Contas registadas, desde sempre.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <UsersBreakdown overview={d} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tráfego detalhado */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Páginas mais vistas</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList loading={loading} items={(d?.top_pages ?? []).map((p) => ({ label: pageLabel(p.path), value: p.views, hint: `${p.visitors} visitantes` }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>De onde vêm</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList loading={loading} items={(d?.referrers ?? []).map((r) => ({ label: r.source, value: r.visitors }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-28" /> : <Devices overview={d} />}</CardContent>
        </Card>
      </div>

      {/* Interesse e app */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>O que procuram</CardTitle>
            <CardDescription>Termos escritos na pesquisa de serviços.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList loading={loading} empty="Ainda ninguém pesquisou neste período." items={(d?.searches ?? []).map((s) => ({ label: s.label, value: s.count }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Serviços mais pedidos</CardTitle>
            <CardDescription>Cliques em “Solicitar” por categoria.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList loading={loading} items={(d?.service_clicks ?? []).map((s) => ({ label: s.label, value: s.count }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pedidos na app</CardTitle>
            <CardDescription>Criados no período selecionado.</CardDescription>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-28" /> : <AppRequests overview={d} />}</CardContent>
        </Card>
      </div>

      {/* Atividade */}
      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Atividade recente</CardTitle>
          <a href="#/admin/atividade" className="text-[13px] font-medium text-zinc-500 hover:text-zinc-950">
            Ver tudo
          </a>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {loading ? (
            <div className="space-y-3 px-5 pb-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : d.recent.length === 0 ? (
            <p className="px-5 pb-6 pt-2 text-center text-[13px] text-zinc-400">Sem atividade registada.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {d.recent.map((item, i) => <ActivityRow key={`${item.kind}-${item.at}-${i}`} item={item} />)}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function UsersBreakdown({ overview }: { overview: Overview }) {
  const u = overview.users;
  const total = u.total ?? 0;
  const clients = u.clients ?? 0;
  const pros = u.professionals ?? 0;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <div className="flex h-full flex-col">
      <p className="text-[28px] font-semibold leading-tight tracking-tight tabular-nums">{formatNumber(total)}</p>
      <p className="text-xs text-zinc-500">contas no total</p>

      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-zinc-100">
        <div style={{ width: `${pct(clients)}%`, background: CHART_COLORS.dark }} />
        <div style={{ width: `${pct(pros)}%`, background: CHART_COLORS.cyanLight }} />
      </div>

      <dl className="mt-4 space-y-2.5 text-[13px]">
        {[
          { label: 'Clientes', value: clients, color: CHART_COLORS.dark },
          { label: 'Profissionais', value: pros, color: CHART_COLORS.cyanLight },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-zinc-600">
              <span className="size-2 rounded-sm" style={{ background: row.color }} />
              {row.label}
            </dt>
            <dd className="tabular-nums">
              <span className="font-medium text-zinc-950">{formatNumber(row.value)}</span>
              <span className="ml-2 text-zinc-400">{pct(row.value).toFixed(0)}%</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4">
        <MiniStat label="Candidaturas pendentes" value={overview.applications?.pending ?? 0} href="#/admin/candidaturas" />
        <MiniStat label="Contas suspensas" value={u.suspended ?? 0} href="#/admin/utilizadores" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} className="rounded-lg border border-zinc-100 px-3 py-2.5 transition-colors hover:border-zinc-200 hover:bg-zinc-50">
      <p className="text-lg font-semibold tabular-nums">{formatNumber(value)}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </a>
  );
}

function Devices({ overview }: { overview: Overview }) {
  const total = overview.devices.reduce((s, x) => s + x.visitors, 0);
  if (!total) return <p className="py-6 text-center text-[13px] text-zinc-400">Ainda sem dados neste período.</p>;
  const colors = { mobile: CHART_COLORS.dark, desktop: CHART_COLORS.cyan, tablet: '#a1a1aa' };
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100">
        {overview.devices.map((x) => (
          <div key={x.device} style={{ width: `${(x.visitors / total) * 100}%`, background: colors[x.device] }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5 text-[13px]">
        {overview.devices.map((x) => (
          <li key={x.device} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-600">
              <span className="size-2 rounded-sm" style={{ background: colors[x.device] }} />
              {DEVICE_LABELS[x.device] ?? x.device}
            </span>
            <span className="tabular-nums">
              <span className="font-medium text-zinc-950">{((x.visitors / total) * 100).toFixed(0)}%</span>
              <span className="ml-2 text-zinc-400">{formatNumber(x.visitors)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400">
        <MonitorSmartphone className="size-3.5" /> Por visitante único
      </p>
    </div>
  );
}

function AppRequests({ overview }: { overview: Overview }) {
  const r = overview.app_requests;
  if (!r) return <p className="py-6 text-center text-[13px] text-zinc-400">Sem dados de pedidos da app.</p>;
  const rows = [
    { key: 'pending', value: r.pending },
    { key: 'accepted', value: r.accepted },
    { key: 'completed', value: r.completed },
    { key: 'cancelled', value: r.cancelled, label: 'Cancelados / rejeitados' },
  ];
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <p className="text-[28px] font-semibold leading-tight tracking-tight tabular-nums">{formatNumber(r.period)}</p>
        <p className="text-xs text-zinc-500">pedidos</p>
      </div>
      <dl className="mt-3 space-y-2 text-[13px]">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between">
            <dt className="text-zinc-600">{row.label ?? APP_REQUEST_STATUS[row.key]}</dt>
            <dd className="font-medium tabular-nums">{formatNumber(row.value)}</dd>
          </div>
        ))}
      </dl>
      {overview.reviews && overview.reviews.count > 0 && (
        <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3 text-[13px] text-zinc-600">
          <Star className="size-4 fill-brand-cyan2 text-brand-cyan2" />
          <span className="font-medium text-zinc-950 tabular-nums">{Number(overview.reviews.average).toLocaleString('pt-PT')}</span>
          média de {formatNumber(overview.reviews.count)} avaliações
        </div>
      )}
    </div>
  );
}

const KIND_ICON = { site_request: ClipboardList, application: UserPlus, signup: User, admin: Shield };

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = KIND_ICON[item.kind];
  const who = <span className="font-medium text-zinc-950">{item.title || 'Alguém'}</span>;
  let text: React.ReactNode;
  switch (item.kind) {
    case 'site_request':
      text = <>{who} pediu um serviço de <span className="text-zinc-950">{item.detail}</span></>;
      break;
    case 'application':
      text = <>{who} candidatou-se como profissional{item.detail ? <> em <span className="text-zinc-950">{item.detail}</span></> : null}</>;
      break;
    case 'signup':
      text = <>{who} criou conta como {ROLE_LABELS[(item.detail as 'client' | 'professional') ?? 'client']?.toLowerCase() ?? 'cliente'}</>;
      break;
    default:
      text = <>{who} {actionLabel(item.detail ?? '')}</>;
  }
  return (
    <li className="flex items-center gap-3 px-5 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500">
        <Icon className="size-4" />
      </div>
      <p className="min-w-0 flex-1 truncate text-[13px] text-zinc-600">{text}</p>
      <span className="shrink-0 text-xs text-zinc-400">{timeAgo(item.at)}</span>
    </li>
  );
}

function pagesPerSession(views: number, sessions: number) {
  const n = views / sessions;
  return `${n.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} ${n === 1 ? 'página' : 'páginas'} por sessão`;
}
