import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Bell, CheckCircle2, ClipboardList, Clock, Loader2, MapPin,
  MessageSquare, Search, Star, Wallet, Wrench,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useNavigate } from '../../router';
import { SlideToConfirm } from '../../components/SlideToConfirm';
import {
  type Broadcast, type BroadcastStatus,
  acceptBroadcast, completeBroadcast, listOpenBroadcasts, myBroadcasts, providerMarkDone, secondsLeft, subscribeBroadcasts,
} from '../../lib/broadcasts';

const STATUS_LABEL: Record<BroadcastStatus, string> = {
  open: 'À procura', accepted: 'Aceite', expired: 'Sem resposta', cancelled: 'Cancelado', completed: 'Concluído',
};
const STATUS_STYLE: Record<BroadcastStatus, string> = {
  open: 'bg-brand-cyan/15 text-brand-dark', accepted: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-amber-50 text-amber-700', cancelled: 'bg-cloud-100 text-ink-500', completed: 'bg-emerald-50 text-emerald-700',
};

export function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const firstName = user.name.split(/\s+/)[0] || user.name;
  const isPro = user.role === 'professional';

  return (
    <section className="bg-cloud-50 pb-20 pt-28 lg:pt-32">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={user.avatarUrl} />
            <div>
              <p className="text-sm font-medium text-ink-400">{isPro ? 'Painel do profissional' : 'A sua conta'}</p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Olá, {firstName} 👋</h1>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cloud-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-600">
            <span className={`h-1.5 w-1.5 rounded-full ${isPro ? 'bg-brand-cyan2' : 'bg-emerald-500'}`} />
            {isPro ? `Profissional${user.workArea ? ` · ${user.workArea}` : ''}` : 'Cliente'}
          </span>
        </div>

        {isPro && user.approvalStatus === 'pending' && (
          <Banner tone="warning" title="Conta em verificação"
            text="A nossa equipa está a validar o seu perfil. Assim que for aprovado, começa a receber pedidos." />
        )}
        {isPro && user.approvalStatus === 'rejected' && (
          <Banner tone="danger" title="Perfil não aprovado"
            text="A sua candidatura não foi aprovada. Fale connosco pelo WhatsApp para rever a situação." />
        )}

        {isPro ? <ProviderHome approved={user.approvalStatus === 'approved'} /> : <ClientHome navigate={navigate} />}

        <div className="mt-8 rounded-3xl border border-cloud-200 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold text-ink-900">O meu perfil</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Row label="Nome" value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="Telefone" value={user.phone || '—'} />
            <Row label="Tipo de conta" value={isPro ? 'Profissional' : 'Cliente'} />
            {isPro && <Row label="Área de trabalho" value={user.workArea || '—'} />}
            {isPro && <Row label="Especialidade" value={user.specialty || '—'} />}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ───────────────── Cliente ───────────────── */

function ClientHome({ navigate }: { navigate: (p: string) => void }) {
  return (
    <>
      <div className="mt-8 overflow-hidden rounded-3xl bg-brand-dark p-7 text-white shadow-cardDark sm:p-9">
        <div className="relative z-10 max-w-lg">
          <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">Precisa de um profissional?</h2>
          <p className="mt-2 text-white/70">Diga-nos o que precisa e ligamos ao profissional certo, perto de si.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to="/conta/pedir" size="lg">Solicitar serviço <ArrowRight size={18} /></Button>
            <Button to="/services" variant="outline-light" size="lg">Ver serviços</Button>
          </div>
        </div>
      </div>

      <MyRequests />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Tile icon={MessageSquare} title="Mensagens" desc="Converse com os profissionais." soon />
        <Tile icon={Search} title="Explorar serviços" desc="Veja todas as categorias disponíveis." onClick={() => navigate('/services')} />
        <Tile icon={ClipboardList} title="Como funciona" desc="Peça, aceitam em 1 minuto, combinam." soon />
      </div>
    </>
  );
}

/** Pedidos ativos/recentes do cliente. */
function MyRequests() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [rows, setRows] = useState<Broadcast[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRows(await myBroadcasts()); } catch { setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeBroadcasts({}, () => { void load(); }), [load]);

  const confirm = async (id: string) => {
    setBusy(id);
    try { await completeBroadcast(id); success('Serviço concluído!', 'O valor foi enviado ao prestador.'); await load(); }
    catch (e) { toastError('Não foi possível confirmar', e instanceof Error ? e.message : undefined); }
    finally { setBusy(null); }
  };

  if (!rows || rows.length === 0) return null;
  const active = rows.filter((r) => r.status === 'open' || r.status === 'accepted');
  const past = rows.filter((r) => r.status !== 'open' && r.status !== 'accepted').slice(0, 3);

  return (
    <div className="mt-6">
      <h3 className="mb-3 font-display text-base font-bold text-ink-900">Os meus pedidos</h3>
      <div className="grid gap-3">
        {active.map((r) => {
          const needsConfirm = r.status === 'accepted' && !!r.provider_done_at && r.payment_status !== 'unpaid';
          return (
          <div key={r.id} className={`rounded-2xl border bg-white shadow-soft ${needsConfirm ? 'border-emerald-200' : 'border-cloud-200'}`}>
            <button onClick={() => navigate(`/conta/pedido/${r.id}`)}
              className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-cloud-50/60">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-dark">
                {r.status === 'open' ? <Search size={19} /> : <CheckCircle2 size={19} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-ink-900">{r.category}</p>
                  <StatusChip status={r.status} />
                </div>
                <p className="truncate text-sm text-ink-500">{r.description}</p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-ink-300" />
            </button>
            {needsConfirm && (
              <div className="border-t border-cloud-100 p-4">
                <p className="mb-2 text-sm font-medium text-ink-600">O prestador concluiu o serviço. Confirme para libertar o pagamento.</p>
                <SlideToConfirm label="Confirmar conclusão" confirmingLabel="A confirmar…" tone="emerald" busy={busy === r.id} onConfirm={() => confirm(r.id)} />
              </div>
            )}
          </div>
          );
        })}
        {past.map((r) => (
          <button key={r.id} onClick={() => navigate(`/conta/pedido/${r.id}`)}
            className="flex items-center gap-4 rounded-2xl border border-cloud-100 bg-white/60 p-4 text-left transition-colors hover:bg-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cloud-100 text-ink-400"><ClipboardList size={16} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><p className="truncate font-medium text-ink-700">{r.category}</p><StatusChip status={r.status} /></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Prestador ───────────────── */

function ProviderHome({ approved }: { approved: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, info, error: toastError } = useToast();
  const [jobs, setJobs] = useState<Broadcast[] | null>(null);
  const [mine, setMine] = useState<Broadcast[]>([]);
  const [now, setNow] = useState(Date.now());
  const [accepting, setAccepting] = useState<string | null>(null);
  const [doneBusy, setDoneBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!approved) { setJobs([]); return; }
    try {
      const [open, own] = await Promise.all([listOpenBroadcasts(), myBroadcasts()]);
      setJobs(open);
      setMine(own.filter((r) => r.status === 'accepted'));
    } catch { setJobs([]); }
  }, [approved]);

  useEffect(() => { void load(); }, [load]);
  // Realtime para novos pedidos + refetch periódico (o RLS não empurra quando um pedido sai do estado aberto).
  useEffect(() => {
    if (!approved || !user?.workArea) return;
    const off = subscribeBroadcasts({ category: user.workArea }, () => { void load(); });
    const poll = setInterval(() => { void load(); }, 4000);
    return () => { off(); clearInterval(poll); };
  }, [approved, user?.workArea, load]);
  // Tick do contador.
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const visible = (jobs ?? []).filter((j) => new Date(j.expires_at).getTime() - now > 0);

  const accept = async (id: string) => {
    if (accepting) return;
    setAccepting(id);
    try {
      const row = await acceptBroadcast(id);
      if (row) { success('Pedido aceite!', 'Já pode falar com o cliente.'); navigate(`/conta/pedido/${id}`); }
      else { info('Pedido já indisponível', 'Outro profissional aceitou ou expirou.'); await load(); }
    } catch (e) {
      toastError('Não foi possível aceitar', e instanceof Error ? e.message : undefined);
    } finally { setAccepting(null); }
  };

  const markDone = async (id: string) => {
    setDoneBusy(id);
    try { await providerMarkDone(id); success('Marcado como concluído', 'A aguardar a confirmação do cliente.'); await load(); }
    catch (e) { toastError('Não foi possível concluir', e instanceof Error ? e.message : undefined); }
    finally { setDoneBusy(null); }
  };

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Bell} label="Pedidos disponíveis" value={approved ? String(visible.length) : '—'} hint={approved ? 'na sua área' : 'aguarda aprovação'} />
        <Stat icon={Clock} label="Em curso" value={approved ? String(mine.length) : '—'} hint="aceites por si" />
        <Stat icon={Star} label="Avaliação" value="—" hint="sem avaliações" />
        <Stat icon={Wallet} label="Saldo" value="—" hint="em breve" />
      </div>

      {/* Em curso */}
      {mine.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 font-display text-base font-bold text-ink-900">Em curso</h3>
          <div className="grid gap-3">
            {mine.map((r) => {
              const canFinish = r.payment_status !== 'unpaid' && !r.provider_done_at;
              return (
              <div key={r.id} className="rounded-2xl border border-cloud-200 bg-white shadow-soft">
                <button onClick={() => navigate(`/conta/pedido/${r.id}`)}
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-cloud-50/60">
                  <Avatar name={r.client?.name || '?'} src={r.client?.avatar_url ?? null} sm />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{r.category}</p>
                    <p className="truncate text-sm text-ink-500">{r.client?.name} · {r.description}</p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-ink-300" />
                </button>
                <div className="border-t border-cloud-100 p-4">
                  {r.provider_done_at ? (
                    <p className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 size={15} /> Concluído. A aguardar a confirmação do cliente.</p>
                  ) : canFinish ? (
                    <SlideToConfirm label="Serviço concluído" confirmingLabel="A marcar…" tone="emerald" busy={doneBusy === r.id} onConfirm={() => markDone(r.id)} />
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm text-ink-500"><Clock size={15} className="text-ink-400" /> A aguardar o pagamento do cliente.</p>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pedidos disponíveis */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-ink-900">Pedidos disponíveis</h3>
          {approved && <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> ao vivo</span>}
        </div>

        {!approved ? (
          <EmptyCard icon={Clock} text="Assim que o seu perfil for aprovado, os pedidos da sua área aparecem aqui." />
        ) : jobs === null ? (
          <EmptyCard icon={Loader2} text="A carregar pedidos…" spin />
        ) : visible.length === 0 ? (
          <EmptyCard icon={Bell} text="Sem pedidos no momento. Assim que um cliente pedir, aparece aqui em tempo real." />
        ) : (
          <div className="grid gap-3">
            {visible.map((j) => {
              const left = Math.max(0, Math.floor((new Date(j.expires_at).getTime() - now) / 1000));
              return (
                <div key={j.id} className="rounded-2xl border border-cloud-200 bg-white p-4 shadow-soft">
                  <div className="flex items-start gap-4">
                    <Avatar name={j.client?.name || '?'} src={j.client?.avatar_url ?? null} sm />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink-900">{j.client?.name || 'Cliente'}</p>
                        <span className="rounded-full bg-cloud-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500">{j.category}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-ink-600">{j.description}</p>
                      {(j.city || j.service_date) && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-ink-400">
                          <MapPin size={12} /> {[j.city, j.service_date, j.service_time].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className={`flex shrink-0 flex-col items-center rounded-xl px-2.5 py-1.5 ${left <= 15 ? 'bg-red-50 text-red-600' : 'bg-brand-cyan/10 text-brand-dark'}`}>
                      <span className="font-display text-lg font-extrabold tabular-nums leading-none">{left}</span>
                      <span className="text-[10px] font-semibold uppercase">seg</span>
                    </div>
                  </div>
                  <Button onClick={() => accept(j.id)} size="md" className="mt-3 w-full" disabled={accepting === j.id}>
                    {accepting === j.id ? <><Loader2 size={16} className="animate-spin" /> A aceitar…</> : <>Aceitar pedido <ArrowRight size={16} /></>}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Tile icon={MessageSquare} title="Mensagens" desc="Converse com os seus clientes." soon />
        <Tile icon={Wrench} title="O meu catálogo" desc="Mostre os seus trabalhos e preços." soon />
      </div>
    </>
  );
}

/* ───────────────── Blocos ───────────────── */

function StatusChip({ status }: { status: BroadcastStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

function EmptyCard({ icon: Icon, text, spin }: { icon: typeof Bell; text: string; spin?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-cloud-200 bg-white/60 px-5 py-6 text-sm text-ink-500">
      <Icon size={20} className={`shrink-0 text-ink-300 ${spin ? 'animate-spin' : ''}`} /> {text}
    </div>
  );
}

function Tile({ icon: Icon, title, desc, soon, onClick }: {
  icon: typeof ClipboardList; title: string; desc: string; soon?: boolean; onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-dark"><Icon size={20} /></div>
      <div className="mt-4 flex items-center gap-2">
        <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
        {soon && <span className="rounded-full bg-cloud-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Em breve</span>}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">{desc}</p>
    </>
  );
  const base = 'rounded-3xl border border-cloud-200 bg-white p-6 text-left shadow-soft transition-all duration-300';
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} hover:-translate-y-1 hover:border-brand-cyan/40 hover:shadow-cardHover`}>
        {inner}
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark">Abrir <ArrowRight size={14} /></span>
      </button>
    );
  }
  return <div className={`${base} ${soon ? 'opacity-80' : ''}`}>{inner}</div>;
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Bell; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-cloud-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <Icon size={16} className="text-ink-400" />
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{value}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400"><Clock size={11} /> {hint}</p>
    </div>
  );
}

function Banner({ tone, title, text }: { tone: 'warning' | 'danger'; title: string; text: string }) {
  const styles = tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800';
  return (
    <div className={`mt-6 rounded-2xl border px-5 py-4 ${styles}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-sm opacity-90">{text}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-cloud-100 py-2 last:border-0 sm:border-0">
      <dt className="text-sm text-ink-400">{label}</dt>
      <dd className="text-sm font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function Avatar({ name, src, sm }: { name: string; src: string | null; sm?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const size = sm ? 'h-11 w-11 text-sm' : 'h-14 w-14 text-lg';
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dark font-bold text-white`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
}
