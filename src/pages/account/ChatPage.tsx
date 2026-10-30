import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Phone, Send } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { CallModal } from '../../components/CallModal';
import { navigate } from '../../router';
import { type Broadcast, type BroadcastPerson, getBroadcast } from '../../lib/broadcasts';
import { type Message, listMessages, sendMessage, markRead, subscribeMessages } from '../../lib/chat';
import { notifyIncomingCall } from '../../lib/call';
import { Avatar } from '../../components/app/ui';
import { useInbox } from '../../components/app/Inbox';

export function ChatPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const { refresh: refreshInbox } = useInbox();
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
        void markRead(id).then(refreshInbox);
      } finally {
        if (active) { setLoading(false); scrollToEnd(); }
      }
    })();
    return () => { active = false; };
  }, [id, scrollToEnd, refreshInbox]);

  useEffect(() => subscribeMessages(id, (m) => {
    setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    if (m.sender_id !== user?.id) void markRead(id).then(refreshInbox);
    scrollToEnd();
  }), [id, user?.id, scrollToEnd, refreshInbox]);

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
      toastError('Mensagem não enviada', e instanceof Error ? e.message : undefined);
    } finally {
      setSending(false);
    }
  };

  const iAmClient = user?.id === broadcast?.client_id;
  const other: BroadcastPerson | null | undefined = iAmClient ? broadcast?.provider : broadcast?.client;

  return (
    <section className="flex h-[100dvh] flex-col bg-white md:bg-cloud-100/60 md:p-6">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white md:rounded-2xl md:border md:border-line">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
          <button onClick={() => navigate(`/conta/pedido/${id}`)} aria-label="Voltar" className="rounded-lg p-2 text-ink-500 hover:bg-cloud-100"><ArrowLeft size={20} /></button>
          <Avatar name={other?.name} src={other?.avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-ink-900">{other?.name || '—'}</p>
            <p className="truncate text-sm text-ink-500">{broadcast?.category}</p>
          </div>
          <button onClick={() => setCallOpen(true)} aria-label="Ligar" className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-brand-dark transition-colors hover:bg-cloud-100">
            <Phone size={19} />
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto bg-cloud-50 px-4 py-5">
          {loading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="size-6 animate-spin text-ink-300" /></div>
          ) : msgs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-base font-semibold text-ink-900">Ainda não há mensagens</p>
              <p className="mt-1 text-[15px] text-ink-500">Diga olá e combine os detalhes do serviço.</p>
            </div>
          ) : (
            msgs.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${mine ? 'rounded-br-md bg-brand-dark text-white' : 'rounded-bl-md border border-line bg-white text-ink-800'}`}>
                    <span className="whitespace-pre-wrap break-words">{m.body}</span>
                    <span className={`mt-1 block text-right text-xs ${mine ? 'text-white/50' : 'text-ink-400'}`}>{time(m.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <div className="shrink-0 border-t border-line bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva uma mensagem…"
              className="h-12 flex-1 rounded-xl border border-line bg-white px-4 text-base text-ink-900 placeholder:text-ink-400/70 focus:border-brand-cyan2 focus:outline-none focus:ring-4 focus:ring-brand-cyan/15"
            />
            <button type="submit" disabled={!text.trim() || sending} aria-label="Enviar"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-dark text-white transition-colors hover:bg-brand-dark2 disabled:opacity-40">
              {sending ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
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
