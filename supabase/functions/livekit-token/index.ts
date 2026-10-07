import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AccessToken } from 'npm:livekit-server-sdk@2';
import { corsHeaders, json } from '../_shared/http.ts';

/**
 * Gera um token de acesso ao LiveKit para a chamada de voz de um pedido.
 *
 *   POST /livekit-token   { request_id }
 *   → { url, token, room, identity }
 *
 * Só os dois participantes do pedido (cliente e prestador), e só quando o pedido
 * está aceite/concluído, recebem token. A sala é `call_<request_id>`. O segredo
 * do LiveKit fica no servidor — nunca vai para o browser.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const LK_URL = Deno.env.get('LIVEKIT_URL');
  const LK_KEY = Deno.env.get('LIVEKIT_API_KEY');
  const LK_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
  if (!LK_URL || !LK_KEY || !LK_SECRET) return json({ error: 'livekit_not_configured' }, 503);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: auth } = await userClient.auth.getUser();
  if (!auth?.user) return json({ error: 'unauthorized' }, 401);
  const userId = auth.user.id;

  let body: { request_id?: string };
  try { body = await req.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const requestId = body.request_id;
  if (!requestId) return json({ error: 'missing_request_id' }, 400);

  // Confirma a participação e o estado do pedido com a service role.
  const service = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: b, error } = await service
    .from('service_broadcasts')
    .select('id, client_id, provider_id, status')
    .eq('id', requestId)
    .maybeSingle();
  if (error) return json({ error: 'server_error' }, 500);
  if (!b) return json({ error: 'not_found' }, 404);
  if (b.client_id !== userId && b.provider_id !== userId) return json({ error: 'forbidden' }, 403);
  if (b.status !== 'accepted' && b.status !== 'completed') return json({ error: 'not_active' }, 409);

  // Nome para mostrar na chamada.
  const { data: prof } = await service.from('profiles').select('name').eq('id', userId).maybeSingle();

  const room = `call_${requestId}`;
  const at = new AccessToken(LK_KEY, LK_SECRET, { identity: userId, name: prof?.name ?? undefined, ttl: '2h' });
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
  const token = await at.toJwt();

  return json({ url: LK_URL, token, room, identity: userId });
});
