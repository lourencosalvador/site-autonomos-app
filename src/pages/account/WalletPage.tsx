import { useEffect, useState } from 'react';
import { ArrowDownLeft, Clock, Lock, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { navigate } from '../../router';
import { type Wallet, providerWallet } from '../../lib/hub';
import { formatKz } from '../../lib/payments';
import { Card, CardHeader, EmptyState, PageHeader, Spinner, Stat } from '../../components/app/ui';

export function WalletPage() {
  const { user } = useAuth();
  const approved = user?.approvalStatus === 'approved';
  const [w, setW] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!approved) return;
    let active = true;
    providerWallet()
      .then((d) => { if (active) setW(d); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [approved]);

  if (!user) return null;
  if (user.role !== 'professional') { navigate('/conta'); return null; }

  if (!approved) {
    return (
      <>
        <PageHeader title="Finanças" description="A sua carteira, saldo e movimentos." />
        <Card>
          <EmptyState icon={Lock} title="Disponível após aprovação" description="A carteira fica ativa assim que a nossa equipa aprovar o seu perfil." />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Finanças" description="A sua carteira, saldo e movimentos." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-brand-dark p-6 text-white sm:p-7 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/60">Saldo disponível</span>
            <WalletIcon size={20} className="text-brand-cyan" />
          </div>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
            {loading ? <Spinner className="text-white/50" /> : formatKz(w?.available_minor ?? 0)}
          </p>
          <p className="mt-6 truncate text-[15px] text-white/70">{user.name}</p>
          <p className="truncate text-sm text-white/50">{user.companyName || user.workAreas.join(' · ') || 'Profissional'}</p>
        </div>
        <Stat label="Retido" value={loading ? '—' : formatKz(w?.pending_minor ?? 0)} hint="Libertado quando o cliente confirma" icon={Clock} />
        <Stat label="Serviços concluídos" value={loading ? '—' : w?.jobs_done ?? 0} hint="Total" icon={ArrowDownLeft} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Movimentos" />
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (w?.movements.length ?? 0) === 0 ? (
          <EmptyState icon={WalletIcon} title="Sem movimentos" description="Os valores dos serviços pagos aparecem aqui." />
        ) : (
          <div className="mt-3 divide-y divide-line border-t border-line">
            {w!.movements.map((m) => {
              const received = m.kind === 'available';
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${received ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {received ? <ArrowDownLeft size={19} /> : <Clock size={19} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink-900">{m.category}</p>
                    <p className="truncate text-sm text-ink-500">{m.client_name || 'Cliente'} · {new Date(m.at).toLocaleDateString('pt-PT')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-semibold ${received ? 'text-emerald-700' : 'text-ink-900'}`}>+{formatKz(m.amount_minor)}</p>
                    <p className="text-sm text-ink-400">{received ? 'Recebido' : 'Retido'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
