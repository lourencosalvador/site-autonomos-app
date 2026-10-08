import { useEffect, useState } from 'react';
import { ArrowDownLeft, Clock, Loader2, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { navigate } from '../../router';
import { type Wallet, providerWallet } from '../../lib/hub';
import { formatKz } from '../../lib/payments';

export function WalletPage() {
  const { user } = useAuth();
  const [w, setW] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    providerWallet().then((d) => { if (active) { setW(d); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (!user) return null;
  if (user.role !== 'professional') { navigate('/conta'); return null; }

  const last4 = (user.phone || '').replace(/\D/g, '').slice(-4) || '0000';

  return (
    <section className="bg-cloud-50 pb-28 pt-28 lg:pt-32">
      <div className="mx-auto max-w-2xl px-5 lg:px-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Finanças</h1>
        <p className="mt-1 text-ink-500">A sua carteira, saldo e movimentos.</p>

        <div className="relative mt-5 overflow-hidden rounded-3xl bg-brand-dark p-6 text-white shadow-cardDark">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-cyan/20 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-brand-cyan2/10 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-widest text-white/60">AUTONOMOUS</span>
              <WalletIcon size={22} className="text-brand-cyan2" />
            </div>
            <p className="mt-6 text-sm text-white/60">Saldo disponível</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">
              {loading ? <Loader2 className="inline size-6 animate-spin" /> : formatKz(w?.available_minor ?? 0)}
            </p>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="font-display text-lg font-bold tracking-widest">•••• •••• {last4}</p>
                <p className="mt-1 text-sm text-white/70">{user.name}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{user.workArea || 'Prestador'}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat icon={Clock} label="Retido (a receber)" value={loading ? '—' : formatKz(w?.pending_minor ?? 0)} hint="liberta ao concluir" />
          <Stat icon={ArrowDownLeft} label="Serviços concluídos" value={loading ? '—' : String(w?.jobs_done ?? 0)} hint="total" />
        </div>

        <div className="mt-6">
          <h2 className="mb-3 font-display text-base font-bold text-ink-900">Movimentos</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-ink-300" /></div>
          ) : (w?.movements.length ?? 0) === 0 ? (
            <p className="rounded-2xl border border-dashed border-cloud-200 bg-white/60 px-5 py-6 text-sm text-ink-500">Sem movimentos ainda.</p>
          ) : (
            <div className="grid gap-2">
              {w!.movements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-cloud-200 bg-white p-4 shadow-soft">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.kind === 'available' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {m.kind === 'available' ? <ArrowDownLeft size={18} /> : <Clock size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{m.category}</p>
                    <p className="truncate text-xs text-ink-400">{m.client_name || 'Cliente'} · {new Date(m.at).toLocaleDateString('pt-PT')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-display text-sm font-bold ${m.kind === 'available' ? 'text-emerald-600' : 'text-ink-700'}`}>+{formatKz(m.amount_minor)}</p>
                    <p className="text-[11px] text-ink-400">{m.kind === 'available' ? 'Recebido' : 'Retido'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Clock; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-cloud-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <Icon size={16} className="text-ink-400" />
      </div>
      <p className="mt-2 font-display text-xl font-extrabold text-ink-900">{value}</p>
      <p className="mt-0.5 text-xs text-ink-400">{hint}</p>
    </div>
  );
}
