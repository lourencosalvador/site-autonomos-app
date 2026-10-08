import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Phone, Send } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { CallModal } from '../../components/CallModal';
import { navigate } from '../../router';
import { type Broadcast, type BroadcastPerson, getBroadcast } from '../../lib/broadcasts';
import { type Message, listMessages, sendMessage, markRead, subscribeMessages } from '../../lib/chat';
import { notifyIncomingCall } from '../../lib/call';

export function ChatPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [b, list] = await Promise.all([getBroadcast(id), listMessages(id)]);
        if (!active) return;
        setBroadcast(b);
        setMsgs(list);
        void markRead(id);
      } finally {
        if (active) { setLoading(false); scrollToEnd(); }
      }
    })();
    return () => { active = false; };
  }, [id, scrollToEnd]);

  useEffect(() => subscribeMessages(id, (m) => {
    setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    if (m.sender_id !== user?.id) void markRead(id);
    scrollToEnd();
  }), [id, user?.id, scrollToEnd]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText('');
    setSending(true);
    try {
      const m = await sendMessage(id, body);
      setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      scrollToEnd();
    } catch (e) {
      setText(body);
      toastError('Não enviou', e instanceof Error ? e.message : undefined);
    } finally {
      setSending(false);
    }
  };

  const iAmClient = user?.id === broadcast?.client_id;
  const other: BroadcastPerson | null | undefined = iAmClient ? broadcast?.provider : broadcast?.client;

  return (
    <section className="bg-cloud-50 pt-[4.75rem]">
      <div className="mx-auto flex h-[calc(100dvh-4.75rem)] max-w-2xl flex-col px-0 sm:px-5">
        <div className="flex items-center gap-3 border-b border-cloud-200 bg-white px-4 py-3 sm:mt-3 sm:rounded-t-3xl">
          <button onClick={() => navigate(`/conta/pedido/${id}`)} className="rounded-full p-1.5 text-ink-500 hover:bg-cloud-100"><ArrowLeft size={20} /></button>
          <Avatar person={other} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold text-ink-900">{other?.name || '—'}</p>
            <p className="truncate text-xs text-ink-400">{broadcast?.category}</p>
          </div>
          <button onClick={() => setCallOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-cyan/12 text-brand-dark transition-colors hover:bg-brand-cyan/20">
            <Phone size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto bg-cloud-50 px-4 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="size-6 animate-spin text-ink-300" /></div>
          ) : msgs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-ink-400">
              <p>Ainda não há mensagens.</p>
              <p>Diga olá e combine os detalhes do serviço.</p>
            </div>
          ) : (
            msgs.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-soft ${mine ? 'rounded-br-md bg-brand-dark text-white' : 'rounded-bl-md bg-white text-ink-800'}`}>
                    {m.body}
                    <span className={`mt-0.5 block text-right text-[10px] ${mine ? 'text-white/50' : 'text-ink-300'}`}>{time(m.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-cloud-200 bg-white px-3 py-3 sm:mb-3 sm:rounded-b-3xl">
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva uma mensagem…"
              className="flex-1 rounded-full border border-cloud-200 bg-cloud-50 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
            />
            <button type="submit" disabled={!text.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white transition-all hover:bg-brand-dark2 disabled:opacity-40">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </div>

      <CallModal
        open={callOpen}
        onClose={() => setCallOpen(false)}
        person={other}
        onInternetCall={() => {
          setCallOpen(false);
          if (other?.id && user) void notifyIncomingCall(other.id, { broadcastId: id, fromId: user.id, fromName: user.name, fromAvatar: user.avatarUrl });
          navigate(`/conta/chamada/${id}`);
        }}
      />
    </section>
  );
}

function time(iso: string) {
  try { return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

function Avatar({ person }: { person: BroadcastPerson | null | undefined }) {
  const initials = (person?.name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dark text-sm font-bold text-white">
      {person?.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
}
