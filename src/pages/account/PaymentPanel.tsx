import { useState } from 'react';
import { ArrowRight, Loader2, Receipt, Smartphone, Wallet } from 'lucide-react';
import { Button } from '../../components/Button';
import { TextInput } from '../../components/Field';
import { type Charge, type PaymentMethod, formatKz, payErrorMessage, prepareBroadcastPayment } from '../../lib/payments';

/** Pagamento FlexPay do pedido (preço fixo). Mostra só o valor a pagar ao cliente. */
export function PaymentPanel({ requestId, priceMinor }: { requestId: string; priceMinor: number }) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('+244 ');
  const [charge, setCharge] = useState<Charge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (m: PaymentMethod) => {
    if (busy) return;
    setError(null);
    if (m === 'GPO' && phone.replace(/\D/g, '').length < 9) { setError('Indique o número Multicaixa Express.'); return; }
    setBusy(true);
    try {
      const c = await prepareBroadcastPayment(requestId, m, m === 'GPO' ? phone.trim() : undefined);
      setCharge(c);
    } catch (e) {
      setError(payErrorMessage(e instanceof Error ? e.message : 'pay_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-cloud-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-500"><Wallet size={16} className="text-ink-400" /> Valor a pagar</span>
        <span className="font-display text-2xl font-extrabold text-ink-900">{formatKz(priceMinor)}</span>
      </div>

      {/* Referência gerada */}
      {charge && charge.method === 'REF' && charge.reference?.number && (
        <div className="mt-4 rounded-xl bg-cloud-50 p-4">
          <p className="text-sm font-semibold text-ink-900">Pague por Referência (ATM / Multicaixa Express / homebanking)</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Info label="Entidade" value={charge.reference.entity ?? '—'} />
            <Info label="Referência" value={charge.reference.number} />
            <Info label="Montante" value={formatKz(charge.amount_minor)} />
            {charge.reference.due_at && <Info label="Válida até" value={new Date(charge.reference.due_at).toLocaleDateString('pt-PT')} />}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400"><Loader2 size={12} className="animate-spin" /> A aguardar a confirmação do pagamento…</p>
        </div>
      )}

      {/* Multicaixa Express pendente */}
      {charge && charge.method === 'GPO' && (
        <div className="mt-4 rounded-xl bg-cloud-50 p-4">
          <p className="text-sm font-semibold text-ink-900">Confirme na app Multicaixa Express</p>
          <p className="mt-1 text-sm text-ink-500">Enviámos um pedido de pagamento para o seu telemóvel. Aprove para concluir.</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400"><Loader2 size={12} className="animate-spin" /> A aguardar a confirmação…</p>
        </div>
      )}

      {/* Escolha do método */}
      {!charge && (
        <div className="mt-4">
          {method !== 'GPO' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => pay('REF')} disabled={busy}
                className="flex items-center gap-3 rounded-xl border border-cloud-200 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-cyan/50 hover:shadow-soft disabled:opacity-60">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-dark"><Receipt size={18} /></span>
                <span className="text-sm font-semibold text-ink-900">Referência</span>
                {busy && method === null && <Loader2 size={15} className="ml-auto animate-spin text-ink-400" />}
              </button>
              <button onClick={() => setMethod('GPO')} disabled={busy}
                className="flex items-center gap-3 rounded-xl border border-cloud-200 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-cyan/50 hover:shadow-soft disabled:opacity-60">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-dark"><Smartphone size={18} /></span>
                <span className="text-sm font-semibold text-ink-900">Multicaixa Express</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+244 9XX XXX XXX" inputMode="tel" />
              <div className="flex gap-2">
                <Button onClick={() => setMethod(null)} variant="outline-dark" size="md" className="flex-1">Voltar</Button>
                <Button onClick={() => pay('GPO')} size="md" className="flex-1" disabled={busy}>
                  {busy ? <><Loader2 size={16} className="animate-spin" /> A enviar…</> : <>Enviar pedido <ArrowRight size={16} /></>}
                </Button>
              </div>
            </div>
          )}
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <p className="text-[11px] font-medium text-ink-400">{label}</p>
      <p className="font-display text-base font-bold tracking-wide text-ink-900">{value}</p>
    </div>
  );
}
