import type { Broadcast } from './broadcasts';
import type { Tone } from '../components/app/ui';

export type Stage =
  | 'searching' | 'visit_dates' | 'visit_requested' | 'visit_scheduled'
  | 'quote_pending' | 'quote_sent' | 'quote_rejected'
  | 'in_progress' | 'awaiting_confirmation' | 'awaiting_payment' | 'payment_review'
  | 'completed' | 'cancelled' | 'no_providers' | 'expired';

export function stageOf(b: Broadcast): Stage {
  if (b.status === 'open') return 'searching';
  if (b.status === 'accepted') {
    if (b.visit_status === 'requested') return (b.visit_slots?.length ?? 0) > 0 ? 'visit_requested' : 'visit_dates';
    if (b.visit_status === 'scheduled') return 'visit_scheduled';
    if (b.quote_status === 'sent') return 'quote_sent';
    if (b.quote_status === 'rejected') return 'quote_rejected';
    if (b.quote_status !== 'accepted') return 'quote_pending';
    if (!b.provider_done_at) return 'in_progress';
    if (!b.client_confirmed_at) return 'awaiting_confirmation';
    return b.payment_status === 'submitted' ? 'payment_review' : 'awaiting_payment';
  }
  return b.status as Stage;
}

type Label = { label: string; tone: Tone; action?: boolean };

const CLIENT: Record<Stage, Label> = {
  searching: { label: 'À procura', tone: 'brand' },
  visit_dates: { label: 'A aguardar datas da visita', tone: 'neutral' },
  visit_requested: { label: 'Agende a visita', tone: 'warning', action: true },
  visit_scheduled: { label: 'Visita agendada', tone: 'brand' },
  quote_pending: { label: 'A aguardar orçamento', tone: 'neutral' },
  quote_sent: { label: 'Orçamento recebido', tone: 'warning', action: true },
  quote_rejected: { label: 'A aguardar novo orçamento', tone: 'neutral' },
  in_progress: { label: 'Em curso', tone: 'brand' },
  awaiting_confirmation: { label: 'Confirme a conclusão', tone: 'warning', action: true },
  awaiting_payment: { label: 'Por pagar', tone: 'warning', action: true },
  payment_review: { label: 'Pagamento em verificação', tone: 'brand' },
  completed: { label: 'Concluído', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  no_providers: { label: 'Sem profissionais', tone: 'danger' },
  expired: { label: 'Sem resposta', tone: 'neutral' },
};

const PROVIDER: Record<Stage, Label> = {
  searching: { label: 'Disponível', tone: 'brand' },
  visit_dates: { label: 'Proponha novas datas', tone: 'warning', action: true },
  visit_requested: { label: 'A aguardar agendamento', tone: 'neutral' },
  visit_scheduled: { label: 'Visita agendada', tone: 'warning', action: true },
  quote_pending: { label: 'Enviar orçamento', tone: 'warning', action: true },
  quote_sent: { label: 'Orçamento enviado', tone: 'neutral' },
  quote_rejected: { label: 'Orçamento recusado', tone: 'danger', action: true },
  in_progress: { label: 'Em curso', tone: 'brand', action: true },
  awaiting_confirmation: { label: 'A aguardar confirmação', tone: 'neutral' },
  awaiting_payment: { label: 'A aguardar pagamento', tone: 'neutral' },
  payment_review: { label: 'Pagamento em verificação', tone: 'neutral' },
  completed: { label: 'Concluído', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  no_providers: { label: 'Fechado', tone: 'neutral' },
  expired: { label: 'Expirado', tone: 'neutral' },
};

export function stageLabel(b: Broadcast, asProvider: boolean): Label {
  const s = stageOf(b);
  if (!asProvider && s === 'completed' && b.status === 'completed') return CLIENT.completed;
  if (asProvider && s === 'completed') return { label: 'Pago · no saldo', tone: 'success' };
  if (!asProvider && s === 'awaiting_payment' && b.payment_status === 'rejected') return { label: 'Reenvie o comprovativo', tone: 'danger', action: true };
  return (asProvider ? PROVIDER : CLIENT)[s];
}

export function isActive(b: Broadcast) {
  return b.status === 'open' || b.status === 'accepted';
}
