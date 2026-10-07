import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Ban, CheckCircle2, Clock, Loader2, MessageSquare, Phone, Search, UserX, XCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { CallModal } from '../../components/CallModal';
import { useAuth } from '../../auth/AuthContext';
import { navigate } from '../../router';
import {
  type Broadcast, type BroadcastPerson,
  getBroadcast, expireBroadcast, cancelBroadcast, completeBroadcast,
  secondsLeft, subscribeBroadcasts,
} from '../../lib/broadcasts';

export function RequestStatusPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [b, setB] = useState<Broadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [left, setLeft] = useState(60);
  const [busy, setBusy] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const expiring = useRef(false);

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

  // Contador de 1s enquanto está aberto; ao chegar a 0, o cliente finaliza o timeout.
  useEffect(() => {
    if (!b || b.status !== 'open') return;
    const tick = () => {
      const s = secondsLeft(b);
      setLeft(s);
      if (s <= 0 && !expiring.current && user?.id === b.client_id) {
        expiring.current = true;
        void expireBroadcast(b.id).then(() => refetch());
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [b, user?.id, refetch]);

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
    try { await completeBroadcast(b.id); await refetch(); success('Serviço concluído!'); }
    catch (e) { toastError('Não foi possível concluir', e instanceof Error ? e.message : undefined); }
    finally { setBusy(false); }
  };

  return (
    <section className="bg-cloud-50 pb-20 pt-28 lg:pt-32">
      <div className="mx-auto max-w-xl px-5 lg:px-8">
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
              ? <Searching left={left} onCancel={doCancel} busy={busy} />
              : <OpenForProvider />)}

            {b.status === 'accepted' && other && (
              <Accepted
                person={other}
                iAmClient={iAmClient}
                onCancel={doCancel}
                onComplete={doComplete}
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
          </div>
        </div>
      </div>

      <CallModal
        open={callOpen}
        onClose={() => setCallOpen(false)}
        person={other}
        onInternetCall={() => { setCallOpen(false); navigate(`/conta/chamada/${b.id}`); }}
      />
    </section>
  );
}

/* ───────────────── Estados ───────────────── */

function Searching({ left, onCancel, busy }: { left: number; onCancel: () => void; busy: boolean }) {
  const pct = Math.max(0, Math.min(1, left / 60));
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-cyan/20" />
        <span className="absolute inset-3 rounded-full bg-brand-cyan/10" />
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#e8eef1" strokeWidth="6" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#02E6FF" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 46} strokeDashoffset={2 * Math.PI * 46 * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="relative flex flex-col items-center">
          <Search className="mb-0.5 size-5 text-brand-dark" />
          <span className="font-display text-2xl font-extrabold tabular-nums text-ink-900">{left}s</span>
        </div>
      </div>
      <h2 className="mt-5 font-display text-lg font-bold text-ink-900">À procura de um profissional…</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-500">
        A avisar os profissionais da área. O primeiro a aceitar aparece aqui.
      </p>
      <button onClick={onCancel} disabled={busy}
        className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-cloud-200 px-4 py-2 text-sm font-semibold text-ink-600 transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50">
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

function Accepted({ person, iAmClient, onCancel, onComplete, onChat, onCall, busy }: {
  person: BroadcastPerson; iAmClient: boolean; busy: boolean;
  onCancel: () => void; onComplete: () => void; onChat: () => void; onCall: () => void;
}) {
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

      <div className="mt-3 flex items-center justify-center gap-4">
        {iAmClient ? (
          <button onClick={onCancel} disabled={busy} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-red-600 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Cancelar
          </button>
        ) : (
          <button onClick={onComplete} disabled={busy} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Marcar concluído
          </button>
        )}
      </div>
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
    <section className="bg-cloud-50 pb-20 pt-28 lg:pt-32">
      <div className="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center px-5">{children}</div>
    </section>
  );
}
