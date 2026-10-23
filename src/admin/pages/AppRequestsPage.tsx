import { useMemo, useState } from 'react';
import { Building2, ClipboardCheck, MessageCircle, Phone, PhoneCall, RefreshCw } from 'lucide-react';
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

type Person = { id: string; name: string | null; phone: string | null; email: string | null };
type Provider = Person & { company_name: string | null; work_areas: string[] | null };

type Stage =
  | 'searching' | 'unanswered' | 'quote_pending' | 'quote_onsite' | 'quote_sent' | 'quote_rejected'
  | 'awaiting_payment' | 'in_progress' | 'awaiting_confirmation' | 'completed' | 'cancelled' | 'no_providers' | 'expired';

export type AppRequest = {
  id: string;
  category: string;
  description: string;
  city: string | null;
  address: string | null;
  service_date: string | null;
  service_time: string | null;
  status: string;
  stage: Stage;
  quote_status: string;
  quote_minor: number | null;
  quote_note: string | null;
  quote_sent_at: string | null;
  quote_responded_at: string | null;
  onsite_at: string | null;
  price_minor: number;
  payment_status: string;
  paid_at: string | null;
  held_minor: number | null;
  provider_done_at: string | null;
  escrow_released: boolean;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  admin_contacted_at: string | null;
  admin_note: string | null;
  client: Person | null;
  provider: Provider | null;
};

const STAGE: Record<Stage, { label: string; tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' }> = {
  searching: { label: 'À procura', tone: 'brand' },
  unanswered: { label: 'Sem resposta', tone: 'danger' },
  quote_pending: { label: 'Orçamento por enviar', tone: 'warning' },
  quote_onsite: { label: 'Orçamento no local', tone: 'warning' },
  quote_sent: { label: 'Orçamento enviado', tone: 'brand' },
  quote_rejected: { label: 'Orçamento recusado', tone: 'danger' },
  awaiting_payment: { label: 'Por pagar', tone: 'warning' },
  in_progress: { label: 'Pago · em curso', tone: 'brand' },
  awaiting_confirmation: { label: 'A aguardar confirmação', tone: 'brand' },
  completed: { label: 'Concluído', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  no_providers: { label: 'Sem prestadores', tone: 'neutral' },
  expired: { label: 'Expirado', tone: 'neutral' },
};

export function needsCall(r: AppRequest) {
  if (r.status !== 'accepted' || r.payment_status !== 'unpaid' || r.admin_contacted_at) return false;
  return (!!r.provider?.company_name && (r.quote_status === 'pending' || r.quote_status === 'onsite')) || r.quote_status === 'rejected';
}

type Filter = 'call' | 'quote' | 'payment' | 'active' | 'all';
const QUOTE_STAGES: Stage[] = ['quote_pending', 'quote_onsite', 'quote_sent', 'quote_rejected'];
const ACTIVE_STAGES: Stage[] = ['in_progress', 'awaiting_confirmation'];

export function AppRequestsPage({ onChange }: { onChange?: () => void }) {
  const q = useAdminQuery(() => rpc<AppRequest[]>('admin_app_requests', { p_limit: 500 }), [], 20_000);
  const [filter, setFilter] = useState<Filter>('call');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const groups = useMemo(() => ({
    call: rows.filter(needsCall),
    quote: rows.filter((r) => QUOTE_STAGES.includes(r.stage)),
    payment: rows.filter((r) => r.stage === 'awaiting_payment'),
    active: rows.filter((r) => ACTIVE_STAGES.includes(r.stage)),
    all: rows,
  }), [rows]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return groups[filter].filter((r) => !s || [r.category, r.client?.name, r.client?.phone, r.provider?.name, r.provider?.company_name]
      .some((v) => (v ?? '').toLowerCase().includes(s)));
  }, [groups, filter, search]);

  const open = rows.find((r) => r.id === openId) ?? null;
  const reload = () => { q.reload(); onChange?.(); };

  return (
    <>
      <PageHeader
        title="Pedidos da app"
        description="Todos os pedidos feitos pelos clientes na app web, da procura de profissional até à conclusão."
        actions={<Button variant="outline" size="sm" onClick={reload} disabled={q.loading}><RefreshCw className={q.loading ? 'animate-spin' : ''} /> Atualizar</Button>}
      />

      {groups.call.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <PhoneCall className="mt-0.5 size-4 shrink-0" />
          <p>
            <b>{groups.call.length} pedido(s) precisam de uma chamada ao cliente.</b> Um prestador de empresa aceitou (o orçamento pode ser feito no local)
            ou o cliente recusou o orçamento. Ligue ao cliente, explique e marque como contactado.
          </p>
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'call', label: 'Ligar ao cliente', count: groups.call.length },
              { value: 'quote', label: 'Orçamento', count: groups.quote.length },
              { value: 'payment', label: 'Por pagar', count: groups.payment.length },
              { value: 'active', label: 'Em curso', count: groups.active.length },
              { value: 'all', label: 'Todos', count: groups.all.length },
            ]}
            className="max-w-full overflow-x-auto"
          />
          <div className="lg:w-72"><SearchInput value={search} onChange={setSearch} placeholder="Cliente, prestador, empresa…" /></div>
        </div>

        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={q.reload} /></div>}

        {q.loading && !q.data ? (
          <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : list.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Nada por aqui" description={filter === 'call' ? 'Nenhum cliente a precisar de chamada.' : 'Sem pedidos nesta vista.'} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Pedido</TH>
                <TH>Cliente</TH>
                <TH>Prestador</TH>
                <TH>Etapa</TH>
                <TH className="text-right">Valor</TH>
                <TH>Criado</TH>
              </TR>
            </THead>
            <TBody>
              {list.map((r) => (
                <TR key={r.id} className="cursor-pointer hover:bg-zinc-50/80" onClick={() => setOpenId(r.id)}>
                  <TD>
                    <p className="font-medium text-zinc-900">{r.category}</p>
                    <p className="max-w-[220px] truncate text-xs text-zinc-500">{r.description}</p>
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
                  <TD>
                    <div className="flex flex-col items-start gap-1">
                      <Badge tone={STAGE[r.stage]?.tone ?? 'neutral'}>{STAGE[r.stage]?.label ?? r.stage}</Badge>
                      {needsCall(r) && <span className="text-[11px] font-medium text-amber-700">Ligar ao cliente</span>}
                      {r.admin_contacted_at && r.status === 'accepted' && r.payment_status === 'unpaid' && <span className="text-[11px] text-zinc-400">Contactado {timeAgo(r.admin_contacted_at)}</span>}
                    </div>
                  </TD>
                  <TD className="text-right tabular-nums">
                    {r.quote_minor ? formatKz(r.quote_minor) : <span className="text-zinc-400">—</span>}
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
  const [amount, setAmount] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [busy, setBusy] = useState(false);
  const r = request;

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await run(fn, msg); onChanged(); setNote(''); setAmount(''); setQuoteNote(''); } catch {} finally { setBusy(false); }
  };

  const canQuote = r && r.status === 'accepted' && r.payment_status === 'unpaid' && r.quote_status !== 'accepted';
  const kz = Number(amount.replace(/\D/g, '')) || 0;

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
              <DialogDescription className="mt-1">Criado {formatDateTime(r.created_at)}</DialogDescription>
              {needsCall(r) && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
                  {r.quote_status === 'rejected'
                    ? <>O cliente <b>recusou o orçamento</b>. Ligue para perceber o motivo e ajudar a chegar a acordo.</>
                    : <>Aceite por um prestador da empresa <b>{r.provider?.company_name}</b>. O valor pode ser dado depois de inspecionar o trabalho no local: ligue ao cliente e explique como funciona.</>}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
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
                      {r.provider.company_name
                        ? <Badge tone="warning"><Building2 className="size-3" /> {r.provider.company_name}</Badge>
                        : <Badge>Individual</Badge>}
                    </div>
                    <p className="text-[13px] text-zinc-500">{[r.provider.phone, r.provider.email].filter(Boolean).join(' · ') || '—'}</p>
                    {r.provider.work_areas?.length ? <p className="mt-1 text-[13px] text-zinc-500">Áreas: {r.provider.work_areas.join(', ')}</p> : null}
                    <div className="mt-3"><ContactButtons phone={r.provider.phone} /></div>
                  </div>
                ) : <p className="text-[13px] text-zinc-500">Ainda nenhum prestador aceitou.</p>}
              </section>

              <section>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Pedido</p>
                <p className="whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] leading-relaxed text-zinc-900">{r.description}</p>
                <dl className="mt-2 divide-y divide-zinc-100">
                  <DetailRow label="Local">{[r.address, r.city].filter(Boolean).join(', ') || '—'}</DetailRow>
                  <DetailRow label="Data pretendida">{r.service_date ? `${formatDate(r.service_date)}${r.service_time ? ` · ${r.service_time}` : ''}` : 'Sem preferência'}</DetailRow>
                </dl>
              </section>

              <section>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Orçamento e pagamento</p>
                <dl className="divide-y divide-zinc-100">
                  <DetailRow label="Estado do orçamento">{QUOTE_LABEL[r.quote_status] ?? r.quote_status}</DetailRow>
                  {r.onsite_at && <DetailRow label="Orçamento no local desde">{formatDateTime(r.onsite_at)}</DetailRow>}
                  <DetailRow label="Valor proposto">{r.quote_minor ? formatKz(r.quote_minor) : '—'}</DetailRow>
                  {r.quote_minor ? <DetailRow label="Cliente paga (com 10%)">{formatKz(Math.round(r.quote_minor * 1.1))}</DetailRow> : null}
                  {r.quote_sent_at && <DetailRow label="Enviado">{formatDateTime(r.quote_sent_at)}</DetailRow>}
                  {r.quote_responded_at && <DetailRow label="Resposta do cliente">{formatDateTime(r.quote_responded_at)}</DetailRow>}
                  <DetailRow label="Pagamento">{r.payment_status === 'paid' ? `Pago ${formatDateTime(r.paid_at)} · ${formatKz(r.held_minor ?? 0)}` : 'Por pagar'}</DetailRow>
                  {r.provider_done_at && <DetailRow label="Prestador concluiu">{formatDateTime(r.provider_done_at)}</DetailRow>}
                  {r.completed_at && <DetailRow label="Cliente confirmou">{formatDateTime(r.completed_at)}</DetailRow>}
                </dl>
                {r.quote_note && <p className="mt-2 whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] text-zinc-700">{r.quote_note}</p>}
              </section>

              {canQuote && (
                <section className="rounded-lg border border-zinc-200 p-4">
                  <p className="text-sm font-medium text-zinc-900">Enviar orçamento em nome do prestador</p>
                  <p className="mt-0.5 text-[13px] text-zinc-500">Use quando a empresa lhe comunicar o valor. O cliente vê-o na app e decide.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                    <div className="space-y-1.5">
                      <Label htmlFor="adm-amount">Valor (Kz)</Label>
                      <Input id="adm-amount" inputMode="numeric" value={kz ? kz.toLocaleString('pt-PT') : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="adm-qnote">O que inclui (opcional)</Label>
                      <Input id="adm-qnote" value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} placeholder="Ex.: material e mão de obra" />
                    </div>
                  </div>
                  <Button size="sm" className="mt-3" disabled={busy || kz < 100}
                    onClick={() => act(() => rpc('admin_set_quote', { p_broadcast: r.id, p_amount_minor: kz * 100, p_note: quoteNote || null }), 'Orçamento enviado ao cliente.')}>
                    Enviar orçamento
                  </Button>
                </section>
              )}

              <section className="rounded-lg border border-zinc-200 p-4">
                <p className="text-sm font-medium text-zinc-900">Contacto com o cliente</p>
                {r.admin_contacted_at
                  ? <p className="mt-0.5 text-[13px] text-emerald-700">Contactado {formatDateTime(r.admin_contacted_at)}</p>
                  : <p className="mt-0.5 text-[13px] text-zinc-500">Ainda não contactado.</p>}
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
  pending: 'Por enviar',
  onsite: 'No local (a aguardar visita)',
  sent: 'Enviado · a aguardar cliente',
  accepted: 'Aceite pelo cliente',
  rejected: 'Recusado pelo cliente',
};
