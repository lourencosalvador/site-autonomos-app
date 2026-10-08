import { supabase } from './supabase';

export type PaymentMethod = 'REF' | 'GPO';

export type Charge = {
  id: string;
  method: PaymentMethod;
  status: 'pending' | 'success' | 'failed' | 'expired' | 'cancelled' | 'refunded';
  amount_minor: number;
  amount: number;
  currency: string;
  reference: { entity: string | null; number: string | null; due_at: string | null } | null;
  message: string | null;
  created_at: string;
  paid_at: string | null;
};

export function formatKz(minor: number): string {
  const v = Math.round((minor ?? 0) / 100);
  return `${v.toLocaleString('pt-PT').replace(/,/g, '.')} Kz`;
}

export function payErrorMessage(code: string): string {
  switch (code) {
    case 'payments_unavailable': return 'Pagamentos ainda não configurados (AppyPay).';
    case 'gateway_unavailable': return 'A AppyPay não respondeu. Tente novamente dentro de instantes.';
    case 'invalid_phone': return 'Número inválido. Use 9XXXXXXXX.';
    case 'already_paid': return 'Este serviço já está pago.';
    case 'charge_in_progress': return 'Já há um pagamento em curso. Aguarde um momento.';
    case 'request_closed': return 'Este pedido já não aceita pagamento.';
    case 'forbidden': return 'Sem permissão para pagar este pedido.';
    case 'unauthorized': return 'Sessão expirada. Entre novamente.';
    default: return 'Não foi possível iniciar o pagamento. Tente novamente.';
  }
}

export async function payTestBroadcast(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('pay_test_broadcast', { p_id: requestId });
  if (error) throw error;
}

export async function prepareBroadcastPayment(requestId: string, method: PaymentMethod, phone?: string): Promise<Charge> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('unauthorized');
  const { data, error } = await supabase.functions.invoke('broadcast-pay', {
    body: { request_id: requestId, method, phone: phone ?? null },
  });
  if (error) {
    let code = 'pay_failed';
    try {
      const ctx = (error as { context?: Response }).context;
      const body = ctx ? await ctx.json() : null;
      if (body?.error) code = body.error;
    } catch {}
    throw new Error(code);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { charge: Charge }).charge;
}
