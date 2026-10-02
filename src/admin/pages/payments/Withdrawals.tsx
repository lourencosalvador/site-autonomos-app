import { useEffect, useState } from 'react';
import { ArrowDownToLine, Check, Loader2, MessageCircle } from 'lucide-react';
import { SearchInput } from '../../components/SearchInput';
import { Avatar, DetailRow } from '../../components/blocks';
import { Card, Skeleton, StatusDot } from '../../ui/card';
import { Button, buttonClass } from '../../ui/button';
import { Label, Select, Textarea } from '../../ui/input';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '../../ui/dialog';
import { EmptyState, ErrorBanner, Pagination, Segmented, Table, TBody, TD, TH, THead, TR } from '../../ui/misc';
import { rpc, useAdminQuery } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { useAction } from '../../lib/useAction';
import { formatMoney, withdrawalStatus } from '../../lib/money';
import type { MoneyCtx, Page, PaymentMeta, Withdrawal } from '../../lib/types';
import { formatDateTime, phoneDigits, timeAgo } from '../../lib/utils';

const PAGE_SIZE = 20;

export function Withdrawals({ ctx, meta, onChanged }: { ctx: MoneyCtx; meta: PaymentMeta | null; onChanged: () => void }) {
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const debounced = useDebounced(search);

  const q = useAdminQuery(
    () => rpc<Page<Withdrawal> & { sum_amount: number }>('admin_list_withdrawals', {
      p_status: status === 'all' ? null : status,
      p_search: debounced || null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    }),
    [status, debounced, page],
    60_000,
  );
  const counts = q.data?.counts ?? {};
  const statuses = Object.keys(counts);
  const money = (v: number, currency?: string | null) => formatMoney(v, { ...ctx, currency: currency ?? ctx.currency });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="overflow-x-auto">
          <Segmented
            value={status}
            onChange={(v) => { setStatus(v); setPage(0); }}
            options={[
              { value: 'all', label: 'Todos', count: Object.values(counts).reduce((a, b) => a + b, 0) },
              ...statuses.map((s) => ({ value: s, label: withdrawalStatus(s).label, count: counts[s] })),
            ]}
          />
        </div>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Prestador, telefone, método…" />
      </div>

      <Card>
        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
        {!q.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : q.data.rows.length === 0 ? (
          <EmptyState icon={ArrowDownToLine} title="Sem pedidos de saque" description="Quando um prestador levantar o saldo na app (FlexPay), o pedido aparece aqui." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Pedido</TH>
                  <TH>Prestador</TH>
                  <TH>Método</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Estado</TH>
                  <TH>Processado</TH>
                </TR>
              </THead>
              <TBody>
                {q.data.rows.map((w) => {
                  const st = withdrawalStatus(w.status);
                  return (
                    <TR key={w.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => setSelected(w)}>
                      <TD className="whitespace-nowrap text-zinc-500" title={formatDateTime(w.requested_at ?? w.created_at)}>{timeAgo(w.requested_at ?? w.created_at)}</TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={w.provider_name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-950">{w.provider_name ?? 'Prestador'}</p>
                            <p className="truncate text-xs text-zinc-500">{w.provider_phone ?? w.provider_email ?? '—'}</p>
                          </div>
                        </div>
                      </TD>
                      <TD className="capitalize">{w.method ?? '—'}</TD>
                      <TD className="whitespace-nowrap text-right font-medium tabular-nums text-zinc-950">{money(w.amount, w.currency)}</TD>
                      <TD><StatusDot tone={st.tone === 'brand' ? 'brand' : st.tone}>{st.label}</StatusDot></TD>
                      <TD className="whitespace-nowrap text-zinc-500">{w.processed_at ? `${timeAgo(w.processed_at)}${w.processed_by ? ` · ${w.processed_by}` : ''}` : '—'}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <div className="flex justify-end border-t border-zinc-100 px-4 py-2.5 text-[13px] text-zinc-500">
              Total filtrado: <span className="ml-1 font-semibold tabular-nums text-zinc-950">{money(q.data.sum_amount)}</span>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <WithdrawalSheet
        withdrawal={selected}
        ctx={ctx}
        meta={meta}
        onClose={() => setSelected(null)}
        onSaved={(w) => { setSelected(w); void q.reload(); onChanged(); }}
      />
    </>
  );
}

function WithdrawalSheet({
  withdrawal, ctx, meta, onClose, onSaved,
}: {
  withdrawal: Withdrawal | null;
  ctx: MoneyCtx;
  meta: PaymentMeta | null;
  onClose: () => void;
  onSaved: (w: Withdrawal) => void;
}) {
  const run = useAction();
  const w = withdrawal;
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const paidStatus = meta?.settings.withdrawal_paid_status ?? 'paid';
  const options = meta?.withdrawal_statuses ?? [];

  useEffect(() => {
    if (w) {
      setStatus(w.status);
      setNote(w.admin_note ?? '');
    }
  }, [w]);

  const save = async (next: string) => {
    if (!w) return;
    setSaving(true);
    try {
      await run(() => rpc('admin_update_withdrawal', { p_id: w.id, p_status: next, p_note: note || null }), 'Saque atualizado.');
      onSaved({ ...w, status: next, admin_note: note || w.admin_note, processed_at: new Date().toISOString(), paid_at: next === paidStatus ? w.paid_at ?? new Date().toISOString() : w.paid_at });
    } catch {
      // erro já mostrado
    } finally {
      setSaving(false);
    }
  };

  const st = withdrawalStatus(w?.status);
  const wa = phoneDigits(w?.provider_phone);
  const alreadyPaid = !!w?.paid_at;

  return (
    <Dialog open={!!w} onOpenChange={(o) => !o && !saving && onClose()}>
      <SheetContent className="sm:max-w-md">
        {w && (
          <>
            <div className="border-b border-zinc-100 px-6 py-5 pr-12">
              <DialogTitle>Saque de {w.provider_name ?? 'prestador'}</DialogTitle>
              <DialogDescription className="mt-1">Pedido {formatDateTime(w.requested_at ?? w.created_at)}</DialogDescription>
              <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(w.amount, { ...ctx, currency: w.currency ?? ctx.currency })}</p>
              <div className="mt-2"><StatusDot tone={st.tone === 'brand' ? 'brand' : st.tone}>{st.label}</StatusDot></div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <dl className="divide-y divide-zinc-100">
                <DetailRow label="Método">{w.method ?? '—'}</DetailRow>
                <DetailRow label="Telefone">{w.provider_phone ?? '—'}</DetailRow>
                <DetailRow label="Email">{w.provider_email ?? '—'}</DetailRow>
                {w.paid_at && <DetailRow label="Pago em">{formatDateTime(w.paid_at)}</DetailRow>}
                {w.processed_at && <DetailRow label="Processado">{formatDateTime(w.processed_at)}{w.processed_by ? ` por ${w.processed_by}` : ''}</DetailRow>}
              </dl>

              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm')}>
                  <MessageCircle /> Falar com o prestador
                </a>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="wd-status">Estado</Label>
                <Select id="wd-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {[...new Set([w.status, ...options])].map((s) => (
                    <option key={s} value={s}>{withdrawalStatus(s).label}{withdrawalStatus(s).label !== s ? ` (${s})` : ''}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wd-note">Nota interna</Label>
                <Textarea id="wd-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Ex: transferência BAI nº 0123, 02/10" maxLength={500} />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-6 py-4">
              <Button variant="outline" disabled={saving || (status === w.status && note === (w.admin_note ?? ''))} onClick={() => void save(status)}>
                Guardar
              </Button>
              {!alreadyPaid && (
                <Button disabled={saving} onClick={() => void save(paidStatus)}>
                  {saving ? <Loader2 className="animate-spin" /> : <Check />} Marcar como pago
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}
