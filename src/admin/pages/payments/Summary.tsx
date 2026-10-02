import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, ArrowDownToLine, CheckCircle2, Clock, Landmark, Lock, Receipt, RefreshCw, TrendingUp, Wallet,
} from 'lucide-react';
import { Delta } from '../../components/blocks';
import { CHART_COLORS, Legend } from '../../components/charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '../../ui/card';
import { Button } from '../../ui/button';
import { ErrorBanner, Segmented } from '../../ui/misc';
import { appypayAdmin, rpc, useAdminQuery } from '../../lib/api';
import { formatMoney, formatMoneyCompact, methodLabel } from '../../lib/money';
import type { AppyPayStatus, MoneyCtx, PaymentsOverview } from '../../lib/types';
import { cn, formatDay, formatNumber, formatTime, timeAgo } from '../../lib/utils';

type Range = '7' | '30' | '90';

export function Summary({ onOpenTab }: { onOpenTab: (tab: 'transacoes' | 'cobrancas' | 'saques' | 'prestadores') => void }) {
  const [range, setRange] = useState<Range>('30');
  const q = useAdminQuery(() => rpc<PaymentsOverview>('admin_payments_overview', { p_days: Number(range) }), [range], 60_000);
  const d = q.data;
  const ctx: MoneyCtx = { currency: d?.currency ?? 'AOA', factor: d?.factor ?? 100 };
  const m = (v?: number | null) => formatMoney(v ?? 0, ctx);
  const t = d?.totals;

  return (
    <div className="space-y-4">
      <AppyPayBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: '7 dias' },
            { value: '30', label: '30 dias' },
            { value: '90', label: '90 dias' },
          ]}
        />
        <Button variant="outline" size="sm" onClick={() => void q.reload()} disabled={q.loading}>
          <RefreshCw className={cn(q.loading && 'animate-spin')} />
          {q.updatedAt ? formatTime(q.updatedAt) : 'Atualizar'}
        </Button>
      </div>

      {q.error && <ErrorBanner message={q.error} onRetry={() => void q.reload()} />}

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MoneyKpi label="Total recebido" icon={TrendingUp} loading={!d} value={m(t?.gross)} current={t?.gross} previous={t?.gross_prev}
          footnote={`${formatNumber(t?.count)} pagamentos`} />
        <MoneyKpi label="Receita AUTONOMOUS" icon={Landmark} loading={!d} value={m(t?.platform)} current={t?.platform} previous={t?.platform_prev}
          footnote="taxas de pedido + serviço" />
        <MoneyKpi label="Retido em escrow" icon={Lock} loading={!d} value={m(t?.escrow_held)}
          footnote={`${formatNumber(t?.escrow_held_count)} serviços por concluir`} onClick={() => onOpenTab('transacoes')} />
        <MoneyKpi label="Saques pendentes" icon={ArrowDownToLine} loading={!d} value={m(d?.withdrawals.pending)}
          footnote={`${formatNumber(d?.withdrawals.pending_count)} pedidos por pagar`} onClick={() => onOpenTab('saques')} />
      </div>

      {/* Faixa de detalhe */}
      <Card>
        <div className="grid grid-cols-2 divide-zinc-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
          {[
            { label: 'Ticket médio', value: t && t.count ? m(Math.round(t.gross / t.count / ctx.factor) * ctx.factor) : '—' },
            { label: 'Taxas dos clientes', value: m(t?.request_fees) },
            { label: 'Taxas dos prestadores', value: m(t?.service_fees) },
            { label: 'Bónus de urgência', value: m(t?.urgent) },
            { label: 'Libertado aos prestadores', value: m(t?.released_period) },
            { label: 'Disponível para saque', value: m(d?.provider_available), hint: 'Libertado e ainda não levantado' },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3.5 sm:px-5" title={s.hint}>
              <p className="text-xs text-zinc-500">{s.label}</p>
              {d ? <p className="mt-1 text-[15px] font-semibold tabular-nums text-zinc-950">{s.value}</p> : <Skeleton className="mt-1.5 h-5 w-20" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Gráfico + cobranças */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Entradas por dia</CardTitle>
            <CardDescription>Total pago pelos clientes e a parte que fica para a AUTONOMOUS.</CardDescription>
          </CardHeader>
          <CardContent>
            {!d ? <Skeleton className="h-[260px] w-full" /> : <MoneyChart data={d.series} ctx={ctx} />}
            <div className="mt-3">
              <Legend items={[{ label: 'Recebido', color: CHART_COLORS.cyan }, { label: 'Receita', color: CHART_COLORS.dark }]} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Cobranças AppyPay</CardTitle>
              <CardDescription className="mt-1">Referências e Multicaixa Express.</CardDescription>
            </div>
            <button type="button" onClick={() => onOpenTab('cobrancas')} className="text-[13px] font-medium text-zinc-500 hover:text-zinc-950">Ver</button>
          </CardHeader>
          <CardContent>{!d ? <Skeleton className="h-48" /> : <ChargesBox d={d} money={m} />}</CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Por método de pagamento</CardTitle></CardHeader>
          <CardContent>
            <MoneyBars loading={!d} money={m} items={(d?.methods ?? []).map((x) => ({ label: methodLabel(x.method), value: x.amount, count: x.count }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Prestadores que mais faturam</CardTitle>
            <button type="button" onClick={() => onOpenTab('prestadores')} className="text-[13px] font-medium text-zinc-500 hover:text-zinc-950">Saldos</button>
          </CardHeader>
          <CardContent>
            <MoneyBars loading={!d} money={m} items={(d?.top_providers ?? []).map((x) => ({ label: x.name, value: x.amount, count: x.count }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Serviços que mais faturam</CardTitle></CardHeader>
          <CardContent>
            <MoneyBars loading={!d} money={m} items={(d?.top_services ?? []).map((x) => ({ label: x.label, value: x.amount, count: x.count }))} />
          </CardContent>
        </Card>
      </div>

      {/* Últimos pagamentos */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Últimos pagamentos</CardTitle>
          <button type="button" onClick={() => onOpenTab('transacoes')} className="text-[13px] font-medium text-zinc-500 hover:text-zinc-950">Ver todos</button>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {!d ? (
            <div className="space-y-2 px-5 pb-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : d.recent.length === 0 ? (
            <p className="px-5 pb-6 pt-2 text-center text-[13px] text-zinc-400">Ainda não há pagamentos.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {d.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500">
                    <Receipt className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-zinc-600">
                      <span className="font-medium text-zinc-950">{r.client ?? 'Cliente'}</span> pagou {r.service ? <span className="text-zinc-950">{r.service}</span> : 'um serviço'}
                      {r.provider ? <> a <span className="text-zinc-950">{r.provider}</span></> : null}
                    </p>
                    <p className="text-xs text-zinc-400">{methodLabel(r.method)} · {r.released ? 'libertado' : 'em escrow'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold tabular-nums text-zinc-950">{formatMoney(r.amount, { ...ctx, currency: r.currency })}</p>
                    <p className="text-xs text-zinc-400">{timeAgo(r.paid_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {d && d.other_currencies.length > 0 && (
        <p className="text-xs text-zinc-500">
          Também existem pagamentos noutras moedas (não incluídos acima):{' '}
          {d.other_currencies.map((o) => `${formatMoney(o.amount, { currency: o.currency, factor: ctx.factor })} em ${o.count} pagamentos`).join(' · ')}.
        </p>
      )}
    </div>
  );
}

function MoneyKpi({
  label, icon: Icon, value, current, previous, footnote, loading, onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  current?: number;
  previous?: number;
  footnote?: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium leading-snug text-zinc-500">{label}</p>
        <Icon className="size-4 shrink-0 text-zinc-400" />
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-2 h-4 w-32" />
        </>
      ) : (
        <>
          <p className="mt-2 truncate text-xl font-semibold leading-tight tracking-tight text-zinc-950 tabular-nums sm:text-2xl">{value}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {previous !== undefined && current !== undefined && <Delta current={current} previous={previous} />}
            {footnote && <span className="text-zinc-500">{footnote}</span>}
          </div>
        </>
      )}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-zinc-300 sm:p-5">
      {body}
    </button>
  ) : (
    <Card className="p-4 sm:p-5">{body}</Card>
  );
}

function MoneyChart({ data, ctx }: { data: PaymentsOverview['series']; ctx: MoneyCtx }) {
  const interval = Math.max(0, Math.ceil(data.length / 8) - 1);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fillGross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.cyan} stopOpacity={0.22} />
            <stop offset="100%" stopColor={CHART_COLORS.cyan} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillPlatform" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.dark} stopOpacity={0.2} />
            <stop offset="100%" stopColor={CHART_COLORS.dark} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f4f4f5" />
        <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} interval={interval} tickMargin={8} />
        <YAxis tickFormatter={(v: number) => formatMoneyCompact(v, ctx.factor)} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={52} />
        <Tooltip
          cursor={{ stroke: '#e4e4e7' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length || !label) return null;
            const row = payload[0].payload as PaymentsOverview['series'][number];
            return (
              <div className="min-w-[170px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
                <p className="mb-1.5 font-medium text-zinc-950">{formatDay(String(label))}</p>
                <Row color={CHART_COLORS.cyan} label="Recebido" value={formatMoney(row.gross, ctx)} />
                <Row color={CHART_COLORS.dark} label="Receita" value={formatMoney(row.platform, ctx)} />
                <p className="mt-1 text-zinc-400">{row.count} {row.count === 1 ? 'pagamento' : 'pagamentos'}</p>
              </div>
            );
          }}
        />
        <Area type="monotone" dataKey="gross" stroke={CHART_COLORS.cyan} strokeWidth={2} fill="url(#fillGross)" dot={false} activeDot={{ r: 3.5 }} />
        <Area type="monotone" dataKey="platform" stroke={CHART_COLORS.dark} strokeWidth={2} fill="url(#fillPlatform)" dot={false} activeDot={{ r: 3.5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-1.5 text-zinc-500"><span className="size-2 rounded-sm" style={{ background: color }} />{label}</span>
      <span className="font-medium tabular-nums text-zinc-950">{value}</span>
    </div>
  );
}

function ChargesBox({ d, money }: { d: PaymentsOverview; money: (v?: number | null) => string }) {
  const c = d.charges;
  const finished = c.success + c.failed + c.expired;
  const rate = finished ? Math.round((c.success / finished) * 100) : null;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold tabular-nums">{rate === null ? '—' : `${rate}%`}</p>
          <p className="text-xs text-zinc-500">taxa de sucesso</p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p><span className="font-medium text-zinc-900 tabular-nums">{formatNumber(c.ref)}</span> referências</p>
          <p><span className="font-medium text-zinc-900 tabular-nums">{formatNumber(c.gpo)}</span> Multicaixa Express</p>
        </div>
      </div>
      <dl className="space-y-2 text-[13px]">
        {[
          { icon: Clock, label: 'À espera de pagamento', value: `${formatNumber(c.pending)} · ${money(c.pending_amount)}` },
          { icon: CheckCircle2, label: 'Pagas', value: formatNumber(c.success) },
          { icon: AlertTriangle, label: 'Falhadas ou expiradas', value: formatNumber(c.failed + c.expired) },
          { icon: Wallet, label: 'Reembolsadas', value: formatNumber(c.refunded) },
        ].map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-zinc-600"><r.icon className="size-3.5 text-zinc-400" />{r.label}</dt>
            <dd className="font-medium tabular-nums text-zinc-950">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MoneyBars({ items, money, loading }: { items: { label: string; value: number; count: number }[]; money: (v?: number | null) => string; loading?: boolean }) {
  if (loading) return <div className="space-y-2">{[80, 60, 45].map((w) => <Skeleton key={w} className="h-8" style={{ width: `${w}%` }} />)}</div>;
  if (items.length === 0) return <p className="py-6 text-center text-[13px] text-zinc-400">Sem pagamentos neste período.</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="relative flex h-8 items-center justify-between gap-3 px-2.5 text-[13px]" title={`${i.count} pagamentos`}>
          <div className="absolute inset-y-0 left-0 rounded-md bg-brand-cyan/[0.13]" style={{ width: `${Math.max(4, (i.value / max) * 100)}%` }} />
          <span className="relative truncate text-zinc-800">{i.label}</span>
          <span className="relative font-medium tabular-nums text-zinc-950">{money(i.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Estado da ligação à AppyPay (credenciais nas Edge Functions). */
function AppyPayBanner() {
  const q = useAdminQuery(() => appypayAdmin<AppyPayStatus>('status'), []);
  if (q.loading && !q.data && !q.error) return null;
  if (q.error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">Integração AppyPay por ativar</p>
          <p className="mt-0.5 text-amber-800">{q.error} Os relatórios abaixo funcionam na mesma com os pagamentos já registados.</p>
        </div>
      </div>
    );
  }
  const s = q.data!;
  if (s.missing.length) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">A AppyPay ainda não está configurada</p>
          <p className="mt-0.5 text-amber-800">Faltam os segredos: <span className="font-mono text-xs">{s.missing.join(', ')}</span>. Até lá não é possível gerar referências nem cobranças Express.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-[13px] text-zinc-500">
      <span className="size-2 rounded-full bg-emerald-500" />
      AppyPay ligada · ambiente de {s.environment} · Referência e Multicaixa Express ativos
    </div>
  );
}
