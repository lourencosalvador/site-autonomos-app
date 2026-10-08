import { supabase } from './supabase';

export type CallToken = { url: string; token: string; room: string; identity: string };

async function invokeToken(requestId: string): Promise<{ data: unknown; code: string | null }> {
  const { data, error } = await supabase.functions.invoke('livekit-function', {
    body: { request_id: requestId },
  });
  if (error) {
    let code = 'call_failed';
    try {
      const ctx = (error as { context?: Response }).context;
      const body = ctx ? await ctx.json() : null;
      if (body?.error) code = body.error;
    } catch {}
    return { data: null, code };
  }
  if ((data as { error?: string })?.error) return { data: null, code: (data as { error: string }).error };
  return { data, code: null };
}

export async function getCallToken(requestId: string): Promise<CallToken> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('unauthorized');

  let res = await invokeToken(requestId);

  if (res.code === 'unauthorized') {
    try { await supabase.auth.refreshSession(); } catch {}
    const { data: { session: s2 } } = await supabase.auth.getSession();
    if (!s2) throw new Error('unauthorized');
    res = await invokeToken(requestId);
  }
  if (res.code) throw new Error(res.code);
  return res.data as CallToken;
}

export type IncomingCall = {
  broadcastId: string;
  fromId: string;
  fromName: string;
  fromAvatar: string | null;
};

export async function notifyIncomingCall(calleeId: string, payload: IncomingCall): Promise<void> {
  const ch = supabase.channel(`calls:${calleeId}`);
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); });
  });
  await ch.send({ type: 'broadcast', event: 'ring', payload });
  setTimeout(() => { void supabase.removeChannel(ch); }, 1500);
}

export async function notifyCallEvent(targetUserId: string, event: 'cancel' | 'decline', payload: { broadcastId: string }): Promise<void> {
  const ch = supabase.channel(`calls:${targetUserId}`);
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); });
  });
  await ch.send({ type: 'broadcast', event, payload });
  setTimeout(() => { void supabase.removeChannel(ch); }, 1500);
}

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
