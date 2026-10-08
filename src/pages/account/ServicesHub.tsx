import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ClipboardList, Search } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { navigate } from '../../router';
import { type Broadcast, type BroadcastStatus, myBroadcasts, subscribeBroadcasts } from '../../lib/broadcasts';

const LABEL: Record<BroadcastStatus, string> = {
  open: 'À procura', accepted: 'Em curso', expired: 'Sem resposta', cancelled: 'Cancelado', completed: 'Concluído',
};
const STYLE: Record<BroadcastStatus, string> = {
  open: 'bg-brand-cyan/15 text-brand-dark', accepted: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-amber-50 text-amber-700', cancelled: 'bg-cloud-100 text-ink-500', completed: 'bg-emerald-50 text-emerald-700',
};

export function ServicesHub() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Broadcast[] | null>(null);

  const load = useCallback(async () => {
    try { setRows(await myBroadcasts()); } catch { setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeBroadcasts({}, () => { void load(); }), [load]);

  if (!user) return null;
  const isPro = user.role === 'professional';
  const active = (rows ?? []).filter((r) => r.status === 'open' || r.status === 'accepted');
  const history = (rows ?? []).filter((r) => r.status !== 'open' && r.status !== 'accepted');

  return (
    <section className="bg-cloud-50 pb-28 pt-28 lg:pt-32">
      <div className="mx-auto max-w-2xl px-5 lg:px-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Serviços</h1>
        <p className="mt-1 text-ink-500">{isPro ? 'Os seus serviços em curso e já prestados.' : 'Os seus pedidos em curso e o histórico.'}</p>

        {!isPro && (
          <Button to="/conta/pedir" size="md" className="mt-5">Solicitar serviço <ArrowRight size={16} /></Button>
        )}

        <Group title="Em curso" empty="Nada em curso.">
          {active.map((r) => <Row key={r.id} r={r} isPro={isPro} />)}
        </Group>

        <Group title={isPro ? 'Prestados' : 'Histórico'} empty="Ainda sem histórico.">
          {history.map((r) => <Row key={r.id} r={r} isPro={isPro} />)}
        </Group>
      </div>
    </section>
  );
}

function Group({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="mt-7">
      <h2 className="mb-3 font-display text-base font-bold text-ink-900">{title}</h2>
      {children.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cloud-200 bg-white/60 px-5 py-6 text-sm text-ink-500">{empty}</p>
      ) : (
        <div className="grid gap-3">{children}</div>
      )}
    </div>
  );
}

function Row({ r, isPro }: { r: Broadcast; isPro: boolean }) {
  const who = isPro ? r.client?.name : r.provider?.name;
  return (
    <button onClick={() => navigate(`/conta/pedido/${r.id}`)}
      className="flex items-center gap-4 rounded-2xl border border-cloud-200 bg-white p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40 hover:shadow-cardHover">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-dark">
        {r.status === 'open' ? <Search size={19} /> : <ClipboardList size={19} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-ink-900">{r.category}</p>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLE[r.status]}`}>{LABEL[r.status]}</span>
        </div>
        <p className="truncate text-sm text-ink-500">{who ? `${who} · ` : ''}{r.description}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 text-ink-300" />
    </button>
  );
}
