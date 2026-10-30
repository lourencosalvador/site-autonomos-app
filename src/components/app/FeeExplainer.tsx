import { Info } from 'lucide-react';
import { feeBreakdown, pct, usePaymentInfo } from '../../lib/settings';
import { formatKz } from '../../lib/payments';
import { cx } from './ui';

const EXAMPLE = 1000000;

export function FeeExplainer({ audience, className }: { audience: 'client' | 'professional' | 'both'; className?: string }) {
  const info = usePaymentInfo();
  const f = feeBreakdown(EXAMPLE, info);
  const showClient = audience !== 'professional';
  const showPro = audience !== 'client';
  return (
    <div className={cx('rounded-2xl border border-line bg-white p-5 sm:p-6', className)}>
      <div className="flex items-center gap-2">
        <Info size={18} className="text-brand-dark" />
        <h3 className="text-base font-semibold text-ink-900">Como funcionam as taxas</h3>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
        O profissional define o valor do serviço no orçamento. A AUTONOMOUS cobra
        {showClient && <> <strong className="text-ink-900">{pct(info.client_fee_rate)} ao cliente</strong></>}
        {showClient && showPro && ' e'}
        {showPro && <> <strong className="text-ink-900">{pct(info.provider_fee_rate)} ao profissional</strong></>}
        {' '}sobre esse valor. Tudo é mostrado antes de o cliente aceitar.
      </p>
      <p className="mt-4 text-sm font-medium text-ink-400">Exemplo: serviço de {formatKz(EXAMPLE)}</p>
      <dl className="mt-2 divide-y divide-line rounded-xl border border-line">
        {showClient && (
          <>
            <Row label="Taxa de serviço (paga pelo cliente)" value={`+ ${formatKz(f.clientFee)}`} />
            <Row label="O cliente paga" value={formatKz(f.clientTotal)} strong />
          </>
        )}
        {showPro && (
          <>
            <Row label="Comissão (descontada ao profissional)" value={`− ${formatKz(f.providerFee)}`} />
            <Row label="O profissional recebe" value={formatKz(f.providerNet)} strong />
          </>
        )}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-ink-400">
        O cliente paga depois de o serviço estar concluído, por transferência para a AUTONOMOUS. O valor do profissional é transferido para o IBAN indicado no perfil.
      </p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className={cx('text-[15px]', strong ? 'font-semibold text-ink-900' : 'text-ink-500')}>{label}</dt>
      <dd className={cx('shrink-0 text-[15px] tabular-nums', strong ? 'font-semibold text-ink-900' : 'text-ink-700')}>{value}</dd>
    </div>
  );
}
