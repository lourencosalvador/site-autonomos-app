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

export type IncomingCall = {
  broadcastId: string;
  fromId: string;
  fromName: string;
  fromAvatar: string | null;
};

/** Avisa o outro utilizador (toque) de que está a receber uma chamada. */
export async function notifyIncomingCall(calleeId: string, payload: IncomingCall): Promise<void> {
  const ch = supabase.channel(`calls:${calleeId}`);
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); });
  });
  await ch.send({ type: 'broadcast', event: 'ring', payload });
  setTimeout(() => { void supabase.removeChannel(ch); }, 1500);
}

/** Envia um sinal de "cancelado/recusado/terminado" para o canal de chamadas de um utilizador. */
export async function notifyCallEvent(targetUserId: string, event: 'cancel' | 'decline', payload: { broadcastId: string }): Promise<void> {
  const ch = supabase.channel(`calls:${targetUserId}`);
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); });
  });
  await ch.send({ type: 'broadcast', event, payload });
  setTimeout(() => { void supabase.removeChannel(ch); }, 1500);
}

/** Ouve chamadas recebidas (e cancelamentos) dirigidas a este utilizador. */
export function subscribeIncomingCalls(
  userId: string,
  handlers: { onRing: (c: IncomingCall) => void; onCancel?: (broadcastId: string) => void },
): () => void {
  const ch = supabase
    .channel(`calls:${userId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'ring' }, ({ payload }) => handlers.onRing(payload as IncomingCall))
    .on('broadcast', { event: 'cancel' }, ({ payload }) => handlers.onCancel?.((payload as { broadcastId: string }).broadcastId))
    .subscribe();
  return () => { void supabase.removeChannel(ch); };
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
