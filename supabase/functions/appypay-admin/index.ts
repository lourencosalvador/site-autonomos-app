import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, sqlError } from '../_shared/http.ts';
import {
  createCharge, environmentLabel, getCharge, missingConfig, refundCharge, type GatewayRequest,
} from '../_shared/appypay.ts';

/**
 * Ações do painel de administração que falam com a AppyPay.
 * Autenticação: cabeçalho `x-admin-token` (o token de sessão do painel), validado na BD.
 *
 *   { action: 'status' }                          → AppyPay configurada? ambiente?
 *   { action: 'create', charge: {...} }           → cobrança manual (REF com SMS ou Express)
 *   { action: 'verify', id }                      → pergunta o estado à AppyPay e atualiza
 *   { action: 'refund', id }                      → reembolso total (só Multicaixa Express)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = req.headers.get('x-admin-token');
  if (!token) return json({ error: 'invalid_session' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  // As funções admin_* só aceitam o papel público (com token); as pay_* só a service role.
  const publicClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const session = await publicClient.rpc('admin_session', { p_token: token });
  if (session.error) return sqlError(session.error.message);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  switch (body?.action) {
    case 'status': {
      return json({
        environment: environmentLabel(),
        ref: missingConfig('REF').length === 0,
        gpo: missingConfig('GPO').length === 0,
        webhook: Boolean(Deno.env.get('APPYPAY_WEBHOOK_SECRET')),
        missing: [...new Set([...missingConfig('REF'), ...missingConfig('GPO'),
          ...(Deno.env.get('APPYPAY_WEBHOOK_SECRET') ? [] : ['APPYPAY_WEBHOOK_SECRET'])])],
      });
    }

    case 'create': {
      const method = String(body.charge?.method ?? '').toUpperCase();
      if (method !== 'REF' && method !== 'GPO') return json({ error: 'invalid_method' }, 400);
      if (missingConfig(method).length) return json({ error: 'payments_unavailable' }, 503);

      const prepared = await publicClient.rpc('admin_prepare_charge', { p_token: token, p_charge: body.charge });
      if (prepared.error) return sqlError(prepared.error.message);
      const chargeId: string = prepared.data.charge.id;

      let result;
      try {
        result = await createCharge(prepared.data.gateway_request as GatewayRequest);
      } catch (e) {
        await service.rpc('pay_record_gateway', {
          p_charge_id: chargeId, p_source: 'create',
          p_gateway: { ok: false, http_status: 0, message: `Sem resposta da AppyPay: ${(e as Error).message}` },
        });
        return json({ error: 'gateway_unavailable', charge_id: chargeId }, 502);
      }
      const saved = await service.rpc('pay_record_gateway', { p_charge_id: chargeId, p_source: 'create', p_gateway: result });
      if (saved.error) return sqlError(saved.error.message);
      return json({ charge: saved.data, gateway_message: result.message });
    }

    case 'verify':
    case 'refund': {
      if (!body.id) return json({ error: 'missing_id' }, 400);
      if (missingConfig().length) return json({ error: 'payments_unavailable' }, 503);
      const info = await publicClient.rpc('admin_charge_for_gateway', { p_token: token, p_id: body.id, p_action: body.action });
      if (info.error) return sqlError(info.error.message);
      const c = info.data;
      if (!c.appypay_id) return json({ error: 'no_gateway_id' }, 409);

      if (body.action === 'refund') {
        if (c.method !== 'GPO') return json({ error: 'refund_not_supported' }, 409);
        if (c.status !== 'success') return json({ error: 'not_paid' }, 409);
      }

      let result;
      try {
        result = body.action === 'refund'
          ? await refundCharge(c.appypay_id, `Reembolso ${c.merchant_tx_id}`)
          : await getCharge(c.appypay_id);
      } catch {
        return json({ error: 'gateway_unavailable' }, 502);
      }
      if (!result.ok) return json({ error: 'gateway_error', http_status: result.http_status, message: result.message }, 502);

      const saved = await service.rpc('pay_record_gateway', {
        p_charge_id: c.id,
        p_source: body.action === 'refund' ? 'refund' : 'verify',
        p_gateway: { ...result, message: result.message ?? (body.action === 'refund' ? `Reembolso pedido por ${c.admin}` : null) },
      });
      if (saved.error) return sqlError(saved.error.message);
      return json({ charge: saved.data, gateway_message: result.message });
    }

    default:
      return json({ error: 'invalid_action' }, 400);
  }
});
