import { useState } from 'react';
import { ChevronRight, FlaskConical, Loader2, Lock, Receipt, ShieldCheck, Smartphone, X } from 'lucide-react';
import { TextInput } from '../../components/Field';
import { Btn, DetailRow } from '../../components/app/ui';
import { type Charge, type PaymentMethod, formatKz, payErrorMessage, prepareBroadcastPayment, payTestBroadcast } from '../../lib/payments';

const FEE_RATE = 0.10;

export function PaymentPanel({ requestId, priceMinor, onPaid }: { requestId: string; priceMinor: number; onPaid?: () => void }) {
  const work = priceMinor;
  const fee = Math.round(work * FEE_RATE);
  const total = work + fee;

  const [escrowOpen, setEscrowOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('+244 ');
  const [charge, setCharge] = useState<Charge | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pay = async (m: PaymentMethod) => {
    if (busy) return;
    setError(null);
    if (m === 'GPO' && phone.replace(/\D/g, '').length < 9) { setError('Indique o número Multicaixa Express.'); return; }
    setBusy(m);
    try {
      setCharge(await prepareBroadcastPayment(requestId, m, m === 'GPO' ? phone.trim() : undefined));
    } catch (e) {
      setError(payErrorMessage(e instanceof Error ? e.message : 'pay_failed'));
    } finally {
      setBusy(null);
    }
  };

  const payTest = async () => {
    if (busy) return;
    setBusy('TEST');
    setError(null);
    try {
      await payTestBroadcast(requestId);
      onPaid?.();
    } catch (e) {
      setError(payErrorMessage(e instanceof Error ? e.message.toLowerCase() : 'pay_failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl border border-line bg-cloud-50 px-5 py-2">
        <dl className="divide-y divide-line">
          <DetailRow label="Serviço">{formatKz(work)}</DetailRow>
          <DetailRow label="Taxa de serviço (10%)">{formatKz(fee)}</DetailRow>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-base font-semibold text-ink-900">Total</dt>
            <dd className="text-lg font-semibold text-ink-900">{formatKz(total)}</dd>
          </div>
        </dl>
      </div>

      {charge ? (
        charge.method === 'REF' && charge.reference?.number ? (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-base font-semibold text-ink-900">Referência Multicaixa</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info label="Entidade" value={charge.reference.entity ?? '—'} />
              <Info label="Referência" value={charge.reference.number} />
              <Info label="Montante" value={formatKz(charge.amount_minor)} />
              {charge.reference.due_at && <Info label="Válida até" value={new Date(charge.reference.due_at).toLocaleDateString('pt-PT')} />}
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-500"><Loader2 size={15} className="animate-spin" /> A aguardar a confirmação do pagamento…</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-base font-semibold text-ink-900">Confirme na app Multicaixa Express</p>
            <p className="mt-1 text-[15px] text-ink-500">Enviámos um pedido de pagamento para o seu telemóvel. Aprove para concluir.</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-500"><Loader2 size={15} className="animate-spin" /> A aguardar a confirmação…</p>
          </div>
        )
      ) : choosing ? (
        method === 'GPO' ? (
          <div className="space-y-3">
            <label htmlFor="mcx" className="text-[15px] font-medium text-ink-900">Número Multicaixa Express</label>
            <TextInput id="mcx" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+244 9XX XXX XXX" inputMode="tel" />
            <div className="grid grid-cols-2 gap-3">
              <Btn variant="outline" onClick={() => setMethod(null)}>Voltar</Btn>
              <Btn onClick={() => pay('GPO')} loading={busy === 'GPO'}>Enviar pedido</Btn>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-base font-semibold text-ink-900">Como quer pagar?</p>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              <MethodRow icon={Receipt} title="Referência Multicaixa" desc="Pague num ATM ou no homebanking." onClick={() => pay('REF')} busy={busy === 'REF'} disabled={!!busy} />
              <MethodRow icon={Smartphone} title="Multicaixa Express" desc="Aprove no seu telemóvel." onClick={() => setMethod('GPO')} disabled={!!busy} />
              <MethodRow icon={FlaskConical} title="Pagar (teste)" desc="Simula o pagamento para testar o fluxo." onClick={payTest} busy={busy === 'TEST'} disabled={!!busy} muted />
            </div>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <Btn onClick={() => setEscrowOpen(true)} className="w-full sm:w-auto sm:min-w-[240px]">Pagar {formatKz(total)}</Btn>
          <p className="flex items-center gap-2 text-sm text-ink-500"><ShieldCheck size={17} className="shrink-0 text-emerald-600" /> Pagamento retido até confirmar que o serviço foi concluído.</p>
        </div>
      )}
      {error && <p className="text-[15px] font-medium text-red-600">{error}</p>}

      {escrowOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/40 sm:items-center sm:p-4" onClick={() => setEscrowOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-2xl sm:p-7" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mb-5 flex items-start justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Lock size={22} /></span>
              <button onClick={() => setEscrowOpen(false)} aria-label="Fechar" className="rounded-lg p-2 text-ink-400 hover:bg-cloud-100"><X size={20} /></button>
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-ink-900">O seu dinheiro fica protegido</h3>
            <p className="mt-2 text-base leading-relaxed text-ink-500">
              O valor de <strong className="text-ink-900">{formatKz(total)}</strong> fica retido pela AUTONOMOUS e só é enviado ao profissional quando confirmar que o serviço foi concluído.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Btn variant="outline" onClick={() => setEscrowOpen(false)}>Cancelar</Btn>
              <Btn onClick={() => { setEscrowOpen(false); setChoosing(true); }}>Continuar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MethodRow({ icon: Icon, title, desc, onClick, busy, disabled, muted }: {
  icon: typeof Receipt; title: string; desc: string; onClick: () => void; busy?: boolean; disabled?: boolean; muted?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex w-full items-center gap-4 bg-white px-4 py-4 text-left transition-colors hover:bg-cloud-50 disabled:opacity-60">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${muted ? 'bg-amber-50 text-amber-700' : 'bg-cloud-100 text-brand-dark'}`}><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink-900">{title}</span>
        <span className="block text-sm text-ink-500">{desc}</span>
      </span>
      {busy ? <Loader2 size={18} className="animate-spin text-ink-400" /> : <ChevronRight size={18} className="text-ink-300" />}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cloud-100 px-3.5 py-2.5">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="font-display text-lg font-semibold tracking-wide text-ink-900">{value}</p>
    </div>
  );
}
