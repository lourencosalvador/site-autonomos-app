import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, sqlError } from '../_shared/http.ts';
import { createCharge, getCharge, missingConfig, type GatewayRequest, type Method } from '../_shared/appypay.ts';

/**
 * Pagamento de um pedido pela app (cliente com sessão iniciada).
 *
 *   POST /appypay-charge   { request_id, method: 'REF' | 'GPO', phone? }
 *     REF → devolve logo { reference: { entity, number, due_at } } para pagar no ATM / Express / homebanking.
 *     GPO → envia o pedido para a app Multicaixa Express do telefone indicado; o estado fica "pending"
 *           até o cliente aprovar (o webhook confirma).
 *   GET  /appypay-charge?id=<charge_id>   estado atual (a app pode consultar enquanto espera).
 *
 * O valor cobrado é SEMPRE o `client_total` do pedido, calculado no servidor.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: auth } = await userClient.auth.getUser();
  if (!auth?.user) return json({ error: 'unauthorized' }, 401);
  const userId = auth.user.id;

  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // ---------- Estado ----------
  if (req.method === 'GET') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'missing_id' }, 400);
    const { data, error } = await service.rpc('pay_get_charge_for_user', { p_user: userId, p_charge_id: id });
    if (error) return sqlError(error.message);

    if (data.should_verify && missingConfig().length === 0) {
      try {
        const result = await getCharge(data.appypay_id);
        if (result.ok) {
          const updated = await service.rpc('pay_record_gateway', { p_charge_id: id, p_source: 'verify', p_gateway: result });
          if (!updated.error) return json({ charge: publicView(updated.data) });
        }
      } catch {
        // AppyPay indisponível: devolve o último estado conhecido
      }
    }
    return json({ charge: publicView(data) });
  }

  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // ---------- Nova cobrança ----------
  let body: { request_id?: string; method?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const method = String(body.method ?? '').toUpperCase() as Method;
  if (method !== 'REF' && method !== 'GPO') return json({ error: 'invalid_method' }, 400);
  if (!body.request_id) return json({ error: 'missing_request_id' }, 400);
  if (missingConfig(method).length) return json({ error: 'payments_unavailable' }, 503);

  const prepared = await service.rpc('pay_prepare_charge', {
    p_user: userId,
    p_request_id: body.request_id,
    p_method: method,
    p_phone: body.phone ?? null,
  });
  if (prepared.error) return sqlError(prepared.error.message);
  if (prepared.data.reuse) return json({ charge: prepared.data.charge, reused: true });

  const chargeId: string = prepared.data.charge.id;
  let result;
  try {
    result = await createCharge(prepared.data.gateway_request as GatewayRequest);
  } catch (e) {
    // Sem resposta: fica pendente e expira sozinha se nunca for confirmada.
    await service.rpc('pay_record_gateway', {
      p_charge_id: chargeId,
      p_source: 'create',
      p_gateway: { ok: false, http_status: 0, message: `Sem resposta da AppyPay: ${(e as Error).message}` },
    });
    return json({ error: 'gateway_unavailable', charge_id: chargeId }, 502);
  }

  const saved = await service.rpc('pay_record_gateway', { p_charge_id: chargeId, p_source: 'create', p_gateway: result });
  if (saved.error) return sqlError(saved.error.message);
  const charge = publicView(saved.data);
  return json({ charge }, charge.status === 'failed' ? 422 : 200);
});

// deno-lint-ignore no-explicit-any
function publicView(c: any) {
  const { appypay_id: _a, should_verify: _s, ...rest } = c ?? {};
  return rest;
}
