import { useMemo, useState } from 'react';
import { Building2, Check, ClipboardCheck, ExternalLink, FileText, Landmark, MapPin, MessageCircle, Phone, PhoneCall, RefreshCw, X } from 'lucide-react';
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
import { formatDate, formatDateTime, phoneDigits, timeAgo } from '../lib/utils';
import { formatKz } from '../../lib/payments';
import { formatIban } from '../../lib/phone';

type Person = { id: string; name: string | null; phone: string | null; email: string | null };
type Provider = Person & { company_name: string | null; iban: string | null; iban_holder: string | null; work_areas: string[] | null };

type Stage =
  | 'searching' | 'unanswered' | 'visit_requested' | 'visit_scheduled' | 'quote_pending' | 'quote_sent' | 'quote_rejected'
  | 'in_progress' | 'awaiting_confirmation' | 'awaiting_payment' | 'payment_review' | 'payout_pending'
  | 'completed' | 'cancelled' | 'no_providers' | 'expired';

export type AppRequest = {
  id: string;
  category: string;
  description: string;
  city: string | null;
  address: string | null;
  province: string | null;
  municipality: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  service_date: string | null;
  service_time: string | null;
  status: string;
  stage: Stage;
  visit_status: string | null;
  visit_slots: string[] | null;
  visit_at: string | null;
  visit_note: string | null;
  quote_status: string;
  quote_minor: number | null;
  quote_note: string | null;
  quote_items: { key: string; label: string; amount_minor: number | null }[] | null;
  quote_sent_at: string | null;
  quote_responded_at: string | null;
  price_minor: number;
  client_fee_minor: number | null;
  provider_fee_minor: number | null;
  provider_net_minor: number | null;
  payment_status: string;
  proof_url: string | null;
  proof_reference: string | null;
  proof_submitted_at: string | null;
  payment_rejected_reason: string | null;
  paid_at: string | null;
  payout_status: string;
  payout_at: string | null;
  payout_reference: string | null;
  provider_done_at: string | null;
  client_confirmed_at: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  admin_contacted_at: string | null;
  admin_note: string | null;
  client: Person | null;
  provider: Provider | null;
};

const STAGE: Record<Stage, { label: string; tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' }> = {
  searching: { label: 'À procura', tone: 'brand' },
  unanswered: { label: 'Sem resposta', tone: 'danger' },
  visit_requested: { label: 'Visita: aguardar agendamento', tone: 'warning' },
  visit_scheduled: { label: 'Visita agendada', tone: 'brand' },
  quote_pending: { label: 'Orçamento por enviar', tone: 'warning' },
  quote_sent: { label: 'Orçamento enviado', tone: 'brand' },
  quote_rejected: { label: 'Orçamento recusado', tone: 'danger' },
  in_progress: { label: 'Serviço em curso', tone: 'brand' },
  awaiting_confirmation: { label: 'A aguardar confirmação do cliente', tone: 'brand' },
  awaiting_payment: { label: 'A aguardar pagamento', tone: 'warning' },
  payment_review: { label: 'Comprovativo por confirmar', tone: 'danger' },
  payout_pending: { label: 'Transferir ao profissional', tone: 'warning' },
  completed: { label: 'Concluído', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  no_providers: { label: 'Sem prestadores', tone: 'neutral' },
  expired: { label: 'Expirado', tone: 'neutral' },
};

export function needsCall(r: AppRequest) {
  if (r.status !== 'accepted' || r.admin_contacted_at) return false;
  if (r.quote_status === 'rejected') return true;
  return r.stage === 'visit_requested' && Date.now() - new Date(r.accepted_at ?? r.created_at).getTime() > 24 * 3600e3;
}

type Filter = 'payments' | 'payouts' | 'quote' | 'active' | 'call' | 'all';
const QUOTE_STAGES: Stage[] = ['visit_requested', 'visit_scheduled', 'quote_pending', 'quote_sent', 'quote_rejected'];
const ACTIVE_STAGES: Stage[] = ['in_progress', 'awaiting_confirmation', 'awaiting_payment'];

function total(r: AppRequest) {
  return (r.price_minor ?? 0) + (r.client_fee_minor ?? 0);
}

function place(r: AppRequest) {
  return [r.neighborhood, r.municipality || r.city, r.province].filter(Boolean).join(', ');
}

export function AppRequestsPage({ onChange }: { onChange?: () => void }) {
  const q = useAdminQuery(() => rpc<AppRequest[]>('admin_app_requests', { p_limit: 500 }), [], 20_000);
  const [filter, setFilter] = useState<Filter>('payments');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const groups = useMemo(() => ({
    payments: rows.filter((r) => r.stage === 'payment_review'),
    payouts: rows.filter((r) => r.stage === 'payout_pending'),
    quote: rows.filter((r) => QUOTE_STAGES.includes(r.stage)),
    active: rows.filter((r) => ACTIVE_STAGES.includes(r.stage)),
    call: rows.filter(needsCall),
    all: rows,
  }), [rows]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return groups[filter].filter((r) => !s || [r.category, r.client?.name, r.client?.phone, r.provider?.name, r.provider?.company_name, place(r)]
      .some((v) => (v ?? '').toLowerCase().includes(s)));
  }, [groups, filter, search]);

  const open = rows.find((r) => r.id === openId) ?? null;
  const reload = () => { q.reload(); onChange?.(); };

  return (
    <>
      <PageHeader
        title="Pedidos da app"
        description="Todos os pedidos da app web: visita, orçamento, serviço, pagamento por transferência e transferência ao profissional."
        actions={<Button variant="outline" size="sm" onClick={reload} disabled={q.loading}><RefreshCw className={q.loading ? 'animate-spin' : ''} /> Atualizar</Button>}
      />

      {(groups.payments.length > 0 || groups.payouts.length > 0) && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {groups.payments.length > 0 && (
            <button onClick={() => setFilter('payments')} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-[13px] text-red-900">
              <FileText className="mt-0.5 size-4 shrink-0" />
              <span><b>{groups.payments.length} comprovativo(s) por confirmar.</b> Verifique a transferência no banco e confirme ou rejeite.</span>
            </button>
          )}
          {groups.payouts.length > 0 && (
            <button onClick={() => setFilter('payouts')} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-[13px] text-amber-900">
              <Landmark className="mt-0.5 size-4 shrink-0" />
              <span><b>{groups.payouts.length} transferência(s) a fazer</b> para profissionais. Transfira o líquido e marque como feita.</span>
            </button>
          )}
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'payments', label: 'Comprovativos', count: groups.payments.length },
              { value: 'payouts', label: 'Transferências', count: groups.payouts.length },
              { value: 'quote', label: 'Visita / orçamento', count: groups.quote.length },
              { value: 'active', label: 'Em curso', count: groups.active.length },
              { value: 'call', label: 'Ligar ao cliente', count: groups.call.length },
              { value: 'all', label: 'Todos', count: groups.all.length },
            ]}
            className="max-w-full overflow-x-auto"
          />
          <div className="lg:w-72"><SearchInput value={search} onChange={setSearch} placeholder="Cliente, prestador, local…" /></div>
        </div>

        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={q.reload} /></div>}

        {q.loading && !q.data ? (
          <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : list.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Nada por aqui" description="Sem pedidos nesta vista." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Pedido</TH>
                <TH>Cliente</TH>
                <TH>Prestador</TH>
                <TH>Etapa</TH>
                <TH className="text-right">Valores</TH>
                <TH>Criado</TH>
              </TR>
            </THead>
            <TBody>
              {list.map((r) => (
                <TR key={r.id} className="cursor-pointer hover:bg-zinc-50/80" onClick={() => setOpenId(r.id)}>
                  <TD>
                    <p className="font-medium text-zinc-900">{r.category}</p>
                    <p className="max-w-[220px] truncate text-xs text-zinc-500">{place(r) || r.description}</p>
                  </TD>
                  <TD>
                    <p className="text-zinc-900">{r.client?.name ?? '—'}</p>
                    <p className="text-xs text-zinc-500">{r.client?.phone ?? '—'}</p>
                  </TD>
                  <TD>
                    {r.provider ? (
                      <>
                        <p className="text-zinc-900">{r.provider.name}</p>
                        {r.provider.company_name
                          ? <p className="flex items-center gap-1 text-xs font-medium text-amber-700"><Building2 className="size-3" /> {r.provider.company_name}</p>
                          : <p className="text-xs text-zinc-500">Individual</p>}
                      </>
                    ) : <span className="text-zinc-400">—</span>}
                  </TD>
                  <TD><Badge tone={STAGE[r.stage]?.tone ?? 'neutral'}>{STAGE[r.stage]?.label ?? r.stage}</Badge></TD>
                  <TD className="whitespace-nowrap text-right tabular-nums">
                    {r.quote_status === 'accepted' && r.price_minor ? (
                      <>
                        <p className="text-zinc-900">{formatKz(total(r))}</p>
                        <p className="text-xs text-zinc-500">líquido {formatKz(r.provider_net_minor ?? r.price_minor)}</p>
                      </>
                    ) : r.quote_minor ? formatKz(r.quote_minor) : <span className="text-zinc-400">—</span>}
                  </TD>
                  <TD className="whitespace-nowrap text-zinc-500">{timeAgo(r.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <RequestSheet request={open} onClose={() => setOpenId(null)} onChanged={reload} />
    </>
  );
}

function ContactButtons({ phone }: { phone: string | null | undefined }) {
  const digits = phoneDigits(phone);
  if (!digits) return <span className="text-[13px] text-zinc-400">Sem telefone</span>;
  return (
    <div className="flex gap-2">
      <a href={`tel:+${digits}`} className={buttonClass('default', 'sm')}><Phone /> Ligar</a>
      <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm')}><MessageCircle /> WhatsApp</a>
    </div>
  );
}

function RequestSheet({ request, onClose, onChanged }: { request: AppRequest | null; onClose: () => void; onChanged: () => void }) {
  const run = useAction();
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const r = request;

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await run(fn, msg); onChanged(); setNote(''); setReason(''); setPayoutRef(''); setRejecting(false); } catch {} finally { setBusy(false); }
  };

  return (
    <Dialog open={!!r} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl">
        {r && (
          <>
            <div className="border-b border-zinc-100 px-6 py-5 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>{r.category}</DialogTitle>
                <Badge tone={STAGE[r.stage]?.tone ?? 'neutral'}>{STAGE[r.stage]?.label ?? r.stage}</Badge>
              </div>
              <DialogDescription className="mt-1">Criado {formatDateTime(r.created_at)} · ref. AUT-{r.id.slice(0, 8).toUpperCase()}</DialogDescription>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {r.stage === 'payment_review' && (
                <section className="rounded-lg border border-red-200 bg-red-50/60 p-4">
                  <p className="text-sm font-semibold text-zinc-900">Confirmar pagamento</p>
                  <p className="mt-0.5 text-[13px] text-zinc-600">
                    O cliente diz que transferiu <b>{formatKz(total(r))}</b>{r.proof_reference ? <> (operação {r.proof_reference})</> : null} em {formatDateTime(r.proof_submitted_at)}.
                    Confirme no extrato bancário antes de aprovar.
                  </p>
                  {r.proof_url && (
                    <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm', 'mt-3')}>
                      <FileText /> Abrir comprovativo <ExternalLink />
                    </a>
                  )}
                  {rejecting ? (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor="rej">Motivo (o cliente vê esta mensagem)</Label>
                      <Textarea id="rej" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: o valor não corresponde ao total." />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" disabled={busy || reason.trim().length < 3}
                          onClick={() => act(() => rpc('admin_reject_payment', { p_id: r.id, p_reason: reason.trim() }), 'Comprovativo rejeitado.')}>Rejeitar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Voltar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" disabled={busy} onClick={() => act(() => rpc('admin_confirm_payment', { p_id: r.id }), 'Pagamento confirmado.')}><Check /> Confirmar recebido</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}><X className="text-red-500" /> Rejeitar</Button>
                    </div>
                  )}
                </section>
              )}

              {r.stage === 'payout_pending' && (
                <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-sm font-semibold text-zinc-900">Transferir ao profissional</p>
                  <dl className="mt-2 divide-y divide-amber-100">
                    <DetailRow label="Valor líquido">{formatKz(r.provider_net_minor ?? r.price_minor)}</DetailRow>
                    <DetailRow label="IBAN">{r.provider?.iban ? formatIban(r.provider.iban) : <span className="text-red-600">Não indicado — contacte o profissional</span>}</DetailRow>
                    <DetailRow label="Titular">{r.provider?.iban_holder ?? r.provider?.name ?? '—'}</DetailRow>
                  </dl>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} placeholder="Referência da transferência (opcional)" />
                    <Button size="sm" className="h-9" disabled={busy} onClick={() => act(() => rpc('admin_mark_payout', { p_id: r.id, p_reference: payoutRef || null }), 'Transferência registada.')}>
                      <Check /> Marcar como transferido
                    </Button>
                  </div>
                </section>
              )}

              <section>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Valores</p>
                {r.quote_status === 'accepted' && r.price_minor ? (
                  <dl className="divide-y divide-zinc-100">
                    <DetailRow label="Serviço (bruto)">{formatKz(r.price_minor)}</DetailRow>
                    <DetailRow label="Taxa do cliente">{formatKz(r.client_fee_minor ?? 0)}</DetailRow>
                    <DetailRow label="Cliente paga">{formatKz(total(r))}</DetailRow>
                    <DetailRow label="Comissão do profissional">{formatKz(r.provider_fee_minor ?? 0)}</DetailRow>
                    <DetailRow label="Líquido ao profissional">{formatKz(r.provider_net_minor ?? r.price_minor)}</DetailRow>
                    <DetailRow label="Receita AUTONOMOUS">{formatKz((r.client_fee_minor ?? 0) + (r.provider_fee_minor ?? 0))}</DetailRow>
                    <DetailRow label="Pagamento">{r.payment_status === 'paid' ? `Confirmado ${formatDateTime(r.paid_at)}` : r.payment_status === 'submitted' ? 'Comprovativo enviado' : r.payment_status === 'rejected' ? `Rejeitado: ${r.payment_rejected_reason ?? ''}` : 'Por pagar'}</DetailRow>
                    <DetailRow label="Transferência">{r.payout_status === 'paid' ? `Feita ${formatDateTime(r.payout_at)}${r.payout_reference ? ` · ${r.payout_reference}` : ''}` : 'Pendente'}</DetailRow>
                  </dl>
                ) : (
                  <dl className="divide-y divide-zinc-100">
                    <DetailRow label="Orçamento">{r.quote_minor ? formatKz(r.quote_minor) : '—'} ({QUOTE_LABEL[r.quote_status] ?? r.quote_status})</DetailRow>
                  </dl>
                )}
                {!!r.quote_items?.length && (
                  <p className="mt-2 text-[13px] text-zinc-600">Inclui: {r.quote_items.map((i) => `${i.label}${i.amount_minor ? ` (${formatKz(i.amount_minor)})` : ''}`).join(', ')}</p>
                )}
                {r.quote_note && <p className="mt-2 whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] text-zinc-700">{r.quote_note}</p>}
              </section>

              {(r.visit_status || r.visit_at) && (
                <section>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Visita de diagnóstico</p>
                  <dl className="divide-y divide-zinc-100">
                    <DetailRow label="Estado">{r.visit_status === 'requested' ? (r.visit_slots?.length ? 'A aguardar escolha do cliente' : 'Cliente pediu outras datas') : r.visit_status === 'scheduled' ? 'Agendada' : r.visit_status === 'done' ? 'Realizada' : '—'}</DetailRow>
                    {r.visit_at && <DetailRow label="Data">{formatDateTime(r.visit_at)}</DetailRow>}
                    {!!r.visit_slots?.length && r.visit_status === 'requested' && <DetailRow label="Datas propostas">{r.visit_slots.map((s) => formatDateTime(s)).join(' · ')}</DetailRow>}
                  </dl>
                  {r.visit_note && <p className="mt-2 rounded-lg bg-zinc-50 p-3 text-[13px] text-zinc-700">{r.visit_note}</p>}
                </section>
              )}

              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Cliente</p>
                <div className="rounded-lg border border-zinc-200 p-3">
                  <p className="text-sm font-medium text-zinc-900">{r.client?.name ?? '—'}</p>
                  <p className="text-[13px] text-zinc-500">{[r.client?.phone, r.client?.email].filter(Boolean).join(' · ') || '—'}</p>
                  <div className="mt-3"><ContactButtons phone={r.client?.phone} /></div>
                </div>
              </section>

              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Prestador</p>
                {r.provider ? (
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">{r.provider.name}</p>
                      {r.provider.company_name ? <Badge tone="warning"><Building2 className="size-3" /> {r.provider.company_name}</Badge> : <Badge>Individual</Badge>}
                    </div>
                    <p className="text-[13px] text-zinc-500">{[r.provider.phone, r.provider.email].filter(Boolean).join(' · ') || '—'}</p>
                    <div className="mt-3"><ContactButtons phone={r.provider.phone} /></div>
                  </div>
                ) : <p className="text-[13px] text-zinc-500">Ainda nenhum prestador aceitou.</p>}
              </section>

              <section>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Pedido</p>
                <p className="whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] leading-relaxed text-zinc-900">{r.description}</p>
                <dl className="mt-2 divide-y divide-zinc-100">
                  <DetailRow label="Local">{place(r) || '—'}</DetailRow>
                  <DetailRow label="Morada">{r.address || '—'}</DetailRow>
                  <DetailRow label="Data pretendida">{r.service_date ? `${formatDate(r.service_date)}${r.service_time ? ` · ${r.service_time}` : ''}` : 'Sem preferência'}</DetailRow>
                </dl>
                {r.lat != null && r.lng != null && (
                  <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm', 'mt-2')}>
                    <MapPin /> Abrir no mapa
                  </a>
                )}
              </section>

              <section className="rounded-lg border border-zinc-200 p-4">
                <p className="text-sm font-medium text-zinc-900">Notas da equipa</p>
                {r.admin_contacted_at
                  ? <p className="mt-0.5 text-[13px] text-emerald-700">Cliente contactado {formatDateTime(r.admin_contacted_at)}</p>
                  : <p className="mt-0.5 text-[13px] text-zinc-500">Cliente ainda não contactado.</p>}
                {r.admin_note && <p className="mt-2 whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] text-zinc-700">{r.admin_note}</p>}
                <Textarea className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notas da chamada (só a equipa vê)…" />
                <Button size="sm" variant={r.admin_contacted_at ? 'outline' : 'default'} className="mt-3" disabled={busy}
                  onClick={() => act(() => rpc('admin_mark_contacted', { p_broadcast: r.id, p_note: note || null }), 'Registado.')}>
                  <PhoneCall /> {r.admin_contacted_at ? 'Guardar nota' : 'Marcar como contactado'}
                </Button>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}

const QUOTE_LABEL: Record<string, string> = {
  pending: 'por enviar',
  onsite: 'por enviar',
  sent: 'a aguardar o cliente',
  accepted: 'aceite',
  rejected: 'recusado',
};
