import { useState } from 'react';
import { Ban, Check, Copy, CreditCard, Loader2, MessageCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { SearchInput } from '../../components/SearchInput';
import { ConfirmDialog, DetailRow } from '../../components/blocks';
import { Badge, Card, Skeleton, StatusDot } from '../../ui/card';
import { Button, buttonClass } from '../../ui/button';
import { Select } from '../../ui/input';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '../../ui/dialog';
import { EmptyState, ErrorBanner, Pagination, Segmented, Table, TBody, TD, TH, THead, TR } from '../../ui/misc';
import { appypayAdmin, rpc, useAdminQuery } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { useAction } from '../../lib/useAction';
import { CHARGE_STATUS, formatMoney, methodLabel, SOURCE_LABELS } from '../../lib/money';
import type { Charge, ChargeDetail, MoneyCtx, Page } from '../../lib/types';
import { formatDateTime, phoneDigits, timeAgo } from '../../lib/utils';

const PAGE_SIZE = 20;
type Filter = 'all' | Charge['status'];

export function Charges({ ctx, version }: { ctx: MoneyCtx; version: number }) {
  const [status, setStatus] = useState<Filter>('all');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const debounced = useDebounced(search);

  const q = useAdminQuery(
    () => rpc<Page<Charge>>('admin_list_charges', {
      p_status: status === 'all' ? null : status,
      p_method: method || null,
      p_search: debounced || null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    }),
    [status, method, debounced, page, version],
    30_000,
  );
  const counts = q.data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="overflow-x-auto">
          <Segmented
            value={status}
            onChange={(v) => { setStatus(v); setPage(0); }}
            options={[
              { value: 'all', label: 'Todas', count: total },
              { value: 'pending', label: 'Pendentes', count: counts.pending ?? 0 },
              { value: 'success', label: 'Pagas', count: counts.success ?? 0 },
              { value: 'expired', label: 'Expiradas', count: counts.expired ?? 0 },
              { value: 'failed', label: 'Falhadas', count: counts.failed ?? 0 },
              { value: 'refunded', label: 'Reembolsadas', count: counts.refunded ?? 0 },
              { value: 'cancelled', label: 'Canceladas', count: counts.cancelled ?? 0 },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="sm:w-48">
            <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(0); }} aria-label="Método">
              <option value="">Todos os métodos</option>
              <option value="REF">Referência</option>
              <option value="GPO">Multicaixa Express</option>
            </Select>
          </div>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Nome, telefone, referência…" />
        </div>
      </div>

      <Card>
        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
        {!q.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : q.data.rows.length === 0 ? (
          <EmptyState icon={CreditCard} title="Sem cobranças" description="As referências e os pedidos Multicaixa Express (da app ou criados aqui) aparecem nesta lista." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Criada</TH>
                  <TH>Quem paga</TH>
                  <TH>Método</TH>
                  <TH>Referência / telefone</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Estado</TH>
                  <TH>Origem</TH>
                </TR>
              </THead>
              <TBody>
                {q.data.rows.map((c) => (
                  <TR key={c.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => setSelected(c.id)}>
                    <TD className="whitespace-nowrap text-zinc-500" title={formatDateTime(c.created_at)}>{timeAgo(c.created_at)}</TD>
                    <TD className="max-w-[220px]">
                      <p className="truncate font-medium text-zinc-950">{c.display_name || c.payer_name || 'Sem nome'}</p>
                      <p className="truncate text-xs text-zinc-500">{c.description}</p>
                    </TD>
                    <TD><Badge tone="brand">{methodLabel(c.method)}</Badge></TD>
                    <TD className="whitespace-nowrap font-mono text-xs text-zinc-600">
                      {c.method === 'REF' ? (c.reference_number ? `${c.reference_entity} · ${c.reference_number}` : '—') : (c.payer_phone ?? '—')}
                    </TD>
                    <TD className="whitespace-nowrap text-right font-medium tabular-nums text-zinc-950">{formatMoney(c.amount_minor, ctx)}</TD>
                    <TD><StatusDot tone={CHARGE_STATUS[c.status]?.tone ?? 'neutral'}>{CHARGE_STATUS[c.status]?.label ?? c.status}</StatusDot></TD>
                    <TD className="text-zinc-500">{c.created_by === 'admin' ? 'Painel' : 'App'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <ChargeSheet id={selected} ctx={ctx} onClose={() => setSelected(null)} onChanged={() => void q.reload()} />
    </>
  );
}

/** Texto pronto a enviar ao cliente (WhatsApp/SMS). */
export function paymentInstructions(c: Pick<Charge, 'method' | 'reference_entity' | 'reference_number' | 'reference_due_at' | 'amount_minor' | 'description'>, ctx: MoneyCtx) {
  if (c.method !== 'REF' || !c.reference_number) return '';
  const due = c.reference_due_at ? `\nVálida até: ${formatDateTime(c.reference_due_at)}` : '';
  return `AUTONOMOUS — ${c.description ?? 'Pagamento'}\nPagamento por Referência (ATM, Multicaixa Express ou Internet Banking)\nEntidade: ${c.reference_entity}\nReferência: ${c.reference_number}\nValor: ${formatMoney(c.amount_minor, ctx)}${due}`;
}

function ChargeSheet({ id, ctx, onClose, onChanged }: { id: string | null; ctx: MoneyCtx; onClose: () => void; onChanged: () => void }) {
  const run = useAction();
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'cancel' | 'refund' | null>(null);
  const [copied, setCopied] = useState(false);
  const q = useAdminQuery(() => (id ? rpc<ChargeDetail>('admin_charge_detail', { p_id: id }) : Promise.resolve(null)), [id, version]);
  const d = q.data && q.data.charge.id === id ? q.data : null;
  const c = d?.charge;

  const refresh = () => {
    setVersion((v) => v + 1);
    onChanged();
  };

  const verify = async () => {
    if (!c) return;
    setBusy('verify');
    try {
      const r = await run(() => appypayAdmin<{ charge: { status: string } }>('verify', { id: c.id }));
      const label = CHARGE_STATUS[r.charge.status]?.label ?? r.charge.status;
      await run(async () => undefined, `Estado na AppyPay: ${label}.`);
      refresh();
    } catch {
      // erro já mostrado
    } finally {
      setBusy(null);
    }
  };

  const instructions = c ? paymentInstructions(c, ctx) : '';
  const wa = phoneDigits(c?.payer_phone ?? d?.client?.phone);

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg" aria-describedby={undefined}>
        {!c ? (
          <div className="space-y-3 p-6">
            <DialogTitle className="sr-only">A carregar</DialogTitle>
            {q.error ? <ErrorBanner message={q.error} /> : <><Skeleton className="h-8 w-40" /><Skeleton className="h-40" /></>}
          </div>
        ) : (
          <>
            <div className="border-b border-zinc-100 px-6 py-5 pr-12">
              <DialogTitle>{methodLabel(c.method)}</DialogTitle>
              <DialogDescription className="mt-1">{c.description ?? 'Cobrança'} · criada {formatDateTime(c.created_at)}</DialogDescription>
              <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(c.amount_minor, ctx)}</p>
              <div className="mt-2"><StatusDot tone={CHARGE_STATUS[c.status]?.tone ?? 'neutral'}>{CHARGE_STATUS[c.status]?.label ?? c.status}</StatusDot></div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {c.method === 'REF' && c.reference_number && (
                <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">Entidade</p>
                      <p className="mt-0.5 font-mono text-xl font-semibold tracking-wider text-zinc-950">{c.reference_entity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Referência</p>
                      <p className="mt-0.5 font-mono text-xl font-semibold tracking-wider text-zinc-950">{c.reference_number.replace(/(\d{3})(?=\d)/g, '$1 ')}</p>
                    </div>
                  </div>
                  {c.reference_due_at && <p className="mt-3 text-xs text-zinc-500">Válida até {formatDateTime(c.reference_due_at)}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(instructions).catch(() => undefined);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <><Check /> Copiado</> : <><Copy /> Copiar instruções</>}
                    </Button>
                    {wa && (
                      <a className={buttonClass('outline', 'sm')} target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(instructions)}`}>
                        <MessageCircle /> Enviar por WhatsApp
                      </a>
                    )}
                  </div>
                </section>
              )}

              <section>
                <dl className="divide-y divide-zinc-100">
                  <DetailRow label="Quem paga">{d.client?.name ?? c.payer_name ?? '—'}</DetailRow>
                  <DetailRow label="Telefone">{c.payer_phone ?? d.client?.phone ?? '—'}</DetailRow>
                  {d.provider && <DetailRow label="Prestador">{d.provider.name ?? '—'}</DetailRow>}
                  {d.request && <DetailRow label="Pedido na app">{d.request.service_name ?? '—'} · {d.request.status}</DetailRow>}
                  <DetailRow label="Origem">{c.created_by === 'admin' ? `Painel (${c.created_by_admin ?? 'admin'})` : 'App'}</DetailRow>
                  {c.paid_at && <DetailRow label="Pago em">{formatDateTime(c.paid_at)}</DetailRow>}
                  {c.refunded_at && <DetailRow label="Reembolsado em">{formatDateTime(c.refunded_at)}</DetailRow>}
                  {c.gateway_message && <DetailRow label="Resposta AppyPay">{c.gateway_message}</DetailRow>}
                  <DetailRow label="Transação"><span className="font-mono text-xs text-zinc-500">{c.merchant_tx_id}</span></DetailRow>
                  {c.appypay_id && <DetailRow label="ID AppyPay"><span className="break-all font-mono text-xs text-zinc-500">{c.appypay_id}</span></DetailRow>}
                </dl>
              </section>

              <section>
                <h4 className="text-[13px] font-medium text-zinc-900">Histórico</h4>
                <ol className="mt-2 space-y-2.5 border-l border-zinc-200 pl-4">
                  {d.events.map((e) => (
                    <li key={e.id} className="relative text-[13px]">
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full border-2 border-white bg-zinc-300" />
                      <p className="text-zinc-900">{SOURCE_LABELS[e.source] ?? e.source}{e.status ? ` · ${CHARGE_STATUS[e.status]?.label ?? e.status}` : ''}</p>
                      {e.message && <p className="text-xs text-zinc-500">{e.message}</p>}
                      <p className="text-xs text-zinc-400">{formatDateTime(e.created_at)}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-6 py-4">
              <div className="flex gap-2">
                {c.status === 'pending' && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirm('cancel')}>
                    <Ban /> Cancelar
                  </Button>
                )}
                {c.status === 'success' && c.method === 'GPO' && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirm('refund')}>
                    <RotateCcw /> Reembolsar
                  </Button>
                )}
              </div>
              {c.appypay_id && ['pending', 'expired', 'failed'].includes(c.status) && (
                <Button size="sm" onClick={() => void verify()} disabled={busy === 'verify'}>
                  {busy === 'verify' ? <Loader2 className="animate-spin" /> : <RefreshCw />} Verificar na AppyPay
                </Button>
              )}
            </div>

            <ConfirmDialog
              open={confirm === 'cancel'}
              onOpenChange={(o) => !o && setConfirm(null)}
              destructive
              title="Cancelar esta cobrança?"
              description={c.method === 'REF'
                ? 'Deixa de ser considerada à espera de pagamento. Atenção: a referência continua válida na rede Multicaixa até expirar — se o cliente pagar, o pagamento é registado na mesma.'
                : 'Deixa de ser considerada à espera de pagamento.'}
              confirmLabel="Cancelar cobrança"
              onConfirm={async () => {
                await run(() => rpc('admin_cancel_charge', { p_id: c.id }), 'Cobrança cancelada.');
                refresh();
              }}
            />
            <ConfirmDialog
              open={confirm === 'refund'}
              onOpenChange={(o) => !o && setConfirm(null)}
              destructive
              requireText="REEMBOLSAR"
              title={`Reembolsar ${formatMoney(c.amount_minor, ctx)}?`}
              description="O valor total é devolvido ao cliente pela AppyPay (Multicaixa Express). Se o pagamento já estiver registado num pedido da app, atualize também o estado desse pedido."
              confirmLabel="Reembolsar"
              onConfirm={async () => {
                await run(() => appypayAdmin('refund', { id: c.id }), 'Reembolso efetuado.');
                refresh();
              }}
            />
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}
