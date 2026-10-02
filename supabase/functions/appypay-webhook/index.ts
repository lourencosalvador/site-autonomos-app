import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, safeEqual } from '../_shared/http.ts';
import { getCharge, missingConfig } from '../_shared/appypay.ts';

/**
 * Webhook da AppyPay (configurar no Web App AppyPay → Webhooks):
 *   https://<PROJECT_REF>.supabase.co/functions/v1/appypay-webhook?secret=<APPYPAY_WEBHOOK_SECRET>
 *
 * Nunca confia no conteúdo recebido: usa-o só para saber QUAL cobrança mudou e volta a perguntar
 * o estado à AppyPay (GET /charges/{id}) antes de marcar um pagamento como confirmado.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const expected = Deno.env.get('APPYPAY_WEBHOOK_SECRET') ?? '';
  const given = new URL(req.url).searchParams.get('secret') ?? req.headers.get('x-webhook-secret') ?? '';
  if (!expected || !safeEqual(given, expected)) return json({ error: 'unauthorized' }, 401);
  if (missingConfig().length) return json({ error: 'payments_unavailable' }, 503);

  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const gatewayId: string | null = event?.id ?? event?.chargeId ?? event?.transactionId ?? null;
  const merchantTx: string | null = event?.merchantTransactionId ?? null;
  if (!gatewayId && !merchantTx) return json({ ignored: true, reason: 'no_identifier' });

  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const found = await service.rpc('pay_find_charge', { p_appypay_id: gatewayId, p_merchant_tx: merchantTx });
  if (found.error) return json({ error: 'server_error' }, 500);
  const charge = found.data;
  if (!charge) return json({ ignored: true, reason: 'unknown_charge' });

  const appypayId: string | null = charge.appypay_id ?? gatewayId;
  if (!appypayId) return json({ ignored: true, reason: 'no_gateway_id' });

  let verified;
  try {
    verified = await getCharge(appypayId);
  } catch {
    // AppyPay indisponível → 5xx para a AppyPay voltar a tentar mais tarde
    return json({ error: 'gateway_unavailable' }, 502);
  }
  if (!verified.ok) return json({ ignored: true, reason: `verify_${verified.http_status}` });

  const saved = await service.rpc('pay_record_gateway', {
    p_charge_id: charge.id,
    p_source: 'webhook',
    p_gateway: { ...verified, raw: { webhook: event, verified: verified.raw } },
  });
  if (saved.error) return json({ error: 'server_error' }, 500);
  return json({ ok: true, status: saved.data.status });
});
