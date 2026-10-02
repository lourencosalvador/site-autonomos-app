import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { SearchInput } from '../../components/SearchInput';
import { DetailRow } from '../../components/blocks';
import { Badge, Card, Skeleton, StatusDot } from '../../ui/card';
import { Input } from '../../ui/input';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '../../ui/dialog';
import { EmptyState, ErrorBanner, Pagination, Segmented, Table, TBody, TD, TH, THead, TR } from '../../ui/misc';
import { rpc, useAdminQuery } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { CHARGE_STATUS, formatMoney, methodLabel, SOURCE_LABELS } from '../../lib/money';
import type { MoneyCtx, Page, Transaction, TransactionDetail } from '../../lib/types';
import { formatDate, formatDateTime } from '../../lib/utils';

const PAGE_SIZE = 20;
type Escrow = 'all' | 'held' | 'released';

export function Transactions({ ctx }: { ctx: MoneyCtx }) {
  const [escrow, setEscrow] = useState<Escrow>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const debounced = useDebounced(search);

  const q = useAdminQuery(
    () => rpc<Page<Transaction> & { sum_amount: number; sum_platform: number }>('admin_list_transactions', {
      p_escrow: escrow === 'all' ? null : escrow,
      p_search: debounced || null,
      p_from: from || null,
      p_to: to || null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    }),
    [escrow, debounced, from, to, page],
    60_000,
  );
  const counts = q.data?.counts ?? {};
  const money = (v?: number | null, currency?: string) => formatMoney(v ?? 0, { ...ctx, currency: currency ?? ctx.currency });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Segmented
          value={escrow}
          onChange={(v) => { setEscrow(v); setPage(0); }}
          options={[
            { value: 'all', label: 'Todas', count: counts.all ?? 0 },
            { value: 'held', label: 'Em escrow', count: counts.held ?? 0 },
            { value: 'released', label: 'Libertadas', count: counts.released ?? 0 },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className="w-[150px]" aria-label="Desde" />
            <span className="text-xs text-zinc-400">a</span>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className="w-[150px]" aria-label="Até" />
          </div>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Cliente, prestador, serviço, referência…" />
        </div>
      </div>

      <Card>
        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
        {!q.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : q.data.rows.length === 0 ? (
          <EmptyState icon={Receipt} title="Sem transações" description="Os pagamentos confirmados aparecem aqui, com o escrow e as taxas de cada um." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Pago em</TH>
                  <TH>Serviço</TH>
                  <TH>Método</TH>
                  <TH className="text-right">Cliente pagou</TH>
                  <TH className="text-right">Prestador recebe</TH>
                  <TH className="text-right">AUTONOMOUS</TH>
                  <TH>Escrow</TH>
                </TR>
              </THead>
              <TBody>
                {q.data.rows.map((t) => (
                  <TR key={t.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => setSelected(t.id)}>
                    <TD className="whitespace-nowrap text-zinc-500">{formatDateTime(t.paid_at)}</TD>
                    <TD className="max-w-[260px]">
                      <p className="truncate font-medium text-zinc-950">{t.service ?? 'Serviço'}</p>
                      <p className="truncate text-xs text-zinc-500">{t.client.name ?? 'Cliente'} → {t.provider.name ?? 'Prestador'}</p>
                    </TD>
                    <TD><Badge tone={t.method === 'REF' || t.method === 'GPO' ? 'brand' : 'neutral'}>{methodLabel(t.method)}</Badge></TD>
                    <TD className="whitespace-nowrap text-right font-medium tabular-nums text-zinc-950">{money(t.amount, t.currency)}</TD>
                    <TD className="whitespace-nowrap text-right tabular-nums">{money(t.provider_net, t.currency)}</TD>
                    <TD className="whitespace-nowrap text-right tabular-nums">{money(t.platform_net, t.currency)}</TD>
                    <TD>{t.released_at ? <StatusDot tone="success">Libertado</StatusDot> : <StatusDot tone="warning">Retido</StatusDot>}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-zinc-100 px-4 py-2.5 text-[13px] text-zinc-500">
              <span>Total filtrado: <span className="font-semibold tabular-nums text-zinc-950">{money(q.data.sum_amount)}</span></span>
              <span>Receita: <span className="font-semibold tabular-nums text-zinc-950">{money(q.data.sum_platform)}</span></span>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <TransactionSheet id={selected} ctx={ctx} onClose={() => setSelected(null)} />
    </>
  );
}

function TransactionSheet({ id, ctx, onClose }: { id: string | null; ctx: MoneyCtx; onClose: () => void }) {
  const q = useAdminQuery(() => (id ? rpc<TransactionDetail>('admin_transaction_detail', { p_id: id }) : Promise.resolve(null)), [id]);
  const d = q.data && q.data.payment.id === id ? q.data : null;
  const p = d?.payment;
  const money = (v?: number | null) => formatMoney(v ?? 0, { ...ctx, currency: (p?.currency as string) ?? ctx.currency });

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg" aria-describedby={undefined}>
        {!p ? (
          <div className="space-y-3 p-6">
            <DialogTitle className="sr-only">A carregar</DialogTitle>
            {q.error ? <ErrorBanner message={q.error} /> : <><Skeleton className="h-8 w-40" /><Skeleton className="h-40" /><Skeleton className="h-32" /></>}
          </div>
        ) : (
          <>
            <div className="border-b border-zinc-100 px-6 py-5 pr-12">
              <DialogTitle>{d.request?.service_name ?? 'Pagamento'}</DialogTitle>
              <DialogDescription className="mt-1">Pago {formatDateTime(p.paid_at as string)} · {methodLabel(d.method)}</DialogDescription>
              <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{money(p.amount as number)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.released_at ? <Badge tone="success">Libertado ao prestador</Badge> : <Badge tone="warning">Retido em escrow</Badge>}
                {d.request?.is_multi_day && <Badge tone="outline">Vários dias</Badge>}
                {d.request?.is_urgent && <Badge tone="outline">Urgente</Badge>}
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {d.charges.some((c) => c.status === 'refunded') && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
                  Este pagamento foi reembolsado ao cliente na AppyPay. Confirme que o pedido e o escrow foram atualizados na app.
                </p>
              )}
              <section>
                <h4 className="text-[13px] font-medium text-zinc-900">Decomposição</h4>
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 text-[13px]">
                  <Line label="Valor acordado com o prestador" value={money(p.agreed_amount as number)} />
                  <Line label="Taxa de pedido (cliente)" value={`+ ${money(p.request_fee as number)}`} />
                  {!!p.urgent_bonus && <Line label="Bónus de urgência" value={`+ ${money(p.urgent_bonus as number)}`} />}
                  <Line label="Total pago pelo cliente" value={money(p.amount as number)} strong />
                  <Line label="Taxa de serviço (prestador)" value={`− ${money(p.service_fee as number)}`} />
                  <Line label="Prestador recebe" value={money(p.provider_net as number)} strong />
                  <Line label="Receita AUTONOMOUS" value={money(p.platform_net as number)} strong brand />
                </div>
              </section>

              <section>
                <h4 className="text-[13px] font-medium text-zinc-900">Pessoas</h4>
                <dl className="mt-1 divide-y divide-zinc-100">
                  <DetailRow label="Cliente">{d.client ? `${d.client.name ?? '—'} · ${d.client.phone ?? d.client.email ?? ''}` : '—'}</DetailRow>
                  <DetailRow label="Prestador">{d.provider ? `${d.provider.name ?? '—'} · ${d.provider.phone ?? d.provider.email ?? ''}` : '—'}</DetailRow>
                </dl>
              </section>

              <section>
                <h4 className="text-[13px] font-medium text-zinc-900">Estado</h4>
                <dl className="mt-1 divide-y divide-zinc-100">
                  <DetailRow label="Pagamento">{String(p.status ?? '—')}</DetailRow>
                  <DetailRow label="Escrow">{String(p.escrow_status ?? '—')}{p.released_at ? ` · libertado ${formatDateTime(p.released_at as string)}` : ''}</DetailRow>
                  {d.request && <DetailRow label="Pedido">{d.request.status}{d.request.completed_at ? ` · concluído ${formatDate(d.request.completed_at)}` : ''}</DetailRow>}
                  {d.request?.location && <DetailRow label="Local">{d.request.location}</DetailRow>}
                  <DetailRow label="Referência interna"><span className="break-all font-mono text-xs text-zinc-500">{String(p.stripe_payment_intent_id ?? '—')}</span></DetailRow>
                </dl>
              </section>

              {d.charges.length > 0 && (
                <section>
                  <h4 className="text-[13px] font-medium text-zinc-900">Cobranças AppyPay</h4>
                  <div className="mt-2 space-y-3">
                    {d.charges.map((c) => (
                      <div key={c.id} className="rounded-lg border border-zinc-200 p-3">
                        <div className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="font-medium text-zinc-900">{methodLabel(c.method)}{c.reference_number ? ` · ${c.reference_entity} / ${c.reference_number}` : c.payer_phone ? ` · ${c.payer_phone}` : ''}</span>
                          <StatusDot tone={CHARGE_STATUS[c.status]?.tone ?? 'neutral'}>{CHARGE_STATUS[c.status]?.label ?? c.status}</StatusDot>
                        </div>
                        <ol className="mt-2 space-y-1 border-l border-zinc-200 pl-3">
                          {(c.events ?? []).map((e) => (
                            <li key={e.id} className="text-xs text-zinc-500">
                              <span className="text-zinc-700">{SOURCE_LABELS[e.source] ?? e.source}</span>
                              {e.message ? ` — ${e.message}` : ''} · {formatDateTime(e.created_at)}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}

function Line({ label, value, strong, brand }: { label: string; value: string; strong?: boolean; brand?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 last:border-0 ${strong ? 'bg-zinc-50/80' : ''}`}>
      <span className={strong ? 'font-medium text-zinc-900' : 'text-zinc-600'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold' : ''} ${brand ? 'text-brand-dark' : 'text-zinc-950'}`}>{value}</span>
    </div>
  );
}
