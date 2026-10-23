import type { Broadcast } from './broadcasts';
import type { Tone } from '../components/app/ui';

export type Stage =
  | 'searching' | 'quote_pending' | 'quote_sent' | 'quote_rejected' | 'awaiting_payment'
  | 'in_progress' | 'awaiting_confirmation' | 'completed' | 'cancelled' | 'no_providers' | 'expired';

export function stageOf(b: Broadcast): Stage {
  if (b.status === 'open') return 'searching';
  if (b.status === 'accepted') {
    if (b.payment_status === 'unpaid') {
      switch (b.quote_status) {
        case 'sent': return 'quote_sent';
        case 'rejected': return 'quote_rejected';
        case 'accepted': return 'awaiting_payment';
        default: return 'quote_pending';
      }
    }
    return b.provider_done_at ? 'awaiting_confirmation' : 'in_progress';
  }
  return b.status as Stage;
}

type Label = { label: string; tone: Tone; action?: boolean };

const CLIENT: Record<Stage, Label> = {
  searching: { label: 'À procura', tone: 'brand' },
  quote_pending: { label: 'A aguardar orçamento', tone: 'neutral' },
  quote_sent: { label: 'Orçamento recebido', tone: 'warning', action: true },
  quote_rejected: { label: 'A aguardar novo orçamento', tone: 'neutral' },
  awaiting_payment: { label: 'Por pagar', tone: 'warning', action: true },
  in_progress: { label: 'Em curso', tone: 'brand' },
  awaiting_confirmation: { label: 'Confirme a conclusão', tone: 'warning', action: true },
  completed: { label: 'Concluído', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  no_providers: { label: 'Sem profissionais', tone: 'danger' },
  expired: { label: 'Sem resposta', tone: 'neutral' },
};

const PROVIDER: Record<Stage, Label> = {
  searching: { label: 'Disponível', tone: 'brand' },
  quote_pending: { label: 'Enviar orçamento', tone: 'warning', action: true },
  quote_sent: { label: 'Orçamento enviado', tone: 'neutral' },
  quote_rejected: { label: 'Orçamento recusado', tone: 'danger', action: true },
  awaiting_payment: { label: 'A aguardar pagamento', tone: 'neutral' },
  in_progress: { label: 'Pago · em curso', tone: 'brand', action: true },
  awaiting_confirmation: { label: 'A aguardar confirmação', tone: 'neutral' },
  completed: { label: 'Concluído', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  no_providers: { label: 'Fechado', tone: 'neutral' },
  expired: { label: 'Expirado', tone: 'neutral' },
};

export function stageLabel(b: Broadcast, asProvider: boolean): Label {
  const s = stageOf(b);
  if (asProvider && s === 'quote_pending' && b.quote_status === 'onsite') return { label: 'Orçamento no local', tone: 'warning', action: true };
  return (asProvider ? PROVIDER : CLIENT)[s];
}

export function isActive(b: Broadcast) {
  return b.status === 'open' || b.status === 'accepted';
}
