import type { MoneyCtx } from './types';

/**
 * Valores em `payments`, `requests`, `withdrawals` e `payment_charges` estão em unidades mínimas
 * (cêntimos, `factor` = 100) — o fator vem da configuração de pagamentos na BD.
 */
// useGrouping 'always': em pt-PT os números de 4 dígitos não levam separador (1500 vs 15 000) — fica igual em todos.
const kz = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions);
const kzCompact = new Intl.NumberFormat('pt-PT', { notation: 'compact', maximumFractionDigits: 1 });

export function toMajor(minor: number | null | undefined, factor = 100) {
  return Number(minor ?? 0) / (factor || 1);
}

export function formatMoney(minor: number | null | undefined, ctx: Partial<MoneyCtx> = {}) {
  const value = toMajor(minor, ctx.factor ?? 100);
  const currency = (ctx.currency ?? 'AOA').toUpperCase();
  if (currency === 'AOA') return `${kz.format(value)} Kz`;
  try {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(value);
  } catch {
    return `${kz.format(value)} ${currency}`;
  }
}

/** Para eixos de gráficos: "1,2 mil", "3,4 M". */
export function formatMoneyCompact(minor: number, factor = 100) {
  return kzCompact.format(toMajor(minor, factor));
}

export const METHOD_LABELS: Record<string, string> = {
  REF: 'Referência',
  GPO: 'Multicaixa Express',
  APPYPAY: 'AppyPay',
  STRIPE: 'Cartão (Stripe)',
  OUTRO: 'Outro',
};

export const methodLabel = (m?: string | null) => (m ? METHOD_LABELS[m] ?? m : '—');

export const CHARGE_STATUS: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' | 'brand' }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  success: { label: 'Paga', tone: 'success' },
  failed: { label: 'Falhada', tone: 'danger' },
  expired: { label: 'Expirada', tone: 'neutral' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
  refunded: { label: 'Reembolsada', tone: 'brand' },
};

/** Estados de saque: os nomes vêm da app; traduz os mais comuns e mostra os restantes como estão. */
export function withdrawalStatus(status?: string | null): { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' | 'brand' } {
  const s = (status ?? '').toLowerCase();
  if (['pending', 'requested', 'pendente'].includes(s)) return { label: 'Pendente', tone: 'warning' };
  if (['processing', 'in_progress', 'em_processamento', 'approved'].includes(s)) return { label: 'Em processamento', tone: 'brand' };
  if (['paid', 'completed', 'succeeded', 'done', 'pago'].includes(s)) return { label: 'Pago', tone: 'success' };
  if (['failed', 'error', 'falhou'].includes(s)) return { label: 'Falhou', tone: 'danger' };
  if (['cancelled', 'canceled', 'rejected', 'cancelado'].includes(s)) return { label: 'Cancelado', tone: 'neutral' };
  return { label: status || '—', tone: 'neutral' };
}

export const SOURCE_LABELS: Record<string, string> = {
  create: 'Criada',
  webhook: 'Aviso da AppyPay',
  verify: 'Verificação',
  admin: 'Painel',
  settle: 'Registo do pagamento',
  refund: 'Reembolso',
};
