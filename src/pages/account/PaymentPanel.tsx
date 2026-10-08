import { useState } from 'react';
import { ArrowRight, Loader2, Lock, Receipt, ShieldCheck, Smartphone, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { TextInput } from '../../components/Field';
import { type Charge, type PaymentMethod, formatKz, payErrorMessage, prepareBroadcastPayment } from '../../lib/payments';

const FEE_RATE = 0.10;

/** Recibo + pagamento FlexPay. O valor pago fica retido até o cliente confirmar a conclusão. */
export function PaymentPanel({ requestId, priceMinor }: { requestId: string; priceMinor: number }) {
  const work = priceMinor;
  const fee = Math.round(work * FEE_RATE);
  const total = work + fee;

  const [escrowOpen, setEscrowOpen] = useState(false);
  const [choosing, setChoosing] = useState(false); // já confirmou o escrow, a escolher método
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
    <div className="mt-5 overflow-hidden rounded-3xl border border-cloud-200 bg-white p-3 shadow-soft">
     <div className="grid items-stretch gap-3 md:grid-cols-[1.05fr_1fr]">
      {/* Recibo (esquerda) */}
      <Receipt_ work={work} fee={fee} total={total} />

      {/* Ação (direita) */}
      <div className="flex flex-col justify-center rounded-2xl bg-cloud-50/50 p-5">
        {charge ? (
          charge.method === 'REF' && charge.reference?.number ? (
            <div>
              <p className="text-sm font-semibold text-ink-900">Referência Multicaixa Express</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Info label="Entidade" value={charge.reference.entity ?? '—'} />
                <Info label="Referência" value={charge.reference.number} />
                <Info label="Montante" value={formatKz(charge.amount_minor)} />
                {charge.reference.due_at && <Info label="Válida até" value={new Date(charge.reference.due_at).toLocaleDateString('pt-PT')} />}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400"><Loader2 size={12} className="animate-spin" /> A aguardar a confirmação do pagamento…</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-ink-900">Confirme na app Multicaixa Express</p>
              <p className="mt-1 text-sm text-ink-500">Enviámos um pedido de pagamento para o seu telemóvel. Aprove para concluir.</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400"><Loader2 size={12} className="animate-spin" /> A aguardar a confirmação…</p>
            </div>
          )
        ) : choosing ? (
          method !== 'GPO' ? (
            <>
              <p className="mb-3 text-sm font-semibold text-ink-900">Como quer pagar?</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => pay('REF')} disabled={busy}
                  className="flex items-center gap-3 rounded-xl border border-cloud-200 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-cyan/50 hover:shadow-soft disabled:opacity-60">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-dark"><Receipt size={18} /></span>
                  <span className="text-sm font-semibold text-ink-900">Referência</span>
                  {busy && <Loader2 size={15} className="ml-auto animate-spin text-ink-400" />}
                </button>
                <button onClick={() => setMethod('GPO')} disabled={busy}
                  className="flex items-center gap-3 rounded-xl border border-cloud-200 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-cyan/50 hover:shadow-soft disabled:opacity-60">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-dark"><Smartphone size={18} /></span>
                  <span className="text-sm font-semibold text-ink-900">Multicaixa Express</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-ink-900">Número Multicaixa Express</p>
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+244 9XX XXX XXX" inputMode="tel" />
              <div className="flex gap-2">
                <Button onClick={() => setMethod(null)} variant="outline-dark" size="md" className="flex-1">Voltar</Button>
                <Button onClick={() => pay('GPO')} size="md" className="flex-1" disabled={busy}>
                  {busy ? <><Loader2 size={16} className="animate-spin" /> A enviar…</> : <>Enviar <ArrowRight size={16} /></>}
                </Button>
              </div>
            </div>
          )
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm leading-relaxed text-ink-600"><ShieldCheck size={18} className="shrink-0 text-emerald-500" /> Pagamento seguro, retido até o serviço ser concluído.</p>
            <Button onClick={() => setEscrowOpen(true)} size="md" className="mt-4 w-full">Pagar {formatKz(total)} <ArrowRight size={16} /></Button>
          </>
        )}
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
      </div>
     </div>

      {/* Modal de escrow */}
      {escrowOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setEscrowOpen(false)}>
          <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-cardHover sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mb-4 flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Lock size={20} /></span>
              <button onClick={() => setEscrowOpen(false)} className="rounded-full p-1.5 text-ink-400 hover:bg-cloud-100"><X size={18} /></button>
            </div>
            <h3 className="font-display text-lg font-bold text-ink-900">Pagamento retido em segurança</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              O valor de <strong>{formatKz(total)}</strong> fica <strong>retido na conta da AUTONOMOUS</strong>. Só é enviado ao prestador quando <strong>confirmar que o serviço foi concluído</strong>. Assim, o seu dinheiro está protegido.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button onClick={() => setEscrowOpen(false)} variant="outline-dark" size="md">Cancelar</Button>
              <Button onClick={() => { setEscrowOpen(false); setChoosing(true); }} size="md">Pagar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Recibo com efeito de bordas rasgadas (scalloped) em cima e em baixo. */
function Receipt_({ work, fee, total }: { work: number; fee: number; total: number }) {
  const scallop: React.CSSProperties = {
    WebkitMask:
      'radial-gradient(9px at 9px 0,#0000 98%,#000) 0 0/18px 51% repeat-x,' +
      'radial-gradient(9px at 9px 100%,#0000 98%,#000) 0 100%/18px 51% repeat-x',
    mask:
      'radial-gradient(9px at 9px 0,#0000 98%,#000) 0 0/18px 51% repeat-x,' +
      'radial-gradient(9px at 9px 100%,#0000 98%,#000) 0 100%/18px 51% repeat-x',
  };
  return (
    <div className="bg-cloud-50 p-1.5" style={scallop}>
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 border-b border-dashed border-cloud-300 pb-3">
          <Receipt size={16} className="text-ink-400" />
          <p className="text-sm font-bold uppercase tracking-wide text-ink-700">Resumo do pagamento</p>
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          <Line label="Total do trabalho" value={formatKz(work)} />
          <Line label="Taxa de serviço (10%)" value={formatKz(fee)} />
        </dl>
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-dashed border-cloud-300 pt-3">
          <span className="text-sm font-semibold text-ink-700">Total a pagar</span>
          <span className="font-display text-xl font-extrabold text-ink-900">{formatKz(total)}</span>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-800">{value}</dd>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cloud-50 px-3 py-2">
      <p className="text-[11px] font-medium text-ink-400">{label}</p>
      <p className="font-display text-base font-bold tracking-wide text-ink-900">{value}</p>
    </div>
  );
}
