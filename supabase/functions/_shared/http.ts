export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Erros conhecidos das funções SQL → resposta HTTP com um código estável para a app/painel. */
const KNOWN: Record<string, number> = {
  invalid_method: 400,
  invalid_phone: 400,
  invalid_amount: 400,
  amount_not_set: 409,
  already_paid: 409,
  request_closed: 409,
  charge_in_progress: 409,
  unsupported_currency: 409,
  not_pending: 409,
  request_not_found: 404,
  charge_not_found: 404,
  not_found: 404,
  forbidden: 403,
  invalid_session: 401,
};

export function sqlError(message: string) {
  const code = Object.keys(KNOWN).find((k) => message.includes(k));
  return code ? json({ error: code }, KNOWN[code]) : json({ error: 'server_error' }, 500);
}

/** Comparação de segredos em tempo constante. */
export function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
