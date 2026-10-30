import { useEffect, useState } from 'react';
import { Landmark, Lock, Receipt, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { navigate } from '../../router';
import { type MovementState, type Wallet, providerWallet } from '../../lib/hub';
import { formatKz } from '../../lib/payments';
import { formatIban } from '../../lib/phone';
import { FeeExplainer } from '../../components/app/FeeExplainer';
import { Badge, Btn, Card, EmptyState, Notice, PageHeader, Spinner, type Tone, cx } from '../../components/app/ui';

const STATE: Record<MovementState, { label: string; tone: Tone }> = {
  transferred: { label: 'Transferido', tone: 'success' },
  due: { label: 'A receber', tone: 'brand' },
  awaiting_payment: { label: 'A aguardar o cliente', tone: 'neutral' },
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
  const v = (minor: number | undefined) => (loading ? '—' : formatKz(n(minor)));
  const movements = w?.movements ?? [];
  const metrics = [
    { label: 'Já transferido', value: v(w?.transferred_minor) },
    { label: 'A aguardar o cliente', value: v(w?.upcoming_minor) },
    { label: 'Faturado (bruto)', value: v(w?.gross_minor) },
    { label: 'Comissões', value: v(w?.fees_minor) },
    { label: 'Serviços concluídos', value: loading ? '—' : String(n(w?.jobs_done)) },
  ];

  return (
    <>
      <PageHeader title="Finanças" description="Registo dos valores dos seus serviços. Os pagamentos são transferidos diretamente para a sua conta bancária." />

      {!user.iban && (
        <Notice tone="warning" title="Falta o seu IBAN" className="mb-6" action={<Btn size="md" variant="outline" to="/conta/perfil?painel=banco">Adicionar IBAN</Btn>}>
          Sem IBAN não conseguimos transferir o valor dos serviços concluídos.
        </Notice>
      )}

      <section className="wallet-card rounded-2xl text-white">
        <div className="wallet-aurora" aria-hidden />
        <div className="wallet-grid" aria-hidden />
        <div className="wallet-sheen" aria-hidden />

        <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white/60">
              <WalletIcon size={18} className="text-brand-cyan" /> A receber
            </div>
            <p className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{v(w?.due_minor)}</p>
            <p className="mt-1.5 text-[15px] text-white/60">Pagamentos confirmados, a transferir para a sua conta</p>
          </div>
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm md:w-auto md:min-w-[300px]">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">Conta de destino</p>
            <p className="mt-1 flex items-center gap-2 truncate text-[15px] font-medium text-white/90">
              <Landmark size={16} className="shrink-0 text-white/50" />
              <span className="truncate">{user.iban ? formatIban(user.iban) : 'IBAN por indicar'}</span>
            </p>
            {user.ibanHolder && <p className="mt-0.5 truncate text-sm text-white/50">{user.ibanHolder}</p>}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-y-1 border-t border-white/10 py-2 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => (
            <div key={m.label} className="px-6 py-4 sm:px-8">
              <dt className="text-sm text-white/55">{m.label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-white">{m.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="receipt-shadow">
            <div className="receipt-edges px-5 pb-8 pt-9 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink-900"><Receipt size={19} className="text-ink-400" /> Movimentos</h2>
                  <p className="mt-1 text-[15px] text-ink-500">Cada serviço com o valor bruto, a comissão e o líquido.</p>
                </div>
                <span className="shrink-0 font-mono text-xs uppercase tracking-widest text-ink-300">Autonomous</span>
              </div>

              <div className="receipt-rule mt-5" />

              {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : movements.length === 0 ? (
                <EmptyState icon={WalletIcon} title="Sem movimentos" description="Os serviços aparecem aqui quando o cliente confirma a conclusão." />
              ) : (
                <ul>
                  {movements.map((m, i) => (
                    <li key={m.id} className={cx(i > 0 && 'receipt-rule')}>
                      <button onClick={() => navigate(`/conta/pedido/${m.id}`)} className="flex w-full items-start justify-between gap-4 py-4 text-left transition-colors hover:bg-cloud-50/70 sm:px-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-ink-900">{m.category}</p>
                            <Badge tone={STATE[m.state].tone}>{STATE[m.state].label}</Badge>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-ink-500">
                            {m.client_name || 'Cliente'} · {m.at ? new Date(m.at).toLocaleDateString('pt-PT') : ''}
                            {m.payout_reference ? ` · Ref. ${m.payout_reference}` : ''}
                          </p>
                          <p className="mt-1 font-mono text-[13px] text-ink-400">
                            Bruto {formatKz(m.gross_minor)} · Comissão −{formatKz(m.fee_minor)}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-base font-semibold tabular-nums text-ink-900">+{formatKz(m.amount_minor)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!loading && movements.length > 0 && (
                <>
                  <div className="receipt-rule" />
                  <dl className="space-y-1.5 pt-4 font-mono text-[15px]">
                    <div className="flex justify-between text-ink-500"><dt>Total bruto</dt><dd className="tabular-nums">{formatKz(movements.reduce((s, m) => s + n(m.gross_minor), 0))}</dd></div>
                    <div className="flex justify-between text-ink-500"><dt>Comissões</dt><dd className="tabular-nums">−{formatKz(movements.reduce((s, m) => s + n(m.fee_minor), 0))}</dd></div>
                    <div className="flex justify-between pt-1.5 text-base font-semibold text-ink-900"><dt>Total líquido</dt><dd className="tabular-nums">{formatKz(movements.reduce((s, m) => s + n(m.amount_minor), 0))}</dd></div>
                  </dl>
                </>
              )}
            </div>
          </div>
        </div>
        <FeeExplainer audience="professional" className="h-fit" />
      </div>
    </>
  );
}
