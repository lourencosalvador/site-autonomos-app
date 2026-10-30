import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Ban, CalendarClock, CalendarPlus, Check, CheckCircle2, Clock, Copy, ExternalLink, FileText, Hourglass, Landmark,
  MapPin, MapPinned, MessageSquare, Phone, Receipt, SearchX, ShieldCheck, Star, Trash2, UserX,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { CallModal } from '../../components/CallModal';
import { CelebrationModal } from '../../components/CelebrationModal';
import { RatingModal } from '../../components/RatingModal';
import { SlideToConfirm } from '../../components/SlideToConfirm';
import { TextArea, TextInput } from '../../components/Field';
import { useAuth } from '../../auth/AuthContext';
import { navigate } from '../../router';
import {
  type Broadcast, type BroadcastPerson, type QuoteItem, type QuoteItemKey, QUOTE_ITEMS,
  acceptBroadcast, cancelBroadcast, cancelVisit, confirmService, getBroadcast, locationLine, mapsUrl, markVisitDone,
  providerMarkDone, requestOtherDates, requestVisit, respondQuote, scheduleVisit, sendQuote, submitPayment,
  subscribeBroadcasts, uploadPaymentProof,
} from '../../lib/broadcasts';
import { type Stage, stageLabel, stageOf } from '../../lib/requestStage';
import { formatKz } from '../../lib/payments';
import { formatIban } from '../../lib/phone';
import { type PaymentInfo, feeBreakdown, pct, usePaymentInfo } from '../../lib/settings';
import { notifyIncomingCall } from '../../lib/call';
import { useInbox, UnreadDot } from '../../components/app/Inbox';
import { FilePick } from '../../components/app/forms';
import { Avatar, Badge, Btn, Card, DetailRow, EmptyState, Notice, PageHeader, PageLoader, cx, formatDate, timeAgo } from '../../components/app/ui';

function errMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : '';
  if (m.includes('INVALID_AMOUNT')) return 'Indique um valor válido (mínimo 100 Kz).';
  if (m.includes('VISIT_PENDING')) return 'Conclua a visita de diagnóstico antes de enviar o orçamento.';
  if (m.includes('QUOTE_CLOSED')) return 'Este orçamento já não pode ser alterado.';
  if (m.includes('SLOTS_REQUIRED') || m.includes('INVALID_SLOTS')) return 'Indique datas futuras para a visita.';
  if (m.includes('TOO_MANY_SLOTS')) return 'Pode propor no máximo 5 datas.';
  if (m.includes('INVALID_SLOT')) return 'Essa data já não está disponível.';
  if (m.includes('VISIT_CLOSED')) return 'A visita já não pode ser alterada.';
  if (m.includes('PAYMENT_CLOSED')) return 'Este pagamento já foi enviado.';
  if (m.includes('CANCEL_CLOSED')) return 'O pedido já não pode ser cancelado.';
  if (m.includes('NOT_APPROVED')) return 'O seu perfil ainda não foi aprovado.';
  if (m.includes('TAKEN')) return 'Outro profissional já aceitou este pedido.';
  return m && !/^[A-Z_]+$/.test(m) ? m : 'Tente novamente dentro de instantes.';
}

export function fmtSlot(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export function RequestStatusPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { unread } = useInbox();
  const fees = usePaymentInfo();
  const [b, setB] = useState<Broadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const refetch = useCallback(async () => {
    try { setB(await getBroadcast(id)); } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void refetch(); }, [refetch]);
  useEffect(() => subscribeBroadcasts({ id }, () => { void refetch(); }), [id, refetch]);
  useEffect(() => {
    if (!b || b.status !== 'accepted') return;
    const t = setInterval(() => { void refetch(); }, 10000);
    return () => clearInterval(t);
  }, [b, refetch]);

  if (loading) return <PageLoader />;
  if (!b || !user) {
    return (
      <Card>
        <EmptyState icon={SearchX} title="Pedido não encontrado" description="Este pedido pode já não estar disponível." action={<Btn variant="outline" to="/conta">Voltar ao início</Btn>} />
      </Card>
    );
  }

  const iAmClient = user.id === b.client_id;
  const iAmProvider = user.id === b.provider_id;
  const other = iAmClient ? b.provider : b.client;
  const stage = stageOf(b);
  const label = stageLabel(b, !iAmClient);

  const run = async (fn: () => Promise<unknown>, okMsg?: string, after?: () => void) => {
    if (busy) return false;
    setBusy(true);
    try { await fn(); await refetch(); if (okMsg) success(okMsg); after?.(); return true; }
    catch (e) { toastError('Não foi possível concluir', errMessage(e)); return false; }
    finally { setBusy(false); }
  };

  const actions: Actions = {
    cancel: () => run(() => cancelBroadcast(b.id), 'Pedido cancelado'),
    accept: () => run(async () => { if (!(await acceptBroadcast(b.id))) throw new Error('TAKEN'); }, 'Pedido aceite'),
    requestVisit: (slots, note) => run(() => requestVisit(b.id, slots, note), 'Datas enviadas ao cliente'),
    cancelVisit: () => run(() => cancelVisit(b.id), 'Visita dispensada'),
    scheduleVisit: (slot) => run(() => scheduleVisit(b.id, slot), 'Visita agendada'),
    otherDates: (note) => run(() => requestOtherDates(b.id, note), 'Pedido de novas datas enviado'),
    visitDone: () => run(() => markVisitDone(b.id), 'Visita marcada como realizada'),
    sendQuote: (minor, note, items) => run(() => sendQuote(b.id, minor, note, items), 'Orçamento enviado ao cliente'),
    respond: (accept) => run(() => respondQuote(b.id, accept), accept ? 'Orçamento aceite' : 'Orçamento recusado'),
    providerDone: () => run(() => providerMarkDone(b.id), undefined, () => setCelebrate(true)),
    confirm: () => run(() => confirmService(b.id), 'Conclusão confirmada', () => setRateOpen(true)),
    pay: (url, ref) => run(() => submitPayment(b.id, url, ref), 'Comprovativo enviado'),
    rate: () => setRateOpen(true),
  };

  const contactOpen = !!other && (b.status === 'accepted' || b.status === 'completed');
  const unreadHere = unread.by_broadcast[b.id] ?? 0;

  return (
    <>
      <PageHeader
        back={{ label: 'Serviços', to: '/conta/servicos' }}
        title={b.category}
        description={`Pedido feito ${timeAgo(b.created_at)}`}
        actions={<Badge tone={label.tone} className="px-3 py-1 text-sm">{label.label}</Badge>}
      />

      <Progress stage={stage} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5 sm:p-7">
            {iAmClient ? (
              <ClientPanel b={b} stage={stage} busy={busy} actions={actions} fees={fees} />
            ) : iAmProvider ? (
              <ProviderPanel b={b} stage={stage} busy={busy} actions={actions} fees={fees} />
            ) : (
              <Status icon={Clock} title="Pedido disponível" text="Aceite este pedido antes de outro profissional para falar com o cliente."
                action={stage === 'searching' ? <Btn onClick={actions.accept} loading={busy}>Aceitar pedido</Btn> : undefined} />
            )}
          </Card>
          {(iAmClient || iAmProvider) && <RatePrompt b={b} iAmClient={iAmClient} onRate={actions.rate} />}
        </div>

        <aside className="space-y-6">
          {contactOpen && other && (
            <PersonCard person={other} iAmClient={iAmClient} unread={unreadHere}
              onChat={() => navigate(`/conta/chat/${b.id}`)} onCall={() => setCallOpen(true)} />
          )}
          <DetailsCard b={b} participant={iAmClient || iAmProvider} iAmClient={iAmClient} />
        </aside>
      </div>

      <CallModal
        open={callOpen}
        onClose={() => setCallOpen(false)}
        person={other}
        onInternetCall={() => {
          setCallOpen(false);
          if (other?.id) void notifyIncomingCall(other.id, { broadcastId: b.id, fromId: user.id, fromName: user.name, fromAvatar: user.avatarUrl });
          navigate(`/conta/chamada/${b.id}`);
        }}
      />
      <CelebrationModal open={celebrate} onClose={() => setCelebrate(false)} onWallet={() => { setCelebrate(false); navigate('/conta/financas'); }} />
      <RatingModal open={rateOpen} broadcastId={b.id} target={iAmClient ? 'provider' : 'client'}
        providerName={other?.name || (iAmClient ? 'o profissional' : 'o cliente')} onClose={() => setRateOpen(false)} onDone={() => { void refetch(); }} />
    </>
  );
}

type Actions = {
  cancel: () => void;
  accept: () => void;
  requestVisit: (slots: string[], note: string) => Promise<boolean>;
  cancelVisit: () => void;
  scheduleVisit: (slot: string) => void;
  otherDates: (note: string) => Promise<boolean>;
  visitDone: () => void;
  sendQuote: (minor: number, note: string, items: QuoteItem[]) => Promise<boolean>;
  respond: (accept: boolean) => void;
  providerDone: () => void;
  confirm: () => void;
  pay: (url: string, ref: string) => Promise<boolean>;
  rate: () => void;
};

const STEPS = ['Pedido', 'Profissional', 'Orçamento', 'Serviço', 'Pagamento', 'Concluído'];
const STEP_INDEX: Partial<Record<Stage, number>> = {
  searching: 1, visit_dates: 2, visit_requested: 2, visit_scheduled: 2, quote_pending: 2, quote_sent: 2, quote_rejected: 2,
  in_progress: 3, awaiting_confirmation: 3, awaiting_payment: 4, payment_review: 4, completed: 6,
};

function Progress({ stage }: { stage: Stage }) {
  const current = STEP_INDEX[stage];
  if (current === undefined) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-sm font-medium text-ink-500 sm:hidden">
        <span>Passo {Math.min(current + 1, STEPS.length)} de {STEPS.length}</span>
        <span className="text-ink-900">{STEPS[Math.min(current, STEPS.length - 1)]}</span>
      </div>
      <ol className="mt-2 grid grid-cols-6 gap-1.5 sm:mt-0 sm:gap-3">
        {STEPS.map((s, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={s} className="min-w-0">
              <div className={cx('h-1.5 rounded-full', done ? 'bg-brand-dark' : now ? 'bg-brand-cyan2' : 'bg-cloud-300')} />
              <p className={cx('mt-2 hidden truncate text-sm sm:block', done ? 'text-ink-700' : now ? 'font-semibold text-ink-900' : 'text-ink-400')}>
                {done && <Check size={14} className="-mt-0.5 mr-1 inline" />}{s}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const VISIT_STEPS = ['Visita solicitada', 'Aguardar agendamento', 'Visita agendada', 'Aguardar orçamento', 'Orçamento enviado'];

function VisitTimeline({ step }: { step: number }) {
  return (
    <ol className="mt-5 space-y-0 border-l-2 border-cloud-200 pl-5">
      {VISIT_STEPS.map((s, i) => {
        const done = i < step;
        const now = i === step;
        return (
          <li key={s} className="relative pb-3 last:pb-0">
            <span className={cx('absolute -left-[27px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2',
              done ? 'border-brand-dark bg-brand-dark' : now ? 'border-brand-cyan2 bg-white' : 'border-cloud-300 bg-white')} />
            <span className={cx('text-[15px]', done ? 'text-ink-500 line-through decoration-ink-300' : now ? 'font-semibold text-ink-900' : 'text-ink-400')}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Status({ icon: Icon, tone = 'neutral', title, text, action, children }: {
  icon: typeof Clock; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand'; title: string; text?: ReactNode; action?: ReactNode; children?: ReactNode;
}) {
  const ring = {
    neutral: 'bg-cloud-100 text-ink-500',
    brand: 'bg-brand-cyan/12 text-brand-dark',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
  }[tone];
  return (
    <div>
      <div className={cx('flex h-12 w-12 items-center justify-center rounded-xl', ring)}><Icon size={22} /></div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink-900">{title}</h2>
      {text && <div className="mt-1.5 max-w-xl text-base leading-relaxed text-ink-500">{text}</div>}
      {children}
      {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}

function CancelButton({ onCancel, busy }: { onCancel: () => void; busy: boolean }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <Btn variant="ghost" onClick={() => setConfirm(true)} disabled={busy} className="text-ink-500">Cancelar pedido</Btn>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[15px] text-ink-500">Cancelar este pedido?</span>
      <Btn variant="danger" size="md" onClick={onCancel} loading={busy}>Sim, cancelar</Btn>
      <Btn variant="ghost" size="md" onClick={() => setConfirm(false)}>Não</Btn>
    </div>
  );
}

function FreeVisitBadge() {
  return <Badge tone="success" className="px-2.5 py-1 text-sm">Visita gratuita</Badge>;
}

/* ─────────────────────────── Cliente ─────────────────────────── */

function ClientPanel({ b, stage, busy, actions, fees }: { b: Broadcast; stage: Stage; busy: boolean; actions: Actions; fees: PaymentInfo }) {
  const name = b.provider?.name || 'O profissional';
  const cancel = <CancelButton onCancel={actions.cancel} busy={busy} />;
  switch (stage) {
    case 'searching':
      return <Searching createdAt={b.created_at} category={b.category} cancel={cancel} />;
    case 'quote_pending':
      return b.visit_status === 'done' ? (
        <Status icon={Hourglass} title="A aguardar o orçamento" action={cancel}
          text={<>A visita foi realizada. {name} vai enviar-lhe o orçamento.</>}><VisitTimeline step={3} /></Status>
      ) : (
        <Status icon={Clock} title="A aguardar o orçamento" action={cancel}
          text={<>{name} aceitou o seu pedido e vai enviar-lhe o orçamento. Pode conversar para combinar detalhes.</>} />
      );
    case 'visit_dates':
      return (
        <Status icon={CalendarClock} title="A aguardar novas datas" action={cancel}
          text={<>Pediu outras datas para a visita. {name} vai propor novas opções.</>}><VisitTimeline step={1} /></Status>
      );
    case 'visit_requested':
      return <ScheduleVisit b={b} busy={busy} actions={actions} cancel={cancel} />;
    case 'visit_scheduled':
      return (
        <Status icon={CalendarClock} tone="brand" title="Visita agendada"
          text={<>{name} vai ao local <strong className="text-ink-900">{fmtSlot(b.visit_at!)}</strong> para avaliar o trabalho. O orçamento é enviado depois da visita.</>}
          action={<><OtherDatesButton actions={actions} busy={busy} label="Preciso de outra data" />{cancel}</>}>
          <div className="mt-3"><FreeVisitBadge /></div>
          <VisitTimeline step={2} />
        </Status>
      );
    case 'quote_rejected':
      return <Status icon={Clock} title="Recusou o orçamento" action={cancel} text={<>{name} pode enviar-lhe um novo valor. Se preferir não continuar, pode cancelar o pedido.</>} />;
    case 'quote_sent':
      return <QuoteReview b={b} busy={busy} onRespond={actions.respond} fees={fees} />;
    case 'in_progress':
      return (
        <Status icon={ShieldCheck} tone="brand" title="Orçamento aceite" action={cancel}
          text={<>{name} vai realizar o serviço. <strong className="text-ink-900">Só paga depois de o serviço estar concluído</strong> e de confirmar a conclusão.</>}>
          <AmountSummary b={b} audience="client" className="mt-5" />
        </Status>
      );
    case 'awaiting_confirmation':
      return (
        <Status icon={CheckCircle2} tone="success" title="O serviço foi concluído" text={<>{name} marcou o serviço como concluído. Confirme se está tudo feito.</>}>
          <div className="mt-6 max-w-md"><SlideToConfirm label="Deslize para confirmar" confirmingLabel="A confirmar…" tone="emerald" busy={busy} onConfirm={actions.confirm} /></div>
          <p className="mt-3 text-sm text-ink-400">Depois de confirmar, mostramos-lhe como fazer o pagamento.</p>
        </Status>
      );
    case 'awaiting_payment':
      return <PaymentGuide b={b} busy={busy} onPay={actions.pay} fees={fees} />;
    case 'payment_review':
      return (
        <Status icon={Receipt} tone="brand" title="Pagamento em verificação"
          text="Recebemos o seu comprovativo. A AUTONOMOUS está a confirmar a transferência; avisamos assim que estiver confirmada.">
          {b.proof_url && <a href={b.proof_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-brand-dark hover:underline"><FileText size={17} /> Ver comprovativo enviado</a>}
        </Status>
      );
    case 'completed':
      return (
        <Status icon={CheckCircle2} tone="success" title="Serviço concluído" text="Pagamento confirmado. Obrigado por usar a AUTONOMOUS."
          action={<Btn variant="outline" to="/conta/pedir">Novo pedido</Btn>}>
          <AmountSummary b={b} audience="client" className="mt-5" />
        </Status>
      );
    case 'cancelled':
      return <Status icon={Ban} title="Pedido cancelado" text="Este pedido foi cancelado." action={<Btn variant="outline" to="/conta/pedir">Novo pedido</Btn>} />;
    case 'no_providers':
      return <Status icon={UserX} tone="warning" title="Sem profissionais disponíveis" text="De momento não temos profissionais disponíveis para este serviço. Para mais informações, fale com o nosso apoio ao cliente." action={<Btn variant="outline" to="/conta/pedir">Fazer outro pedido</Btn>} />;
    default:
      return <Status icon={UserX} title="Sem resposta" text="Nenhum profissional aceitou este pedido." action={<Btn variant="outline" to="/conta/pedir">Tentar novamente</Btn>} />;
  }
}

function Searching({ createdAt, category, cancel }: { createdAt: string; category: string; cancel: ReactNode }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [createdAt]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-[3px] border-cloud-200" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-brand-dark" style={{ animationDuration: '1.2s' }} />
        <span className="text-[15px] font-semibold tabular-nums text-ink-900">{mm}:{ss}</span>
      </div>
      <h2 className="mt-6 text-xl font-semibold tracking-tight text-ink-900">À procura de um profissional</h2>
      <p className="mt-1.5 max-w-md text-base leading-relaxed text-ink-500">Enviámos o seu pedido aos profissionais verificados de {category}. Avisamos assim que alguém aceitar.</p>
      <div className="mt-6">{cancel}</div>
    </div>
  );
}

function OtherDatesButton({ actions, busy, label }: { actions: Actions; busy: boolean; label: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  if (!open) return <Btn variant="outline" onClick={() => setOpen(true)} disabled={busy}>{label}</Btn>;
  return (
    <div className="w-full space-y-3 rounded-xl border border-line p-4">
      <label htmlFor="other-note" className="text-[15px] font-medium text-ink-900">Que dias ou horas lhe dão jeito?</label>
      <TextArea id="other-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: sábado de manhã ou dias úteis depois das 17h." className="min-h-[80px]" />
      <div className="flex flex-wrap gap-2">
        <Btn size="md" loading={busy} onClick={async () => { if (await actions.otherDates(note)) setOpen(false); }}>Pedir outras datas</Btn>
        <Btn size="md" variant="ghost" onClick={() => setOpen(false)}>Voltar</Btn>
      </div>
    </div>
  );
}

function ScheduleVisit({ b, busy, actions, cancel }: { b: Broadcast; busy: boolean; actions: Actions; cancel: ReactNode }) {
  const slots = (b.visit_slots ?? []).filter((s) => new Date(s).getTime() > Date.now());
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">Agende a visita de diagnóstico</h2>
        <FreeVisitBadge />
      </div>
      <p className="mt-1.5 text-base leading-relaxed text-ink-500">
        {b.provider?.name || 'O profissional'} precisa de ver o local para preparar um orçamento correto. A visita é <strong className="text-ink-900">gratuita</strong>. Escolha uma das datas disponíveis.
      </p>
      {b.visit_note && <p className="mt-3 rounded-xl bg-cloud-100 px-4 py-3 text-[15px] text-ink-700">“{b.visit_note}”</p>}
      <VisitTimeline step={1} />
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {slots.map((s) => (
          <button key={s} onClick={() => setPicked(s)}
            className={cx('flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
              picked === s ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white text-ink-900 hover:bg-cloud-50')}>
            <CalendarClock size={19} className={picked === s ? 'text-brand-cyan' : 'text-ink-400'} />
            <span className="text-[15px] font-medium first-letter:uppercase">{fmtSlot(s)}</span>
          </button>
        ))}
      </div>
      {slots.length === 0 && <Notice tone="warning" className="mt-4">As datas propostas já passaram. Peça novas datas ao profissional.</Notice>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Btn onClick={() => picked && actions.scheduleVisit(picked)} disabled={!picked} loading={busy}>Confirmar data</Btn>
        <OtherDatesButton actions={actions} busy={busy} label="Nenhuma data me serve" />
      </div>
      <div className="mt-3">{cancel}</div>
    </div>
  );
}

function QuoteItemsList({ items }: { items: QuoteItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-ink-500">O orçamento inclui</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.key} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-[15px] text-ink-800"><Check size={16} className="text-emerald-600" /> {it.label}</span>
            {it.amount_minor != null && <span className="text-[15px] font-medium tabular-nums text-ink-900">{formatKz(it.amount_minor)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuoteReview({ b, busy, onRespond, fees }: { b: Broadcast; busy: boolean; onRespond: (accept: boolean) => void; fees: PaymentInfo }) {
  const [rejecting, setRejecting] = useState(false);
  const f = feeBreakdown(b.quote_minor ?? 0, fees);
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-ink-900">Orçamento recebido</h2>
      <p className="mt-1.5 text-base text-ink-500">{b.provider?.name || 'O profissional'} enviou o valor do serviço. Reveja os detalhes antes de decidir.</p>

      <div className="mt-6 rounded-2xl border border-line bg-cloud-50 p-5 sm:p-6">
        <p className="text-sm font-medium text-ink-500">Valor do serviço</p>
        <p className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink-900">{formatKz(f.service)}</p>
        <QuoteItemsList items={b.quote_items ?? []} />
        {b.quote_note && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{b.quote_note}</p>}
        <dl className="mt-5 divide-y divide-line border-t border-line">
          <DetailRow label="Serviço">{formatKz(f.service)}</DetailRow>
          <DetailRow label={`Taxa de serviço AUTONOMOUS (${pct(fees.client_fee_rate)}) · paga por si`}>{formatKz(f.clientFee)}</DetailRow>
          <div className="flex items-center justify-between gap-4 pt-3">
            <dt className="text-base font-semibold text-ink-900">Total a pagar</dt>
            <dd className="text-lg font-semibold text-ink-900">{formatKz(f.clientTotal)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          A comissão do profissional ({pct(fees.provider_fee_rate)}, {formatKz(f.providerFee)}) é descontada ao profissional e não altera o seu total.
        </p>
      </div>

      {rejecting ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-[15px] text-ink-500">Recusar este orçamento?</span>
          <Btn variant="danger" onClick={() => onRespond(false)} loading={busy}>Sim, recusar</Btn>
          <Btn variant="ghost" onClick={() => setRejecting(false)}>Voltar</Btn>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:flex">
          <Btn onClick={() => onRespond(true)} loading={busy} className="sm:min-w-[200px]"><Check size={18} /> Aceitar orçamento</Btn>
          <Btn variant="outline" onClick={() => setRejecting(true)} disabled={busy}>Recusar</Btn>
        </div>
      )}
      <p className="mt-4 text-sm text-ink-400">Só paga depois de o serviço estar concluído e de confirmar a conclusão.</p>
    </div>
  );
}

function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  const { success } = useToast();
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm text-ink-500">{label}</p>
        <p className="break-all font-display text-lg font-semibold tracking-wide text-ink-900">{display ?? value}</p>
      </div>
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(value).then(() => success('Copiado', label)); }}
        aria-label={`Copiar ${label}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-ink-500 hover:bg-cloud-100 hover:text-ink-900">
        <Copy size={17} />
      </button>
    </div>
  );
}

function PaymentGuide({ b, busy, onPay, fees }: { b: Broadcast; busy: boolean; onPay: (url: string, ref: string) => Promise<boolean>; fees: PaymentInfo }) {
  const { error: toastError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [ref, setRef] = useState('');
  const [uploading, setUploading] = useState(false);
  const total = (b.price_minor ?? 0) + (b.client_fee_minor ?? Math.round((b.price_minor ?? 0) * fees.client_fee_rate));
  const code = `AUT-${b.id.slice(0, 8).toUpperCase()}`;

  const submit = async () => {
    if (!file) { toastError('Falta o comprovativo', 'Anexe o comprovativo da transferência.'); return; }
    setUploading(true);
    try {
      const url = await uploadPaymentProof(file);
      await onPay(url, ref.trim());
    } catch (e) {
      toastError('Não foi possível enviar', e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-ink-900">Pagamento do serviço</h2>
      <p className="mt-1.5 text-base leading-relaxed text-ink-500">Confirmou que o serviço foi concluído. Faça a transferência e envie o comprovativo.</p>
      {b.payment_status === 'rejected' && (
        <Notice tone="danger" title="O comprovativo anterior não foi aceite" className="mt-5">{b.payment_rejected_reason || 'Envie um novo comprovativo.'}</Notice>
      )}
      <Notice tone="info" className="mt-5">O pagamento é feito apenas depois de o profissional terminar o trabalho — nunca antes.</Notice>

      <div className="mt-5 rounded-2xl border border-line bg-cloud-50 px-5 py-2">
        <div className="flex items-center gap-2 pt-3 text-sm font-medium text-ink-500"><Landmark size={16} /> Dados para transferência</div>
        <div className="divide-y divide-line">
          <CopyRow label="Montante a transferir" value={String(Math.round(total / 100))} display={formatKz(total)} />
          {fees.iban && <CopyRow label="IBAN" value={fees.iban} display={formatIban(fees.iban)} />}
          {fees.account_holder && <CopyRow label="Titular" value={fees.account_holder} />}
          {fees.bank_name && <CopyRow label="Banco" value={fees.bank_name} />}
          <CopyRow label="Descritivo (referência)" value={code} />
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-dark text-sm font-semibold text-white">1</span>
          <p className="text-[15px] leading-relaxed text-ink-700">Transfira <strong>{formatKz(total)}</strong> para o IBAN acima, com o descritivo <strong>{code}</strong>.</p>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-dark text-sm font-semibold text-white">2</span>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[15px] leading-relaxed text-ink-700">Anexe o comprovativo da transferência.</p>
            <FilePick label="Anexar comprovativo" icon={Receipt} accept="application/pdf,image/jpeg,image/png,image/webp" file={file} onChange={setFile} hint="PDF ou imagem, até 10 MB" />
            <TextInput value={ref} onChange={(e) => setRef(e.target.value)} placeholder="N.º da operação (opcional)" />
          </div>
        </li>
      </ol>
      <Btn onClick={submit} loading={busy || uploading} disabled={!file} className="mt-6 w-full sm:w-auto sm:min-w-[240px]">Enviar comprovativo</Btn>
      <p className="mt-3 text-sm text-ink-400">O serviço fica concluído quando a AUTONOMOUS confirmar a receção do pagamento.</p>
    </div>
  );
}

function AmountSummary({ b, audience, className }: { b: Broadcast; audience: 'client' | 'provider'; className?: string }) {
  const service = b.price_minor ?? 0;
  if (!service) return null;
  const clientFee = b.client_fee_minor ?? 0;
  const providerFee = b.provider_fee_minor ?? 0;
  return (
    <dl className={cx('max-w-md divide-y divide-line rounded-xl border border-line px-4', className)}>
      <DetailRow label="Serviço">{formatKz(service)}</DetailRow>
      {audience === 'client' ? (
        <>
          <DetailRow label="Taxa de serviço">{formatKz(clientFee)}</DetailRow>
          <DetailRow label="Total">{formatKz(service + clientFee)}</DetailRow>
        </>
      ) : (
        <>
          <DetailRow label="Comissão AUTONOMOUS">− {formatKz(providerFee)}</DetailRow>
          <DetailRow label="Vai receber">{formatKz(b.provider_net_minor ?? service - providerFee)}</DetailRow>
        </>
      )}
    </dl>
  );
}

/* ─────────────────────────── Profissional ─────────────────────────── */

function ProviderPanel({ b, stage, busy, actions, fees }: { b: Broadcast; stage: Stage; busy: boolean; actions: Actions; fees: PaymentInfo }) {
  const [editing, setEditing] = useState(false);
  const [proposing, setProposing] = useState(false);
  const client = b.client?.name || 'O cliente';
  switch (stage) {
    case 'quote_pending':
    case 'quote_rejected':
      if (proposing) return <VisitProposal busy={busy} onCancel={() => setProposing(false)} onSubmit={async (s, n) => { if (await actions.requestVisit(s, n)) setProposing(false); }} />;
      return (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Enviar orçamento</h2>
          <p className="mt-1.5 text-base text-ink-500">Indique o que está incluído e o valor. {client} revê e aceita antes de avançar.</p>
          {b.visit_status === 'done' && <Notice tone="success" className="mt-5">Visita realizada. Já pode enviar o orçamento.</Notice>}
          {stage === 'quote_rejected' && (
            <Notice tone="warning" title="Orçamento recusado" className="mt-5">{client} recusou o orçamento de {formatKz(b.quote_minor ?? 0)}. Pode enviar um novo valor.</Notice>
          )}
          <QuoteForm busy={busy} fees={fees} onSubmit={actions.sendQuote} initial={stage === 'quote_rejected' ? b : undefined} />
          {b.visit_status !== 'done' && (
            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[15px] font-semibold text-ink-900">Precisa de ver o local primeiro?</p>
                <p className="text-sm text-ink-500">Proponha datas para uma visita de diagnóstico gratuita.</p>
              </div>
              <Btn variant="outline" onClick={() => setProposing(true)} disabled={busy}><MapPinned size={18} /> Pedir visita</Btn>
            </div>
          )}
        </div>
      );
    case 'visit_dates':
      return (
        <div>
          <Notice tone="warning" title="O cliente pediu outras datas">{b.visit_note || 'Proponha novas datas para a visita.'}</Notice>
          <VisitProposal busy={busy} onSubmit={(s, n) => actions.requestVisit(s, n)} onCancelVisit={actions.cancelVisit} />
        </div>
      );
    case 'visit_requested':
      return proposing ? (
        <VisitProposal busy={busy} initial={b.visit_slots} onCancel={() => setProposing(false)} onSubmit={async (s, n) => { if (await actions.requestVisit(s, n)) setProposing(false); }} />
      ) : (
        <Status icon={CalendarClock} title="A aguardar o agendamento" text={<>Propôs {b.visit_slots?.length} data(s) para a visita. {client} vai escolher uma.</>}
          action={<><Btn variant="outline" onClick={() => setProposing(true)}>Alterar datas</Btn><Btn variant="ghost" onClick={actions.cancelVisit} disabled={busy}>Dispensar visita</Btn></>}>
          <ul className="mt-4 space-y-1.5">
            {(b.visit_slots ?? []).map((s) => <li key={s} className="flex items-center gap-2 text-[15px] text-ink-700 first-letter:uppercase"><CalendarClock size={16} className="text-ink-400" /> {fmtSlot(s)}</li>)}
          </ul>
          <VisitTimeline step={1} />
        </Status>
      );
    case 'visit_scheduled':
      return (
        <Status icon={CalendarClock} tone="brand" title="Visita agendada"
          text={<>Visita de diagnóstico <strong className="text-ink-900">{fmtSlot(b.visit_at!)}</strong>. Depois da visita, marque-a como realizada para enviar o orçamento.</>}
          action={<><Btn onClick={actions.visitDone} loading={busy}><Check size={18} /> Visita realizada</Btn><Btn variant="ghost" onClick={actions.cancelVisit} disabled={busy}>Dispensar visita</Btn></>}>
          <Notice tone="info" className="mt-4">O orçamento fica bloqueado até a visita estar realizada.</Notice>
          <VisitTimeline step={2} />
        </Status>
      );
    case 'quote_sent':
      return editing ? (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Alterar orçamento</h2>
          <QuoteForm busy={busy} fees={fees} initial={b} onSubmit={async (m, n, i) => { const ok = await actions.sendQuote(m, n, i); if (ok) setEditing(false); return ok; }} />
          <Btn variant="ghost" className="mt-3" onClick={() => setEditing(false)}>Cancelar</Btn>
        </div>
      ) : (
        <Status icon={Clock} title="Orçamento enviado"
          text={<>Enviou um orçamento de <strong className="text-ink-900">{formatKz(b.quote_minor ?? 0)}</strong>. A aguardar a resposta de {client}.</>}
          action={<Btn variant="outline" onClick={() => setEditing(true)}>Alterar orçamento</Btn>}>
          <QuoteItemsList items={b.quote_items ?? []} />
        </Status>
      );
    case 'in_progress':
      return (
        <Status icon={ShieldCheck} tone="brand" title="Orçamento aceite" text="Pode avançar com o serviço. Quando terminar, deslize para marcar como concluído.">
          <AmountSummary b={b} audience="provider" className="mt-5" />
          <div className="mt-6 max-w-md"><SlideToConfirm label="Deslize quando terminar" confirmingLabel="A marcar…" tone="emerald" busy={busy} onConfirm={actions.providerDone} /></div>
        </Status>
      );
    case 'awaiting_confirmation':
      return <Status icon={Hourglass} title="Concluído do seu lado" text={<>A aguardar que {client} confirme a conclusão. Depois disso, o cliente faz o pagamento.</>}><AmountSummary b={b} audience="provider" className="mt-5" /></Status>;
    case 'awaiting_payment':
    case 'payment_review':
      return (
        <Status icon={Receipt} title={stage === 'payment_review' ? 'Pagamento em verificação' : 'A aguardar o pagamento'}
          text={stage === 'payment_review' ? 'O cliente enviou o comprovativo. A AUTONOMOUS está a confirmar a receção.' : `${client} confirmou a conclusão e vai fazer o pagamento.`}>
          <AmountSummary b={b} audience="provider" className="mt-5" />
        </Status>
      );
    case 'completed':
      return (
        <Status icon={CheckCircle2} tone="success" title={b.payout_status === 'paid' ? 'Valor transferido' : 'Pagamento confirmado'}
          text={b.payout_status === 'paid' ? `Transferimos ${formatKz(b.provider_net_minor ?? 0)} para a sua conta.` : `Vamos transferir ${formatKz(b.provider_net_minor ?? 0)} para o IBAN do seu perfil.`}
          action={<Btn variant="outline" to="/conta/financas">Ver finanças</Btn>}>
          <AmountSummary b={b} audience="provider" className="mt-5" />
        </Status>
      );
    case 'cancelled':
      return <Status icon={Ban} title="Pedido cancelado" text="O cliente cancelou este pedido." action={<Btn variant="outline" to="/conta">Voltar ao início</Btn>} />;
    default:
      return <Status icon={Ban} title="Pedido fechado" action={<Btn variant="outline" to="/conta">Voltar ao início</Btn>} />;
  }
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function VisitProposal({ busy, initial, onSubmit, onCancel, onCancelVisit }: {
  busy: boolean; initial?: string[]; onSubmit: (slots: string[], note: string) => void | Promise<unknown>; onCancel?: () => void; onCancelVisit?: () => void;
}) {
  const [slots, setSlots] = useState<string[]>(() => {
    const fut = (initial ?? []).filter((s) => new Date(s).getTime() > Date.now()).map(toLocalInput);
    return fut.length ? fut : [''];
  });
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const min = toLocalInput(new Date(Date.now() + 30 * 60e3).toISOString());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const valid = slots.filter(Boolean).map((s) => new Date(s));
    if (!valid.length) return setError('Indique pelo menos uma data.');
    if (valid.some((d) => isNaN(d.getTime()) || d.getTime() <= Date.now())) return setError('As datas têm de ser no futuro.');
    setError(null);
    void onSubmit(valid.map((d) => d.toISOString()), note.trim());
  };

  return (
    <form onSubmit={submit} className="mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">Pedir visita de diagnóstico</h2>
        <FreeVisitBadge />
      </div>
      <p className="mt-1.5 text-base text-ink-500">Proponha até 5 datas. O cliente escolhe a que lhe der jeito. A visita é gratuita para o cliente.</p>
      <div className="mt-5 space-y-2">
        {slots.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextInput type="datetime-local" min={min} value={s} onChange={(e) => setSlots((v) => v.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Data ${i + 1}`} />
            {slots.length > 1 && (
              <button type="button" onClick={() => setSlots((v) => v.filter((_, j) => j !== i))} aria-label="Remover data"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line text-ink-400 hover:bg-cloud-100 hover:text-red-600"><Trash2 size={18} /></button>
            )}
          </div>
        ))}
      </div>
      {slots.length < 5 && (
        <Btn type="button" variant="ghost" size="md" className="mt-2" onClick={() => setSlots((v) => [...v, ''])}><CalendarPlus size={18} /> Adicionar outra data</Btn>
      )}
      <div className="mt-4 space-y-1.5">
        <label htmlFor="visit-note" className="text-[15px] font-medium text-ink-900">Mensagem para o cliente <span className="font-normal text-ink-400">(opcional)</span></label>
        <TextArea id="visit-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Preciso de ver a canalização antes de dar o valor." className="min-h-[80px]" />
      </div>
      {error && <p className="mt-3 text-[15px] font-medium text-red-600">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Btn type="submit" loading={busy}>Enviar datas ao cliente</Btn>
        {onCancel && <Btn type="button" variant="ghost" onClick={onCancel}>Voltar</Btn>}
        {onCancelVisit && <Btn type="button" variant="ghost" onClick={onCancelVisit} disabled={busy}>Dispensar visita</Btn>}
      </div>
    </form>
  );
}

function QuoteForm({ busy, fees, onSubmit, initial }: {
  busy: boolean; fees: PaymentInfo; onSubmit: (minor: number, note: string, items: QuoteItem[]) => Promise<boolean>; initial?: Broadcast;
}) {
  const start = useMemo(() => {
    const map: Partial<Record<QuoteItemKey, string>> = {};
    for (const it of initial?.quote_items ?? []) map[it.key] = it.amount_minor != null ? String(Math.round(it.amount_minor / 100)) : '';
    return map;
  }, [initial]);
  const [checked, setChecked] = useState<Partial<Record<QuoteItemKey, string>>>(start);
  const [manual, setManual] = useState(initial?.quote_minor && !(initial.quote_items ?? []).some((i) => i.amount_minor != null) ? String(Math.round(initial.quote_minor / 100)) : '');
  const [note, setNote] = useState(initial?.quote_note ?? '');
  const [error, setError] = useState<string | null>(null);

  const keys = Object.keys(checked) as QuoteItemKey[];
  const itemSum = keys.reduce((s, k) => s + (Number(checked[k]) || 0), 0);
  const usesItemAmounts = keys.some((k) => (Number(checked[k]) || 0) > 0);
  const kz = usesItemAmounts ? itemSum : Number(manual.replace(/\D/g, '')) || 0;
  const f = feeBreakdown(kz * 100, fees);

  const toggle = (k: QuoteItemKey) => setChecked((c) => {
    const n = { ...c };
    if (k in n) delete n[k]; else n[k] = '';
    return n;
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (keys.length === 0) return setError('Assinale o que está incluído no orçamento.');
    if (kz < 100) return setError('Indique um valor de pelo menos 100 Kz.');
    setError(null);
    const items: QuoteItem[] = QUOTE_ITEMS.filter((q) => q.key in checked).map((q) => ({
      key: q.key, label: q.label, amount_minor: Number(checked[q.key]) > 0 ? Number(checked[q.key]) * 100 : null,
    }));
    await onSubmit(kz * 100, note.trim(), items);
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div>
        <p className="text-[15px] font-medium text-ink-900">O que está incluído?</p>
        <p className="text-sm text-ink-500">Assinale e, se quiser, indique o valor de cada parte. O total é calculado automaticamente.</p>
        <div className="mt-3 space-y-2">
          {QUOTE_ITEMS.map((q) => {
            const on = q.key in checked;
            return (
              <div key={q.key} className={cx('flex flex-col gap-2 rounded-xl border px-4 py-3 transition-colors sm:flex-row sm:items-center', on ? 'border-brand-cyan2 bg-brand-cyan/[0.05]' : 'border-line bg-white')}>
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={on} onChange={() => toggle(q.key)} className="h-5 w-5 shrink-0 cursor-pointer rounded accent-[#03475E]" />
                  <span>
                    <span className="block text-[15px] font-medium text-ink-900">{q.label}</span>
                    <span className="block text-sm text-ink-400">{q.hint}</span>
                  </span>
                </label>
                {on && (
                  <div className="flex h-11 items-center rounded-lg border border-line bg-white px-3 sm:w-44">
                    <input inputMode="numeric" value={checked[q.key] ? Number(checked[q.key]).toLocaleString('pt-PT') : ''} placeholder="Valor (opcional)"
                      onChange={(e) => setChecked((c) => ({ ...c, [q.key]: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                      className="min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400/70 focus:outline-none" />
                    <span className="text-sm text-ink-400">Kz</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!usesItemAmounts && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quote-total" className="text-[15px] font-medium text-ink-900">Valor total do serviço</label>
          <div className="flex h-14 items-center rounded-xl border border-line bg-white px-4 focus-within:border-brand-cyan2 focus-within:ring-4 focus-within:ring-brand-cyan/15">
            <input id="quote-total" inputMode="numeric" value={manual ? Number(manual).toLocaleString('pt-PT') : ''} placeholder="0"
              onChange={(e) => setManual(e.target.value.replace(/\D/g, '').slice(0, 9))}
              className="min-w-0 flex-1 bg-transparent font-display text-2xl font-semibold text-ink-900 placeholder:text-ink-300 focus:outline-none" />
            <span className="text-lg font-semibold text-ink-400">Kz</span>
          </div>
        </div>
      )}

      {kz > 0 && (
        <dl className="divide-y divide-line rounded-xl border border-line px-4">
          <DetailRow label="Valor do serviço">{formatKz(f.service)}</DetailRow>
          <DetailRow label={`O cliente paga (+${pct(fees.client_fee_rate)} taxa de serviço)`}>{formatKz(f.clientTotal)}</DetailRow>
          <DetailRow label={`Comissão AUTONOMOUS (${pct(fees.provider_fee_rate)})`}>− {formatKz(f.providerFee)}</DetailRow>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-[15px] font-semibold text-ink-900">Vai receber</dt>
            <dd className="text-base font-semibold text-ink-900">{formatKz(f.providerNet)}</dd>
          </div>
        </dl>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="quote-note" className="text-[15px] font-medium text-ink-900">Observações <span className="font-normal text-ink-400">(opcional)</span></label>
        <TextArea id="quote-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: garantia de 3 meses; prazo de 2 dias." className="min-h-[90px]" />
      </div>
      {error && <p className="text-[15px] font-medium text-red-600">{error}</p>}
      <Btn type="submit" loading={busy} className="w-full sm:w-auto sm:min-w-[220px]">Enviar orçamento</Btn>
    </form>
  );
}

/* ─────────────────────────── Comum ─────────────────────────── */

function RatePrompt({ b, iAmClient, onRate }: { b: Broadcast; iAmClient: boolean; onRate: () => void }) {
  const eligible = !!b.client_confirmed_at || b.status === 'completed';
  const done = iAmClient ? b.client_rated : b.provider_rated;
  if (!eligible || done || b.status === 'cancelled') return null;
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><Star size={20} className="fill-amber-400" /></span>
        <div>
          <p className="text-base font-semibold text-ink-900">{iAmClient ? 'Avalie o profissional' : 'Avalie o cliente'}</p>
          <p className="text-[15px] text-ink-500">A sua avaliação ajuda a manter a confiança na plataforma.</p>
        </div>
      </div>
      <Btn variant="outline" onClick={onRate}>Avaliar</Btn>
    </Card>
  );
}

function PersonCard({ person, iAmClient, unread, onChat, onCall }: { person: BroadcastPerson; iAmClient: boolean; unread: number; onChat: () => void; onCall: () => void }) {
  const subtitle = iAmClient
    ? person.company_name || person.specialty || (person.work_areas?.length ? person.work_areas.join(' · ') : person.work_area) || 'Profissional'
    : 'Cliente';
  return (
    <Card className="p-5 sm:p-6">
      <p className="text-sm font-medium text-ink-500">{iAmClient ? 'O seu profissional' : 'Cliente'}</p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={person.name} src={person.avatar_url} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink-900">{person.name || '—'}</p>
          <p className="truncate text-[15px] text-ink-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Btn onClick={onChat} size="md" className="relative">
          <MessageSquare size={18} /> Conversar
          {unread > 0 && <UnreadDot count={unread} className="absolute -right-1.5 -top-1.5 ring-2 ring-white" />}
        </Btn>
        <Btn onClick={onCall} size="md" variant="outline"><Phone size={18} /> Ligar</Btn>
      </div>
      {iAmClient && <Btn variant="ghost" size="md" className="mt-2 w-full" to={`/conta/prestador/${person.id}`}>Ver perfil e portfólio</Btn>}
    </Card>
  );
}

function DetailsCard({ b, participant, iAmClient }: { b: Broadcast; participant: boolean; iAmClient: boolean }) {
  const loc = locationLine(b);
  const map = participant ? mapsUrl(b) : null;
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-ink-900">Detalhes do pedido</h2>
      <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{b.description}</p>
      <dl className="mt-4 divide-y divide-line border-t border-line">
        <DetailRow label="Categoria">{b.category}</DetailRow>
        <DetailRow label="Data">{b.service_date ? `${formatDate(b.service_date)}${b.service_time ? `, ${b.service_time}` : ''}` : 'Sem preferência'}</DetailRow>
        {loc && <DetailRow label="Local">{loc}</DetailRow>}
        {participant && b.address && <DetailRow label="Morada">{b.address}</DetailRow>}
        {b.visit_at && <DetailRow label="Visita">{fmtSlot(b.visit_at)}</DetailRow>}
        {b.quote_status === 'accepted' && !!b.price_minor && (
          <>
            <DetailRow label="Serviço">{formatKz(b.price_minor)}</DetailRow>
            {iAmClient
              ? <DetailRow label="Total a pagar">{formatKz(b.price_minor + (b.client_fee_minor ?? 0))}</DetailRow>
              : <DetailRow label="Vai receber">{formatKz(b.provider_net_minor ?? b.price_minor)}</DetailRow>}
          </>
        )}
      </dl>
      {map && (
        <a href={map} target="_blank" rel="noopener noreferrer"
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-[15px] font-semibold text-ink-900 hover:bg-cloud-100">
          <MapPin size={17} /> Abrir no mapa <ExternalLink size={14} className="text-ink-400" />
        </a>
      )}
    </Card>
  );
}

