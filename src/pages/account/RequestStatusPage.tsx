import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Ban, CheckCircle2, Clock, Loader2, MessageSquare, Phone, UserX, XCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { CallModal } from '../../components/CallModal';
import { CelebrationModal } from '../../components/CelebrationModal';
import { RatingModal } from '../../components/RatingModal';
import { SlideToConfirm } from '../../components/SlideToConfirm';
import { PaymentPanel } from './PaymentPanel';
import { useAuth } from '../../auth/AuthContext';
import { navigate } from '../../router';
import {
  type Broadcast, type BroadcastPerson,
  getBroadcast, cancelBroadcast, completeBroadcast, providerMarkDone,
  subscribeBroadcasts,
} from '../../lib/broadcasts';
import { notifyIncomingCall } from '../../lib/call';

export function RequestStatusPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [b, setB] = useState<Broadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const row = await getBroadcast(id);
      setB(row);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void refetch(); }, [refetch]);

  // Tempo real: qualquer mudança nesta linha (aceite, cancelado…) → recarrega.
  useEffect(() => subscribeBroadcasts({ id }, () => { void refetch(); }), [id, refetch]);

  // Enquanto está aberto, conta o tempo decorrido (não expira automaticamente — o apoio trata dos sem resposta).
  useEffect(() => {
    if (!b || b.status !== 'open') return;
    const start = new Date(b.created_at).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [b]);

  if (loading) {
    return <Centered><Loader2 className="size-7 animate-spin text-ink-300" /></Centered>;
  }
  if (!b) {
    return (
      <Centered>
        <div className="text-center">
          <UserX className="mx-auto mb-3 size-10 text-ink-300" />
          <p className="font-display text-lg font-bold text-ink-900">Pedido não encontrado</p>
          <p className="mt-1 text-sm text-ink-500">Pode já não estar disponível.</p>
          <Button to="/conta" variant="dark" size="md" className="mt-5">Voltar ao painel</Button>
        </div>
      </Centered>
    );
  }

  const iAmClient = user?.id === b.client_id;
  const other = iAmClient ? b.provider : b.client;

  const doCancel = async () => {
    if (busy) return;
    setBusy(true);
    try { await cancelBroadcast(b.id); await refetch(); success('Pedido cancelado'); }
    catch (e) { toastError('Não foi possível cancelar', e instanceof Error ? e.message : undefined); }
    finally { setBusy(false); }
  };
  const doComplete = async () => {
    if (busy) return;
    setBusy(true);
    try { await completeBroadcast(b.id); await refetch(); setRateOpen(true); }
    catch (e) { toastError('Não foi possível concluir', e instanceof Error ? e.message : undefined); }
    finally { setBusy(false); }
  };
  const doProviderDone = async () => {
    if (busy) return;
    setBusy(true);
    try { await providerMarkDone(b.id); await refetch(); setCelebrate(true); }
    catch (e) { toastError('Não foi possível concluir', e instanceof Error ? e.message : undefined); }
    finally { setBusy(false); }
  };

  return (
    <section className="bg-cloud-50 pb-28 pt-28 lg:pt-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <button onClick={() => navigate('/conta')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-ink-900">
          <ArrowLeft size={16} /> Painel
        </button>

        <div className="overflow-hidden rounded-3xl border border-cloud-200 bg-white shadow-soft">
          {/* Cabeçalho com a categoria */}
          <div className="border-b border-cloud-100 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Pedido de serviço</p>
            <h1 className="mt-0.5 font-display text-xl font-extrabold text-ink-900">{b.category}</h1>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">{b.description}</p>
            <Meta b={b} />
          </div>

          <div className="px-6 py-7">
            {b.status === 'open' && (iAmClient
              ? <Searching elapsed={elapsed} onCancel={doCancel} busy={busy} />
              : <OpenForProvider />)}

            {b.status === 'accepted' && other && (
              <Accepted
                person={other}
                iAmClient={iAmClient}
                paid={b.payment_status !== 'unpaid'}
                providerDone={!!b.provider_done_at}
                requestId={b.id}
                priceMinor={b.price_minor ?? 200000}
                onCancel={doCancel}
                onComplete={doComplete}
                onProviderDone={doProviderDone}
                onPaid={() => { void refetch(); }}
                busy={busy}
                onChat={() => navigate(`/conta/chat/${b.id}`)}
                onCall={() => setCallOpen(true)}
              />
            )}

            {b.status === 'expired' && <Ended
              icon={UserX} tone="amber" title="Sem profissional disponível"
              text="Nenhum profissional da área aceitou o pedido a tempo. Pode tentar novamente."
              primary={{ label: 'Tentar novamente', to: '/conta/pedir' }} />}

            {b.status === 'cancelled' && <Ended
              icon={Ban} tone="ink" title="Pedido cancelado"
              text={iAmClient ? 'Cancelou este pedido.' : 'O cliente cancelou este pedido.'}
              primary={iAmClient ? { label: 'Novo pedido', to: '/conta/pedir' } : { label: 'Voltar ao painel', to: '/conta' }} />}

            {b.status === 'completed' && <Ended
              icon={CheckCircle2} tone="emerald" title="Serviço concluído"
              text="Este serviço foi marcado como concluído."
              primary={{ label: 'Voltar ao painel', to: '/conta' }} />}

            {b.status === 'no_providers' && (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl">
                  <span className="absolute inset-0 animate-ping rounded-full bg-amber-200/40" style={{ animationDuration: '2s' }} />
                  <span className="relative" style={{ animation: 'msg-in 0.5s ease' }}>🙏</span>
                </div>
                <h2 className="font-display text-lg font-bold text-ink-900">Sem prestadores disponíveis</h2>
                <p className="mt-1 max-w-xs text-sm text-ink-500">
                  De momento não temos prestadores disponíveis para este serviço. Para qualquer informação, fale com o nosso apoio ao cliente.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button to="/conta/pedir" variant="dark" size="md">Tentar outro pedido</Button>
                  <Button to="/conta" variant="outline-dark" size="md">Voltar ao painel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CallModal
        open={callOpen}
        onClose={() => setCallOpen(false)}
        person={other}
        onInternetCall={() => {
          setCallOpen(false);
          if (other?.id && user) void notifyIncomingCall(other.id, { broadcastId: b.id, fromId: user.id, fromName: user.name, fromAvatar: user.avatarUrl });
          navigate(`/conta/chamada/${b.id}`);
        }}
      />

      <CelebrationModal
        open={celebrate}
        onClose={() => setCelebrate(false)}
        onWallet={() => { setCelebrate(false); navigate('/conta/financas'); }}
      />

      <RatingModal
        open={rateOpen}
        broadcastId={b.id}
        providerName={other?.name || 'o prestador'}
        onClose={() => setRateOpen(false)}
      />
    </section>
  );
}

/* ───────────────── Estados ───────────────── */

const SEARCH_STEPS = [
  { s: 0,  t: 'Pedido enviado aos prestadores', e: '📨' },
  { s: 5,  t: 'A procurar prestadores perto de si', e: '🔍' },
  { s: 12, t: 'Estamos a tratar disso, aguenta aí 💪', e: '🛠️' },
  { s: 22, t: 'Quase lá — a contactar mais prestadores', e: '⏳' },
  { s: 35, t: 'Continuamos à procura do melhor para si', e: '✨' },
  { s: 55, t: 'A alargar a procura para te atender', e: '📡' },
];

function Searching({ elapsed, onCancel, busy }: { elapsed: number; onCancel: () => void; busy: boolean }) {
  const step = [...SEARCH_STEPS].reverse().find((x) => elapsed >= x.s) ?? SEARCH_STEPS[0];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <div className="flex flex-col items-center text-center">
      {/* Orbe animado */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-cyan/20" style={{ animationDuration: '1.8s' }} />
        <span className="absolute inset-2 animate-ping rounded-full bg-brand-cyan/15" style={{ animationDuration: '2.4s' }} />
        <span className="absolute inset-0 rounded-full border-2 border-brand-cyan/30 border-t-brand-cyan" style={{ animation: 'spin 1.1s linear infinite' }} />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-dark text-3xl shadow-cardDark">
          <span key={step.e} style={{ animation: 'msg-in 0.4s ease' }}>{step.e}</span>
        </div>
      </div>

      {/* Mensagem a rodar */}
      <h2 className="mt-6 min-h-[2.6rem] max-w-xs font-display text-lg font-bold leading-snug text-ink-900">
        <span key={step.t} style={{ animation: 'msg-in 0.45s ease' }} className="inline-block">{step.t}</span>
      </h2>

      {/* Barras de progresso "a trabalhar" */}
      <div className="mt-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-8 overflow-hidden rounded-full bg-cloud-200">
            <span className="block h-full w-full rounded-full bg-brand-cyan" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          </span>
        ))}
      </div>

      <p className="mt-4 text-sm font-medium tabular-nums text-ink-400">À espera há {mm}:{ss}</p>

      <button onClick={onCancel} disabled={busy}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-cloud-200 px-4 py-2 text-sm font-semibold text-ink-600 transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Cancelar pedido
      </button>
    </div>
  );
}

function OpenForProvider() {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <Clock className="mb-2 size-8 text-ink-300" />
      <p className="font-display text-base font-bold text-ink-900">Este pedido ainda está aberto</p>
      <p className="mt-1 text-sm text-ink-500">Volte ao painel para o aceitar antes de outro profissional.</p>
      <Button to="/conta" variant="dark" size="md" className="mt-5">Ver pedidos disponíveis</Button>
    </div>
  );
}

function Accepted({ person, iAmClient, paid, providerDone, requestId, priceMinor, onCancel, onComplete, onProviderDone, onPaid, onChat, onCall, busy }: {
  person: BroadcastPerson; iAmClient: boolean; paid: boolean; providerDone: boolean; requestId: string; priceMinor: number; busy: boolean;
  onCancel: () => void; onComplete: () => void; onProviderDone: () => void; onPaid: () => void; onChat: () => void; onCall: () => void;
}) {
  const [continued, setContinued] = useState(false);
  return (
    <div>
      <div className="mb-5 flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
        <CheckCircle2 size={16} /> {iAmClient ? 'Profissional encontrado!' : 'Aceitou este pedido'}
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-cloud-200 bg-cloud-50 p-4">
        <Avatar person={person} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-ink-900">{person.name || '—'}</p>
          <p className="text-sm text-ink-500">
            {iAmClient ? (person.specialty || person.work_area || 'Profissional') : 'Cliente'}
          </p>
          {person.phone && <p className="mt-0.5 text-sm font-medium text-ink-700">{person.phone}</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button onClick={onChat} variant="dark" size="md"><MessageSquare size={17} /> Conversar</Button>
        <Button onClick={onCall} variant="outline-dark" size="md"><Phone size={17} /> Ligar</Button>
      </div>

      {iAmClient ? (
        !paid ? (
          !continued ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button onClick={onCancel} variant="outline-dark" size="md">Cancelar</Button>
              <Button onClick={() => setContinued(true)} size="md">Continuar <ArrowRight size={16} /></Button>
            </div>
          ) : (
            <>
              <PaymentPanel requestId={requestId} priceMinor={priceMinor} onPaid={onPaid} />
              <CancelLink onCancel={onCancel} busy={busy} />
            </>
          )
        ) : providerDone ? (
          <div className="mt-5">
            <p className="mb-2 text-center text-sm text-ink-500">O prestador marcou o serviço como concluído. Confirme para libertar o pagamento.</p>
            <SlideToConfirm label="Confirmar conclusão" confirmingLabel="A confirmar…" tone="emerald" busy={busy} onConfirm={onComplete} />
            <CancelLink onCancel={onCancel} busy={busy} />
          </div>
        ) : (
          <>
            <p className="mt-5 flex items-center justify-center gap-1.5 rounded-2xl bg-cloud-50 px-4 py-3 text-center text-sm text-ink-500">
              <Clock size={15} className="text-ink-400" /> Pago. A aguardar que o prestador conclua o serviço.
            </p>
            <CancelLink onCancel={onCancel} busy={busy} />
          </>
        )
      ) : (
        !paid ? (
          <p className="mt-5 flex items-center justify-center gap-1.5 rounded-2xl bg-cloud-50 px-4 py-3 text-center text-sm text-ink-500">
            <Clock size={15} className="text-ink-400" /> A aguardar o pagamento do cliente.
          </p>
        ) : providerDone ? (
          <p className="mt-5 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
            <CheckCircle2 size={15} /> Concluído do seu lado. A aguardar a confirmação do cliente.
          </p>
        ) : (
          <div className="mt-5">
            <SlideToConfirm label="Serviço concluído" confirmingLabel="A marcar…" tone="emerald" busy={busy} onConfirm={onProviderDone} />
          </div>
        )
      )}
    </div>
  );
}

function CancelLink({ onCancel, busy }: { onCancel: () => void; busy: boolean }) {
  return (
    <div className="mt-3 text-center">
      <button onClick={onCancel} disabled={busy} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 hover:text-red-600 disabled:opacity-50">
        <XCircle size={14} /> Cancelar pedido
      </button>
    </div>
  );
}

function Ended({ icon: Icon, tone, title, text, primary }: {
  icon: typeof UserX; tone: 'amber' | 'emerald' | 'ink'; title: string; text: string;
  primary: { label: string; to: string };
}) {
  const ring = tone === 'amber' ? 'bg-amber-50 text-amber-500'
    : tone === 'emerald' ? 'bg-emerald-50 text-emerald-500' : 'bg-cloud-100 text-ink-400';
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${ring}`}><Icon size={30} /></div>
      <h2 className="mt-4 font-display text-lg font-bold text-ink-900">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-500">{text}</p>
      <Button to={primary.to} variant="dark" size="md" className="mt-6">{primary.label}</Button>
    </div>
  );
}

/* ───────────────── Blocos ───────────────── */

function Meta({ b }: { b: Broadcast }) {
  const bits = [b.city, b.service_date, b.service_time].filter(Boolean);
  if (bits.length === 0) return null;
  return <p className="mt-2 text-xs font-medium text-ink-400">{bits.join(' · ')}</p>;
}

function Avatar({ person }: { person: BroadcastPerson }) {
  const initials = (person.name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dark text-lg font-bold text-white">
      {person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-cloud-50 pb-28 pt-28 lg:pt-32">
      <div className="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center px-5">{children}</div>
    </section>
  );
}
