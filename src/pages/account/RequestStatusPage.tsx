import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Ban, Check, CheckCircle2, Clock, MapPinned, MessageSquare, Phone, SearchX, ShieldCheck, Star, UserX } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { CallModal } from '../../components/CallModal';
import { CelebrationModal } from '../../components/CelebrationModal';
import { RatingModal } from '../../components/RatingModal';
import { SlideToConfirm } from '../../components/SlideToConfirm';
import { TextArea } from '../../components/Field';
import { PaymentPanel } from './PaymentPanel';
import { useAuth } from '../../auth/AuthContext';
import { navigate } from '../../router';
import {
  type Broadcast, type BroadcastPerson,
  acceptBroadcast, cancelBroadcast, completeBroadcast, getBroadcast, providerMarkDone, quoteOnsite, respondQuote, sendQuote,
  subscribeBroadcasts,
} from '../../lib/broadcasts';
import { type Stage, stageLabel, stageOf } from '../../lib/requestStage';
import { formatKz } from '../../lib/payments';
import { notifyIncomingCall } from '../../lib/call';
import { Avatar, Badge, Btn, Card, DetailRow, EmptyState, Notice, PageHeader, PageLoader, cx, formatDate, timeAgo } from '../../components/app/ui';

const FEE_RATE = 0.1;

function errMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : '';
  if (m.includes('INVALID_AMOUNT')) return 'Indique um valor válido (mínimo 100 Kz).';
  if (m.includes('QUOTE_CLOSED')) return 'Este orçamento já não pode ser alterado.';
  if (m.includes('NOT_APPROVED')) return 'O seu perfil ainda não foi aprovado.';
  return 'Tente novamente dentro de instantes.';
}

export function RequestStatusPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
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
    const t = setInterval(() => { void refetch(); }, 8000);
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

  const run = async (fn: () => Promise<unknown>, after?: () => void, okMsg?: string) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); await refetch(); if (okMsg) success(okMsg); after?.(); }
    catch (e) { toastError('Não foi possível concluir', errMessage(e)); }
    finally { setBusy(false); }
  };

  const actions = {
    cancel: () => run(() => cancelBroadcast(b.id), undefined, 'Pedido cancelado'),
    accept: () => run(async () => { if (!(await acceptBroadcast(b.id))) throw new Error('TAKEN'); }, undefined, 'Pedido aceite'),
    sendQuote: (minor: number, note: string) => run(() => sendQuote(b.id, minor, note), undefined, 'Orçamento enviado ao cliente'),
    onsite: () => run(() => quoteOnsite(b.id), undefined, 'Marcado: orçamento no local'),
    respond: (accept: boolean) => run(() => respondQuote(b.id, accept), undefined, accept ? 'Orçamento aceite' : 'Orçamento recusado'),
    providerDone: () => run(() => providerMarkDone(b.id), () => setCelebrate(true)),
    complete: () => run(() => completeBroadcast(b.id), () => setRateOpen(true)),
    refresh: () => { void refetch(); },
  };

  const contactOpen = !!other && (b.status === 'accepted' || b.status === 'completed');

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
              <ClientPanel b={b} stage={stage} busy={busy} actions={actions} onRate={() => setRateOpen(true)} />
            ) : iAmProvider ? (
              <ProviderPanel b={b} stage={stage} busy={busy} actions={actions} />
            ) : (
              <Status
                icon={Clock}
                title="Pedido disponível"
                text="Aceite este pedido antes de outro profissional para falar com o cliente."
                action={stage === 'searching' ? <Btn onClick={actions.accept} loading={busy}>Aceitar pedido</Btn> : undefined}
              />
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          {contactOpen && other && (
            <PersonCard
              person={other}
              iAmClient={iAmClient}
              onChat={() => navigate(`/conta/chat/${b.id}`)}
              onCall={() => setCallOpen(true)}
            />
          )}
          <DetailsCard b={b} />
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
      <RatingModal open={rateOpen} broadcastId={b.id} providerName={other?.name || 'o profissional'} onClose={() => setRateOpen(false)} />
    </>
  );
}

type Actions = {
  cancel: () => void;
  accept: () => void;
  sendQuote: (minor: number, note: string) => void;
  onsite: () => void;
  respond: (accept: boolean) => void;
  providerDone: () => void;
  complete: () => void;
  refresh: () => void;
};

const STEPS = ['Pedido', 'Profissional', 'Orçamento', 'Pagamento', 'Serviço', 'Concluído'];
const STEP_INDEX: Partial<Record<Stage, number>> = {
  searching: 1, quote_pending: 2, quote_sent: 2, quote_rejected: 2, awaiting_payment: 3, in_progress: 4, awaiting_confirmation: 5, completed: 6,
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

function Status({ icon: Icon, tone = 'neutral', title, text, action, children }: {
  icon: typeof Clock; tone?: 'neutral' | 'success' | 'warning' | 'danger'; title: string; text?: ReactNode; action?: ReactNode; children?: ReactNode;
}) {
  const ring = {
    neutral: 'bg-cloud-100 text-ink-500',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
  }[tone];
  return (
    <div>
      <div className={cx('flex h-12 w-12 items-center justify-center rounded-xl', ring)}><Icon size={22} /></div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink-900">{title}</h2>
      {text && <p className="mt-1.5 max-w-xl text-base leading-relaxed text-ink-500">{text}</p>}
      {children}
      {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}

function CancelButton({ onCancel, busy }: { onCancel: () => void; busy: boolean }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return <Btn variant="ghost" onClick={() => setConfirm(true)} disabled={busy} className="text-ink-500">Cancelar pedido</Btn>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[15px] text-ink-500">Cancelar este pedido?</span>
      <Btn variant="danger" size="md" onClick={onCancel} loading={busy}>Sim, cancelar</Btn>
      <Btn variant="ghost" size="md" onClick={() => setConfirm(false)}>Não</Btn>
    </div>
  );
}

function ClientPanel({ b, stage, busy, actions, onRate }: { b: Broadcast; stage: Stage; busy: boolean; actions: Actions; onRate: () => void }) {
  const name = b.provider?.name || 'O profissional';
  switch (stage) {
    case 'searching':
      return <Searching createdAt={b.created_at} category={b.category} cancel={<CancelButton onCancel={actions.cancel} busy={busy} />} />;
    case 'quote_pending':
      return (
        <Status icon={Clock} title="A aguardar o orçamento" action={<CancelButton onCancel={actions.cancel} busy={busy} />}
          text={<>{name} aceitou o seu pedido e vai enviar-lhe o orçamento. Entretanto, pode conversar para combinar os detalhes.</>} />
      );
    case 'quote_rejected':
      return (
        <Status icon={Clock} title="Recusou o orçamento" action={<CancelButton onCancel={actions.cancel} busy={busy} />}
          text={<>{name} pode enviar-lhe um novo valor. Se preferir não continuar, pode cancelar o pedido.</>} />
      );
    case 'quote_sent':
      return <QuoteReview b={b} busy={busy} onRespond={actions.respond} />;
    case 'awaiting_payment':
      return (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Pagamento</h2>
          <p className="mt-1.5 text-base text-ink-500">Aceitou o orçamento. Faça o pagamento para o profissional avançar com o serviço.</p>
          <PaymentPanel requestId={b.id} priceMinor={b.price_minor ?? 0} onPaid={actions.refresh} />
          <div className="mt-4"><CancelButton onCancel={actions.cancel} busy={busy} /></div>
        </div>
      );
    case 'in_progress':
      return (
        <Status icon={ShieldCheck} tone="success" title="Pagamento retido em segurança"
          text={<>O valor de <strong className="text-ink-900">{formatKz(b.held_minor ?? 0)}</strong> só é libertado ao profissional quando confirmar que o serviço foi concluído.</>} />
      );
    case 'awaiting_confirmation':
      return (
        <Status icon={CheckCircle2} tone="success" title="O serviço foi concluído"
          text={<>{name} marcou o serviço como concluído. Confirme para libertar o pagamento.</>}>
          <div className="mt-6 max-w-md"><SlideToConfirm label="Deslize para confirmar" confirmingLabel="A confirmar…" tone="emerald" busy={busy} onConfirm={actions.complete} /></div>
        </Status>
      );
    case 'completed':
      return (
        <Status icon={CheckCircle2} tone="success" title="Serviço concluído" text="Obrigado por usar a AUTONOMOUS."
          action={<><Btn onClick={onRate}><Star size={18} /> Avaliar profissional</Btn><Btn variant="outline" to="/conta/pedir">Novo pedido</Btn></>} />
      );
    case 'cancelled':
      return <Status icon={Ban} title="Pedido cancelado" text="Este pedido foi cancelado." action={<Btn variant="outline" to="/conta/pedir">Novo pedido</Btn>} />;
    case 'no_providers':
      return (
        <Status icon={UserX} tone="warning" title="Sem profissionais disponíveis"
          text="De momento não temos profissionais disponíveis para este serviço. Para mais informações, fale com o nosso apoio ao cliente."
          action={<Btn variant="outline" to="/conta/pedir">Fazer outro pedido</Btn>} />
      );
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
      <p className="mt-1.5 max-w-md text-base leading-relaxed text-ink-500">
        Enviámos o seu pedido aos profissionais verificados de {category}. Avisamos assim que alguém aceitar.
      </p>
      <div className="mt-6">{cancel}</div>
    </div>
  );
}

function QuoteReview({ b, busy, onRespond }: { b: Broadcast; busy: boolean; onRespond: (accept: boolean) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const work = b.quote_minor ?? 0;
  const fee = Math.round(work * FEE_RATE);
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-ink-900">Orçamento recebido</h2>
      <p className="mt-1.5 text-base text-ink-500">{b.provider?.name || 'O profissional'} enviou o valor do serviço. Reveja e decida.</p>

      <div className="mt-6 rounded-2xl border border-line bg-cloud-50 p-5 sm:p-6">
        <p className="text-sm font-medium text-ink-500">Valor do serviço</p>
        <p className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink-900">{formatKz(work)}</p>
        {b.quote_note && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{b.quote_note}</p>}
        <dl className="mt-5 divide-y divide-line border-t border-line">
          <DetailRow label="Serviço">{formatKz(work)}</DetailRow>
          <DetailRow label="Taxa de serviço (10%)">{formatKz(fee)}</DetailRow>
          <div className="flex items-center justify-between gap-4 pt-3">
            <dt className="text-base font-semibold text-ink-900">Total a pagar</dt>
            <dd className="text-lg font-semibold text-ink-900">{formatKz(work + fee)}</dd>
          </div>
        </dl>
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
      <p className="mt-4 text-sm text-ink-400">Depois de aceitar, paga com segurança: o valor fica retido até confirmar que o serviço foi feito.</p>
    </div>
  );
}

function ProviderPanel({ b, stage, busy, actions }: { b: Broadcast; stage: Stage; busy: boolean; actions: Actions }) {
  const [editing, setEditing] = useState(false);
  const client = b.client?.name || 'O cliente';
  switch (stage) {
    case 'quote_pending':
    case 'quote_rejected':
      return (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Enviar orçamento</h2>
          <p className="mt-1.5 text-base text-ink-500">Indique o valor do serviço. {client} vai rever e aceitar antes de pagar.</p>
          {b.quote_status === 'onsite' && (
            <Notice tone="info" title="Orçamento no local" className="mt-5">Depois de avaliar o trabalho no local, envie aqui o valor.</Notice>
          )}
          {stage === 'quote_rejected' && (
            <Notice tone="warning" title="Orçamento recusado" className="mt-5">
              {client} recusou o orçamento de {formatKz(b.quote_minor ?? 0)}. Pode enviar um novo valor.
            </Notice>
          )}
          <QuoteForm busy={busy} onSubmit={actions.sendQuote} />
          {b.quote_status === 'pending' && (
            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[15px] font-semibold text-ink-900">Precisa de ver o trabalho primeiro?</p>
                <p className="text-sm text-ink-500">Marque orçamento no local e envie o valor depois da visita.</p>
              </div>
              <Btn variant="outline" onClick={actions.onsite} disabled={busy}><MapPinned size={18} /> Orçamento no local</Btn>
            </div>
          )}
        </div>
      );
    case 'quote_sent':
      return editing ? (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Alterar orçamento</h2>
          <QuoteForm busy={busy} initial={b.quote_minor ?? undefined} initialNote={b.quote_note ?? ''} onSubmit={(m, n) => { actions.sendQuote(m, n); setEditing(false); }} />
          <Btn variant="ghost" className="mt-3" onClick={() => setEditing(false)}>Cancelar</Btn>
        </div>
      ) : (
        <Status icon={Clock} title="Orçamento enviado"
          text={<>Enviou um orçamento de <strong className="text-ink-900">{formatKz(b.quote_minor ?? 0)}</strong>. A aguardar a resposta de {client}.</>}
          action={<Btn variant="outline" onClick={() => setEditing(true)}>Alterar valor</Btn>} />
      );
    case 'awaiting_payment':
      return <Status icon={Clock} title="Orçamento aceite" text={<>{client} aceitou {formatKz(b.price_minor ?? 0)}. A aguardar o pagamento.</>} />;
    case 'in_progress':
      return (
        <Status icon={ShieldCheck} tone="success" title="Pagamento confirmado"
          text="O valor está retido em segurança. Quando terminar o serviço, deslize para marcar como concluído.">
          <div className="mt-6 max-w-md"><SlideToConfirm label="Deslize quando terminar" confirmingLabel="A marcar…" tone="emerald" busy={busy} onConfirm={actions.providerDone} /></div>
        </Status>
      );
    case 'awaiting_confirmation':
      return <Status icon={CheckCircle2} tone="success" title="Concluído do seu lado" text={<>A aguardar que {client} confirme. Depois disso, o valor fica disponível na sua carteira.</>} />;
    case 'completed':
      return <Status icon={CheckCircle2} tone="success" title="Serviço concluído" text={<>{formatKz(b.price_minor ?? 0)} adicionados à sua carteira.</>} action={<Btn variant="outline" to="/conta/financas">Ver finanças</Btn>} />;
    case 'cancelled':
      return <Status icon={Ban} title="Pedido cancelado" text="O cliente cancelou este pedido." action={<Btn variant="outline" to="/conta">Voltar ao início</Btn>} />;
    default:
      return <Status icon={Ban} title="Pedido fechado" action={<Btn variant="outline" to="/conta">Voltar ao início</Btn>} />;
  }
}

function QuoteForm({ busy, onSubmit, initial, initialNote = '' }: { busy: boolean; onSubmit: (minor: number, note: string) => void; initial?: number; initialNote?: string }) {
  const [value, setValue] = useState(initial ? String(Math.round(initial / 100)) : '');
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const kz = Number(value.replace(/\D/g, '')) || 0;
  const display = kz ? kz.toLocaleString('pt-PT').replace(/,/g, '.') : '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (kz < 100) { setError('Indique um valor de pelo menos 100 Kz.'); return; }
    onSubmit(kz * 100, note.trim());
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="quote" className="text-[15px] font-medium text-ink-900">Valor do serviço</label>
        <div className={cx('flex h-14 items-center rounded-xl border bg-white px-4 focus-within:ring-4 focus-within:ring-brand-cyan/15', error ? 'border-red-400' : 'border-line focus-within:border-brand-cyan2')}>
          <input
            id="quote"
            inputMode="numeric"
            value={display}
            onChange={(e) => { setValue(e.target.value.replace(/\D/g, '').slice(0, 9)); setError(null); }}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent font-display text-2xl font-semibold text-ink-900 placeholder:text-ink-300 focus:outline-none"
          />
          <span className="text-lg font-semibold text-ink-400">Kz</span>
        </div>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : kz > 0 && (
          <p className="text-sm text-ink-500">Recebe {formatKz(kz * 100)}. O cliente paga {formatKz(Math.round(kz * 100 * (1 + FEE_RATE)))} (inclui 10% de taxa de serviço).</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-[15px] font-medium text-ink-900">O que inclui <span className="font-normal text-ink-400">(opcional)</span></label>
        <TextArea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: mão de obra e material, garantia de 3 meses." className="min-h-[96px]" />
      </div>
      <Btn type="submit" loading={busy} className="w-full sm:w-auto sm:min-w-[200px]">Enviar orçamento</Btn>
    </form>
  );
}

function PersonCard({ person, iAmClient, onChat, onCall }: { person: BroadcastPerson; iAmClient: boolean; onChat: () => void; onCall: () => void }) {
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
        <Btn onClick={onChat} size="md"><MessageSquare size={18} /> Conversar</Btn>
        <Btn onClick={onCall} size="md" variant="outline"><Phone size={18} /> Ligar</Btn>
      </div>
      {iAmClient && (
        <Btn variant="ghost" size="md" className="mt-2 w-full" to={`/conta/prestador/${person.id}`}>Ver perfil e portfólio</Btn>
      )}
    </Card>
  );
}

function DetailsCard({ b }: { b: Broadcast }) {
  const place = [b.address, b.city].filter(Boolean).join(', ');
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-ink-900">Detalhes</h2>
      <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{b.description}</p>
      <dl className="mt-4 divide-y divide-line border-t border-line">
        <DetailRow label="Categoria">{b.category}</DetailRow>
        {b.service_date && <DetailRow label="Data">{formatDate(b.service_date)}{b.service_time ? `, ${b.service_time}` : ''}</DetailRow>}
        {place && <DetailRow label="Local">{place}</DetailRow>}
        {b.quote_status === 'accepted' && !!b.price_minor && <DetailRow label="Valor acordado">{formatKz(b.price_minor)}</DetailRow>}
      </dl>
    </Card>
  );
}
