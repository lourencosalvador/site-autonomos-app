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
        {audience === 'client' && <>O profissional define o valor do serviço no orçamento. A AUTONOMOUS acrescenta uma <strong className="text-ink-900">taxa de solicitação de {pct(info.client_fee_rate)}</strong>. Vê o total antes de aceitar.</>}
        {audience === 'professional' && <>Define o valor do serviço no orçamento. A AUTONOMOUS desconta uma <strong className="text-ink-900">taxa de {pct(info.provider_fee_rate)}</strong> sobre esse valor.</>}
        {audience === 'both' && <>O profissional define o valor do serviço no orçamento. O cliente paga uma <strong className="text-ink-900">taxa de solicitação de {pct(info.client_fee_rate)}</strong> e ao profissional é descontada uma <strong className="text-ink-900">taxa de {pct(info.provider_fee_rate)}</strong>.</>}
      </p>
      <p className="mt-4 text-sm font-medium text-ink-400">Exemplo: serviço de {formatKz(EXAMPLE)}</p>
      <dl className="mt-2 divide-y divide-line rounded-xl border border-line">
        <Row label="Valor do serviço" value={formatKz(f.service)} />
        {showClient && (
          <>
            <Row label={`Taxa de solicitação AUTONOMOUS (${pct(info.client_fee_rate)})`} value={`+ ${formatKz(f.clientFee)}`} />
            <Row label={audience === 'client' ? 'Total a pagar' : 'Total a pagar pelo cliente'} value={formatKz(f.clientTotal)} strong />
          </>
        )}
        {showPro && (
          <>
            <Row label={`Taxa AUTONOMOUS (${pct(info.provider_fee_rate)})`} value={`− ${formatKz(f.providerFee)}`} />
            <Row label={audience === 'professional' ? 'Valor a receber' : 'Valor a receber pelo profissional'} value={formatKz(f.providerNet)} strong />
          </>
        )}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-ink-400">
        {audience === 'professional'
          ? 'O valor a receber entra no saldo da carteira quando confirmamos o pagamento do cliente e pode ser sacado a qualquer momento.'
          : audience === 'client'
            ? 'Só paga depois de o serviço estar concluído, por transferência para a AUTONOMOUS.'
            : 'O cliente paga depois de o serviço estar concluído. O valor do profissional entra no saldo da carteira e pode ser sacado a qualquer momento.'}
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
