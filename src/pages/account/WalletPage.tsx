import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Clock, Landmark, Lock, Receipt, Wallet as WalletIcon, X } from 'lucide-react';
import { useAuth, type AuthUser } from '../../auth/AuthContext';
import { navigate } from '../../router';
import {
  MIN_WITHDRAWAL_MINOR, type Movement, type Wallet, type WithdrawalStatus,
  cancelWithdrawal, providerWallet, requestWithdrawal, withdrawalErrorMessage,
} from '../../lib/hub';
import { formatKz } from '../../lib/payments';
import { formatIban, isValidIban } from '../../lib/phone';
import { FeeExplainer } from '../../components/app/FeeExplainer';
import { Modal } from '../../components/app/profile';
import { FormField } from '../../components/app/forms';
import { TextInput } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { Badge, Btn, Card, EmptyState, PageHeader, Spinner, type Tone, cx } from '../../components/app/ui';

const SAQUE_STATE: Record<WithdrawalStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Em processamento', tone: 'warning' },
  paid: { label: 'Transferido', tone: 'success' },
  rejected: { label: 'Rejeitado', tone: 'danger' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
};

const n = (v: number | undefined | null) => Number(v) || 0;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-PT') : '');

export function WalletPage() {
  const { user, refresh } = useAuth();
  const { success, error: toastError } = useToast();
  const approved = user?.approvalStatus === 'approved';
  const [w, setW] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [sacar, setSacar] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try { setW(await providerWallet()); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (approved) void load(); }, [approved, load]);

  if (!user) return null;
  if (!user.isProfessional) { navigate('/conta'); return null; }

  if (!approved) {
    return (
      <>
        <PageHeader title="Finanças" description="O saldo dos seus serviços e os seus saques." />
        <Card><EmptyState icon={Lock} title="Disponível após aprovação" description="A carteira fica ativa assim que a nossa equipa aprovar o seu perfil." /></Card>
      </>
    );
  }

  const v = (minor: number | undefined) => (loading ? '—' : formatKz(n(minor)));
  const available = n(w?.available_minor);
  const pending = w?.pending_withdrawal ?? null;
  const movements = w?.movements ?? [];
  const canSacar = !loading && !pending && available >= MIN_WITHDRAWAL_MINOR;
  const metrics = [
    { label: 'Em saque', value: v(w?.pending_withdrawal_minor) },
    { label: 'Já sacado', value: v(w?.withdrawn_minor) },
    { label: 'A aguardar o cliente', value: v(w?.upcoming_minor) },
    { label: 'Faturado (bruto)', value: v(w?.gross_minor) },
    { label: 'Comissões', value: v(w?.fees_minor) },
  ];

  const cancel = async () => {
    if (!pending) return;
    setCancelling(true);
    try { await cancelWithdrawal(pending.id); success('Saque cancelado', 'O valor voltou ao seu saldo.'); await load(); }
    catch (e) { toastError('Não foi possível cancelar', withdrawalErrorMessage(e)); }
    finally { setCancelling(false); }
  };

  return (
    <>
      <PageHeader title="Finanças" description="Quando confirmamos o pagamento do cliente, o valor líquido entra no seu saldo. Saque quando quiser para a sua conta bancária." />

      <section className="wallet-card rounded-2xl text-white">
        <div className="wallet-aurora" aria-hidden />
        <div className="wallet-grid" aria-hidden />
        <div className="wallet-sheen" aria-hidden />

        <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white/60">
              <WalletIcon size={18} className="text-brand-cyan" /> Saldo disponível
            </div>
            <p className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{v(w?.available_minor)}</p>
            <p className="mt-1.5 text-[15px] text-white/60">
              {pending ? 'Tem um saque em processamento.' : available > 0 ? 'Pronto a sacar para a sua conta bancária.' : 'Os serviços pagos entram aqui.'}
            </p>
          </div>

          <div className="w-full md:w-auto md:min-w-[300px]">
            {pending ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-200/90"><Clock size={14} /> Saque em processamento</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{formatKz(pending.amount_minor)}</p>
                <p className="mt-0.5 truncate text-sm text-white/55">Para {formatIban(pending.iban)} · pedido a {day(pending.created_at)}</p>
                <button onClick={cancel} disabled={cancelling}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white disabled:opacity-50">
                  <X size={15} /> {cancelling ? 'A cancelar…' : 'Cancelar saque'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Btn variant="accent" size="lg" className="w-full" disabled={!canSacar} onClick={() => setSacar(true)}>
                  <ArrowDownToLine size={19} /> Sacar
                </Btn>
                <p className="flex items-center justify-center gap-1.5 truncate text-sm text-white/55 md:justify-start">
                  <Landmark size={15} className="shrink-0" />
                  <span className="truncate">{user.iban ? formatIban(user.iban) : 'Indica a conta no momento de sacar'}</span>
                </p>
              </div>
            )}
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
                  <p className="mt-1 text-[15px] text-ink-500">Serviços creditados no saldo e saques feitos.</p>
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
                    <li key={`${m.type}-${m.id}`} className={cx(i > 0 && 'receipt-rule')}>
                      <MovementRow m={m} />
                    </li>
                  ))}
                </ul>
              )}

              {!loading && movements.length > 0 && (
                <>
                  <div className="receipt-rule" />
                  <dl className="space-y-1.5 pt-4 font-mono text-[15px]">
                    <div className="flex justify-between text-ink-500"><dt>Creditado</dt><dd className="tabular-nums">{formatKz(n(w?.credited_minor))}</dd></div>
                    <div className="flex justify-between text-ink-500"><dt>Saques</dt><dd className="tabular-nums">−{formatKz(n(w?.withdrawn_minor) + n(w?.pending_withdrawal_minor))}</dd></div>
                    <div className="flex justify-between pt-1.5 text-base font-semibold text-ink-900"><dt>Saldo disponível</dt><dd className="tabular-nums">{formatKz(available)}</dd></div>
                  </dl>
                </>
              )}
            </div>
          </div>
        </div>
        <FeeExplainer audience="professional" className="h-fit" />
      </div>

      {sacar && (
        <SaqueModal
          user={user}
          available={available}
          onClose={() => setSacar(false)}
          onDone={async () => { setSacar(false); await Promise.all([load(), refresh()]); }}
        />
      )}
    </>
  );
}

function MovementRow({ m }: { m: Movement }) {
  if (m.type === 'service') {
    return (
      <button onClick={() => navigate(`/conta/pedido/${m.id}`)} className="flex w-full items-start justify-between gap-4 py-4 text-left transition-colors hover:bg-cloud-50/70 sm:px-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-ink-900">{m.label}</p>
            {m.state === 'credited' ? <Badge tone="success">No saldo</Badge> : <Badge>A aguardar o cliente</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-500">{m.client_name || 'Cliente'} · {day(m.at)}</p>
          <p className="mt-1 font-mono text-[13px] text-ink-400">Bruto {formatKz(m.gross_minor)} · Comissão −{formatKz(m.fee_minor)}</p>
        </div>
        <p className={cx('shrink-0 font-mono text-base font-semibold tabular-nums', m.state === 'credited' ? 'text-emerald-700' : 'text-ink-400')}>+{formatKz(m.amount_minor)}</p>
      </button>
    );
  }
  const st = SAQUE_STATE[m.state];
  return (
    <div className="flex w-full items-start justify-between gap-4 py-4 sm:px-2">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cloud-100 text-ink-500"><ArrowUpRight size={18} /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-ink-900">Saque</p>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-500">
            {m.iban ? `Para ${formatIban(m.iban)}` : 'Transferência bancária'} · {day(m.at)}
            {m.reference ? ` · Ref. ${m.reference}` : ''}
          </p>
          {m.state === 'rejected' && m.rejected_reason && <p className="mt-1 text-sm text-red-600">Motivo: {m.rejected_reason}. O valor voltou ao saldo.</p>}
        </div>
      </div>
      <p className={cx('shrink-0 font-mono text-base font-semibold tabular-nums', m.state === 'rejected' ? 'text-ink-300 line-through' : 'text-ink-900')}>−{formatKz(m.amount_minor)}</p>
    </div>
  );
}

function SaqueModal({ user, available, onClose, onDone }: { user: AuthUser; available: number; onClose: () => void; onDone: () => Promise<void> }) {
  const { success } = useToast();
  const [amount, setAmount] = useState(String(Math.floor(available / 100)));
  const [iban, setIban] = useState(user.iban ? formatIban(user.iban) : '');
  const [holder, setHolder] = useState(user.ibanHolder ?? user.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const minor = (Number(amount) || 0) * 100;
  const amountError = minor < MIN_WITHDRAWAL_MINOR ? 'O valor mínimo é 100 Kz.' : minor > available ? 'Superior ao saldo disponível.' : null;
  const ibanError = isValidIban(iban) ? null : 'IBAN inválido. Deve ter 21 dígitos (AO06 opcional).';
  const holderError = holder.trim().length < 2 ? 'Indique o titular da conta.' : null;
  const display = amount ? Number(amount).toLocaleString('pt-PT').replace(/[\s,]/g, '.') : '';

  const submit = async () => {
    setTouched(true);
    if (amountError || ibanError || holderError) return;
    setBusy(true);
    setError(null);
    try {
      await requestWithdrawal(minor, iban, holder.trim());
      success('Saque pedido', `Vamos transferir ${formatKz(minor)} para a sua conta. Avisamos quando estiver feito.`);
      await onDone();
    } catch (e) {
      setError(withdrawalErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={busy ? () => {} : onClose} className="max-w-lg">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold text-ink-900">Sacar saldo</h3>
        <button onClick={onClose} disabled={busy} aria-label="Fechar" className="rounded-lg p-2 text-ink-400 hover:bg-cloud-100"><X size={20} /></button>
      </div>
      <div className="space-y-5 p-5">
        <FormField label="Valor a sacar" htmlFor="saque-valor" error={touched ? amountError ?? undefined : undefined}
          hint={`Disponível: ${formatKz(available)}`}>
          <div className="relative">
            <TextInput id="saque-valor" inputMode="numeric" value={display} hasError={touched && !!amountError} autoFocus
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12))}
              className="pr-28 text-lg font-semibold tabular-nums" />
            <div className="absolute inset-y-0 right-2 flex items-center gap-2">
              <span className="text-[15px] font-medium text-ink-400">Kz</span>
              <button type="button" onClick={() => setAmount(String(Math.floor(available / 100)))}
                className="rounded-lg bg-cloud-100 px-2.5 py-1.5 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-cloud-200">Tudo</button>
            </div>
          </div>
        </FormField>
        <FormField label="IBAN" htmlFor="saque-iban" error={touched ? ibanError ?? undefined : undefined}>
          <TextInput id="saque-iban" value={iban} hasError={touched && !!ibanError} placeholder="AO06 0000 0000 0000 0000 0000 0"
            onChange={(e) => setIban(e.target.value.toUpperCase())} className="font-mono tracking-wide" />
        </FormField>
        <FormField label="Titular da conta" htmlFor="saque-titular" error={touched ? holderError ?? undefined : undefined}>
          <TextInput id="saque-titular" value={holder} hasError={touched && !!holderError} onChange={(e) => setHolder(e.target.value)} placeholder="Nome como aparece no banco" />
        </FormField>
        <p className="rounded-xl bg-cloud-50 px-4 py-3 text-[15px] leading-relaxed text-ink-600">
          A equipa AUTONOMOUS faz a transferência manualmente para esta conta e avisa-o assim que estiver feita. O IBAN fica guardado no seu perfil.
        </p>
        {error && <p className="text-[15px] font-medium text-red-600">{error}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-line p-5">
        <Btn variant="outline" onClick={onClose} disabled={busy}>Cancelar</Btn>
        <Btn onClick={submit} loading={busy}>{busy ? 'A pedir…' : `Sacar ${minor ? formatKz(minor) : ''}`}</Btn>
      </div>
    </Modal>
  );
}
