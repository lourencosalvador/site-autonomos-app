import { useEffect, useState } from 'react';
import { ArrowDownLeft, CheckCircle2, Clock, Hourglass, Landmark, Lock, Percent, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { navigate } from '../../router';
import { type MovementState, type Wallet, providerWallet } from '../../lib/hub';
import { formatKz } from '../../lib/payments';
import { formatIban } from '../../lib/phone';
import { FeeExplainer } from '../../components/app/FeeExplainer';
import { Badge, Btn, Card, CardHeader, EmptyState, Notice, PageHeader, Spinner, Stat, type Tone } from '../../components/app/ui';

const STATE: Record<MovementState, { label: string; tone: Tone }> = {
  transferred: { label: 'Transferido', tone: 'success' },
  due: { label: 'A receber', tone: 'brand' },
  awaiting_payment: { label: 'A aguardar pagamento do cliente', tone: 'neutral' },
};

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
  if (!user.isProfessional) { navigate('/conta'); return null; }

  if (!approved) {
    return (
      <>
        <PageHeader title="Finanças" description="Registo dos valores dos seus serviços." />
        <Card><EmptyState icon={Lock} title="Disponível após aprovação" description="A carteira fica ativa assim que a nossa equipa aprovar o seu perfil." /></Card>
      </>
    );
  }

  const n = (v: number | undefined) => Number(v) || 0;

  return (
    <>
      <PageHeader title="Finanças" description="Registo dos valores dos seus serviços. Os pagamentos são transferidos diretamente para a sua conta bancária." />

      {!user.iban && (
        <Notice tone="warning" title="Falta o seu IBAN" className="mb-6" action={<Btn size="md" variant="outline" to="/conta/perfil?painel=banco">Adicionar IBAN</Btn>}>
          Sem IBAN não conseguimos transferir o valor dos serviços concluídos.
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-brand-dark p-6 text-white sm:p-7">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/60">A receber</span>
            <WalletIcon size={20} className="text-brand-cyan" />
          </div>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight">{loading ? '—' : formatKz(n(w?.due_minor))}</p>
          <p className="mt-1 text-sm text-white/60">Pagamentos confirmados, a transferir</p>
          <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
            <Landmark size={16} className="shrink-0 text-white/50" />
            <span className="truncate">{user.iban ? formatIban(user.iban) : 'IBAN por indicar'}</span>
          </div>
        </div>
        <Stat label="Já transferido" value={loading ? '—' : formatKz(n(w?.transferred_minor))} hint="Para a sua conta bancária" icon={CheckCircle2} />
        <Stat label="A aguardar o cliente" value={loading ? '—' : formatKz(n(w?.upcoming_minor))} hint="Serviços confirmados por pagar" icon={Hourglass} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Faturado (bruto)" value={loading ? '—' : formatKz(n(w?.gross_minor))} hint="Serviços pagos" icon={ArrowDownLeft} />
        <Stat label="Comissões" value={loading ? '—' : formatKz(n(w?.fees_minor))} hint="AUTONOMOUS" icon={Percent} />
        <Stat label="Serviços concluídos" value={loading ? '—' : n(w?.jobs_done)} hint="Total" icon={Clock} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Movimentos" description="Cada serviço com o valor bruto, a comissão e o valor líquido." />
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (w?.movements.length ?? 0) === 0 ? (
            <EmptyState icon={WalletIcon} title="Sem movimentos" description="Os serviços aparecem aqui quando o cliente confirma a conclusão." />
          ) : (
            <div className="mt-3 divide-y divide-line border-t border-line">
              {w!.movements.map((m) => (
                <button key={m.id} onClick={() => navigate(`/conta/pedido/${m.id}`)} className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-cloud-50 sm:flex-row sm:items-center sm:px-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-ink-900">{m.category}</p>
                      <Badge tone={STATE[m.state].tone}>{STATE[m.state].label}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-500">
                      {m.client_name || 'Cliente'} · {m.at ? new Date(m.at).toLocaleDateString('pt-PT') : ''}
                      {m.payout_reference ? ` · Ref. ${m.payout_reference}` : ''}
                    </p>
                  </div>
                  <dl className="grid shrink-0 grid-cols-3 gap-4 text-right text-sm sm:w-[300px]">
                    <div><dt className="text-ink-400">Bruto</dt><dd className="font-medium text-ink-700">{formatKz(m.gross_minor)}</dd></div>
                    <div><dt className="text-ink-400">Comissão</dt><dd className="font-medium text-ink-700">−{formatKz(m.fee_minor)}</dd></div>
                    <div><dt className="text-ink-400">Líquido</dt><dd className="font-semibold text-ink-900">{formatKz(m.amount_minor)}</dd></div>
                  </dl>
                </button>
              ))}
            </div>
          )}
        </Card>
        <FeeExplainer audience="professional" className="h-fit" />
      </div>
    </>
  );
}
