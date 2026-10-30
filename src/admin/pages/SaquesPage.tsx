import { useMemo, useState } from 'react';
import { ArrowDownToLine, Building2, Check, Copy, Landmark, MessageCircle, Phone, RefreshCw, X } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { SearchInput } from '../components/SearchInput';
import { DetailRow } from '../components/blocks';
import { Badge, Card, Skeleton } from '../ui/card';
import { Button, buttonClass } from '../ui/button';
import { Input, Label, Textarea } from '../ui/input';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '../ui/dialog';
import { EmptyState, ErrorBanner, Segmented, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { useAction } from '../lib/useAction';
import { formatDateTime, phoneDigits, timeAgo } from '../lib/utils';
import { formatKz } from '../../lib/payments';
import { formatIban } from '../../lib/phone';

type Status = 'pending' | 'paid' | 'rejected';

type Saque = {
  id: string;
  provider_id: string;
  amount_minor: number;
  iban: string;
  iban_holder: string;
  status: Status;
  reference: string | null;
  rejected_reason: string | null;
  created_at: string;
  processed_at: string | null;
  provider: { id: string; name: string | null; phone: string | null; email: string | null; company_name: string | null } | null;
  balance: { credited_minor: number; pending_withdrawal_minor: number; withdrawn_minor: number; available_minor: number };
};

const STATUS: Record<Status, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Por transferir', tone: 'warning' },
  paid: { label: 'Transferido', tone: 'success' },
  rejected: { label: 'Rejeitado', tone: 'danger' },
};

/** Saques pedidos pelos profissionais da app web: a equipa transfere manualmente e marca como pago. */
export function SaquesPage({ onChange }: { onChange?: () => void }) {
  const q = useAdminQuery(() => rpc<Saque[]>('admin_list_broadcast_withdrawals', { p_limit: 500 }), [], 30_000);
  const [filter, setFilter] = useState<Status>('pending');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const count = (s: Status) => rows.filter((r) => r.status === s).length;
  const pendingTotal = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + Number(r.amount_minor), 0);
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => r.status === filter)
      .filter((r) => !s || [r.provider?.name, r.provider?.phone, r.provider?.company_name, r.iban_holder, r.iban, r.reference]
        .some((v) => (v ?? '').toLowerCase().includes(s)));
  }, [rows, filter, search]);

  const open = rows.find((r) => r.id === openId) ?? null;
  const reload = () => { q.reload(); onChange?.(); };

  return (
    <>
      <PageHeader
        title="Saques"
        description="Pedidos de saque dos profissionais da app web. Transfira o valor para o IBAN indicado e marque como transferido."
        actions={<Button variant="outline" size="sm" onClick={reload} disabled={q.loading}><RefreshCw className={q.loading ? 'animate-spin' : ''} /> Atualizar</Button>}
      />

      {count('pending') > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <Landmark className="mt-0.5 size-4 shrink-0" />
          <span><b>{count('pending')} saque(s) por transferir</b>, total de <b>{formatKz(pendingTotal)}</b>. O valor já está reservado no saldo de cada profissional.</span>
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'pending', label: 'Por transferir', count: count('pending') },
              { value: 'paid', label: 'Transferidos', count: count('paid') },
              { value: 'rejected', label: 'Rejeitados', count: count('rejected') },
            ]}
            className="max-w-full overflow-x-auto"
          />
          <div className="lg:w-72"><SearchInput value={search} onChange={setSearch} placeholder="Profissional, IBAN, referência…" /></div>
        </div>

        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={q.reload} /></div>}

        {q.loading && !q.data ? (
          <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : list.length === 0 ? (
          <EmptyState icon={ArrowDownToLine} title="Sem saques" description="Quando um profissional pedir um saque na carteira, aparece aqui." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Profissional</TH>
                <TH>Conta de destino</TH>
                <TH className="text-right">Valor</TH>
                <TH>Estado</TH>
                <TH>Pedido</TH>
              </TR>
            </THead>
            <TBody>
              {list.map((r) => (
                <TR key={r.id} className="cursor-pointer hover:bg-zinc-50/80" onClick={() => setOpenId(r.id)}>
                  <TD>
                    <p className="font-medium text-zinc-900">{r.provider?.name ?? '—'}</p>
                    {r.provider?.company_name
                      ? <p className="flex items-center gap-1 text-xs font-medium text-amber-700"><Building2 className="size-3" /> {r.provider.company_name}</p>
                      : <p className="text-xs text-zinc-500">{r.provider?.phone ?? '—'}</p>}
                  </TD>
                  <TD>
                    <p className="font-mono text-xs text-zinc-900">{formatIban(r.iban)}</p>
                    <p className="text-xs text-zinc-500">{r.iban_holder}</p>
                  </TD>
                  <TD className="whitespace-nowrap text-right font-medium tabular-nums text-zinc-900">{formatKz(r.amount_minor)}</TD>
                  <TD><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge></TD>
                  <TD className="whitespace-nowrap text-zinc-500">{timeAgo(r.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <SaqueSheet saque={open} onClose={() => setOpenId(null)} onChanged={reload} />
    </>
  );
}

function SaqueSheet({ saque, onClose, onChanged }: { saque: Saque | null; onClose: () => void; onChanged: () => void }) {
  const run = useAction();
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const r = saque;

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await run(fn, msg); onChanged(); setReference(''); setReason(''); setRejecting(false); } catch {} finally { setBusy(false); }
  };
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  const digits = phoneDigits(r?.provider?.phone);

  return (
    <Dialog open={!!r} onOpenChange={(o) => { if (!o) { onClose(); setRejecting(false); } }}>
      <SheetContent className="sm:max-w-lg">
        {r && (
          <>
            <div className="border-b border-zinc-100 px-6 py-5 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>Saque de {formatKz(r.amount_minor)}</DialogTitle>
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
              </div>
              <DialogDescription className="mt-1">Pedido {formatDateTime(r.created_at)} · ref. SAQ-{r.id.slice(0, 8).toUpperCase()}</DialogDescription>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <section className="rounded-lg border border-zinc-200 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Transferir para</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[15px] font-medium tracking-wide text-zinc-900">{formatIban(r.iban)}</p>
                  <Button size="sm" variant="outline" onClick={() => copy(r.iban)}>{copied ? <Check /> : <Copy />} {copied ? 'Copiado' : 'Copiar'}</Button>
                </div>
                <dl className="mt-2 divide-y divide-zinc-100">
                  <DetailRow label="Titular">{r.iban_holder}</DetailRow>
                  <DetailRow label="Valor">{formatKz(r.amount_minor)}</DetailRow>
                </dl>
              </section>

              {r.status === 'pending' && (
                <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                  {rejecting ? (
                    <div className="space-y-2">
                      <Label htmlFor="saque-rej">Motivo (o profissional vê esta mensagem)</Label>
                      <Textarea id="saque-rej" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: o IBAN não corresponde ao titular." />
                      <p className="text-[13px] text-zinc-600">O valor volta ao saldo disponível do profissional.</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" disabled={busy || reason.trim().length < 3}
                          onClick={() => act(() => rpc('admin_reject_broadcast_withdrawal', { p_id: r.id, p_reason: reason.trim() }), 'Saque rejeitado.')}>Rejeitar saque</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Voltar</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-zinc-900">Depois de transferir no banco</p>
                      <p className="mt-0.5 text-[13px] text-zinc-600">Registe a referência da operação. O profissional recebe uma notificação.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referência da transferência (opcional)" />
                        <Button size="sm" className="h-9" disabled={busy}
                          onClick={() => act(() => rpc('admin_mark_broadcast_withdrawal_paid', { p_id: r.id, p_reference: reference.trim() || null }), 'Saque marcado como transferido.')}>
                          <Check /> Marcar como transferido
                        </Button>
                      </div>
                      <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => setRejecting(true)}><X className="text-red-500" /> Rejeitar</Button>
                    </>
                  )}
                </section>
              )}

              {r.status !== 'pending' && (
                <section>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Processamento</p>
                  <dl className="divide-y divide-zinc-100">
                    <DetailRow label={r.status === 'paid' ? 'Transferido' : 'Rejeitado'}>{formatDateTime(r.processed_at)}</DetailRow>
                    {r.reference && <DetailRow label="Referência">{r.reference}</DetailRow>}
                    {r.rejected_reason && <DetailRow label="Motivo">{r.rejected_reason}</DetailRow>}
                  </dl>
                </section>
              )}

              <section>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Carteira do profissional</p>
                <dl className="divide-y divide-zinc-100">
                  <DetailRow label="Total creditado">{formatKz(r.balance.credited_minor)}</DetailRow>
                  <DetailRow label="Em saque">{formatKz(r.balance.pending_withdrawal_minor)}</DetailRow>
                  <DetailRow label="Já sacado">{formatKz(r.balance.withdrawn_minor)}</DetailRow>
                  <DetailRow label="Disponível">{formatKz(r.balance.available_minor)}</DetailRow>
                </dl>
              </section>

              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Profissional</p>
                <div className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">{r.provider?.name ?? '—'}</p>
                    {r.provider?.company_name ? <Badge tone="warning"><Building2 className="size-3" /> {r.provider.company_name}</Badge> : <Badge>Individual</Badge>}
                  </div>
                  <p className="text-[13px] text-zinc-500">{[r.provider?.phone, r.provider?.email].filter(Boolean).join(' · ') || '—'}</p>
                  {digits && (
                    <div className="mt-3 flex gap-2">
                      <a href={`tel:+${digits}`} className={buttonClass('default', 'sm')}><Phone /> Ligar</a>
                      <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm')}><MessageCircle /> WhatsApp</a>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}
