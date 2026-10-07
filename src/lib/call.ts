import { supabase } from './supabase';

export type CallToken = { url: string; token: string; room: string; identity: string };

/** Pede à Edge Function um token de chamada para este pedido. */
export async function getCallToken(requestId: string): Promise<CallToken> {
  const { data, error } = await supabase.functions.invoke('livekit-function', {
    body: { request_id: requestId },
  });
  if (error) {
    let code = 'call_failed';
    try {
      const ctx = (error as { context?: Response }).context;
      const body = ctx ? await ctx.json() : null;
      if (body?.error) code = body.error;
    } catch { /* mantém call_failed */ }
    throw new Error(code);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as CallToken;
}

/** Mensagens amigáveis para os erros da chamada. */
export function callErrorMessage(code: string): string {
  switch (code) {
    case 'livekit_not_configured': return 'A chamada por voz ainda não está configurada.';
    case 'not_active': return 'Este pedido já não está ativo.';
    case 'forbidden': return 'Não faz parte desta conversa.';
    case 'not_found': return 'Pedido não encontrado.';
    case 'unauthorized': return 'Sessão expirada. Entre novamente.';
    default: return 'Não foi possível iniciar a chamada. Tente novamente.';
  }
}
