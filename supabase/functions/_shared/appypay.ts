/**
 * Cliente mínimo da AppyPay Payment Gateway (v2.0).
 * Documentação: https://appypay.stoplight.io/docs/appypay-payment-gateway/
 *
 * Secrets (supabase secrets set ...):
 *   APPYPAY_CLIENT_ID, APPYPAY_CLIENT_SECRET   credenciais da aplicação (Web App AppyPay → API credentials)
 *   APPYPAY_METHOD_REF                          ex.: REF_xxxxxxxx-...  (Pagamento por Referência)
 *   APPYPAY_METHOD_GPO                          ex.: GPO_xxxxxxxx-...  (Multicaixa Express)
 *   APPYPAY_WEBHOOK_SECRET                      segredo que vai no URL do webhook
 * Opcionais:
 *   APPYPAY_BASE_URL   (padrão produção: https://gwy-api.appypay.co.ao/v2.0 ; testes: https://gwy-api-tst.appypay.co.ao/v2.0)
 *   APPYPAY_TOKEN_URL  (padrão: https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token)
 *   APPYPAY_RESOURCE   (padrão: bee57785-7a19-4f1c-9c8d-aa03f2f0e333)
 */

export type Method = 'REF' | 'GPO';

/** Corpo preparado pelo SQL (private.gateway_request). */
export type GatewayRequest = {
  merchantTransactionId: string;
  amount: number;
  currency: 'AOA';
  description: string;
  method: Method;
  phoneNumber: string | null;
  notify: { name: string; telephone: string; smsNotification: boolean } | null;
};

/** Resposta normalizada que o SQL (pay_record_gateway) entende. */
export type GatewayResult = {
  ok: boolean;
  http_status: number;
  appypay_id: string | null;
  status: 'Requested' | 'Pending' | 'Success' | 'Failed' | null;
  code: number | null;
  message: string | null;
  reference: { entity: string | null; number: string | null; due_at: string | null } | null;
  raw: unknown;
};

const env = (key: string, fallback = '') => Deno.env.get(key) ?? fallback;

export function appyConfig() {
  return {
    baseUrl: env('APPYPAY_BASE_URL', 'https://gwy-api.appypay.co.ao/v2.0').replace(/\/+$/, ''),
    tokenUrl: env('APPYPAY_TOKEN_URL', 'https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token'),
    clientId: env('APPYPAY_CLIENT_ID'),
    clientSecret: env('APPYPAY_CLIENT_SECRET'),
    resource: env('APPYPAY_RESOURCE', 'bee57785-7a19-4f1c-9c8d-aa03f2f0e333'),
    methods: { REF: env('APPYPAY_METHOD_REF'), GPO: env('APPYPAY_METHOD_GPO') } as Record<Method, string>,
  };
}

/** O que falta configurar (vazio = pronto). */
export function missingConfig(method?: Method): string[] {
  const c = appyConfig();
  const missing: string[] = [];
  if (!c.clientId) missing.push('APPYPAY_CLIENT_ID');
  if (!c.clientSecret) missing.push('APPYPAY_CLIENT_SECRET');
  if (method === 'REF' && !c.methods.REF) missing.push('APPYPAY_METHOD_REF');
  if (method === 'GPO' && !c.methods.GPO) missing.push('APPYPAY_METHOD_GPO');
  return missing;
}

/* ---------------- Token (client credentials, cache em memória) ---------------- */

let cached: { token: string; expiresAt: number } | null = null;

async function getToken(force = false): Promise<string> {
  if (!force && cached && cached.expiresAt > Date.now()) return cached.token;
  const c = appyConfig();
  const res = await fetch(c.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: c.clientId,
      client_secret: c.clientSecret,
      resource: c.resource,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`appypay_token_failed (${res.status})`);
  }
  const ttl = Math.max(60, Number(body.expires_in ?? 3600) - 60);
  cached = { token: body.access_token, expiresAt: Date.now() + ttl * 1000 };
  return cached.token;
}

async function call(method: 'GET' | 'POST', path: string, body?: unknown, accept = 'application/json') {
  const c = appyConfig();
  const send = async (token: string) =>
    await fetch(`${c.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: accept,
        'Accept-Language': 'pt-BR',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      // GPO síncrono pode demorar até 90 s; a margem evita cortar a resposta.
      signal: AbortSignal.timeout(100_000),
    });

  let res = await send(await getToken());
  if (res.status === 401) res = await send(await getToken(true));
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text.slice(0, 300) };
  }
  return { status: res.status, body: parsed };
}

/* ---------------- Normalização da resposta ---------------- */

// A AppyPay devolve datas sem fuso (hora de Angola).
function withLuandaOffset(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}+01:00`;
}

// deno-lint-ignore no-explicit-any
export function normalize(httpStatus: number, body: any): GatewayResult {
  const rs = body?.responseStatus ?? {};
  const ref = rs.reference ?? body?.reference ?? null;
  const status = ['Requested', 'Pending', 'Success', 'Failed'].includes(rs.status) ? rs.status : null;
  const message =
    rs.message ?? body?.message ?? body?.title ?? body?.error_description ??
    (Array.isArray(body?.errors) ? body.errors.map((e: { message?: string }) => e?.message).join(' ') : null);
  return {
    ok: httpStatus >= 200 && httpStatus < 300,
    http_status: httpStatus,
    appypay_id: typeof body?.id === 'string' ? body.id : null,
    // 202 = pedido assíncrono aceite: o resultado chega pelo webhook.
    status: status ?? (httpStatus === 202 ? 'Requested' : null),
    code: typeof rs.code === 'number' ? rs.code : null,
    message: message ? String(message).slice(0, 500) : null,
    reference: ref
      ? {
          entity: ref.entity != null ? String(ref.entity) : null,
          number: ref.referenceNumber != null ? String(ref.referenceNumber) : null,
          due_at: withLuandaOffset(ref.dueDate),
        }
      : null,
    raw: body,
  };
}

/* ---------------- Operações ---------------- */

export async function createCharge(req: GatewayRequest): Promise<GatewayResult> {
  const c = appyConfig();
  const payload: Record<string, unknown> = {
    amount: req.amount,
    currency: 'AOA',
    description: req.description,
    merchantTransactionId: req.merchantTransactionId,
    paymentMethod: c.methods[req.method],
  };
  if (req.method === 'GPO') payload.paymentInfo = { phoneNumber: req.phoneNumber };
  if (req.notify) payload.notify = req.notify;

  // REF: síncrono (a referência vem logo na resposta).
  // GPO: assíncrono — o cliente aprova na app Multicaixa Express e o resultado chega pelo webhook.
  const accept = req.method === 'GPO' ? 'application/vnd.appypay.asyncapi+json' : 'application/json';
  const res = await call('POST', '/charges', payload, accept);
  return normalize(res.status, res.body);
}

export async function getCharge(appypayId: string): Promise<GatewayResult> {
  const res = await call('GET', `/charges/${encodeURIComponent(appypayId)}`);
  return normalize(res.status, res.body);
}

/** Reembolso total (só Multicaixa Express / GPO). */
export async function refundCharge(appypayId: string, description: string): Promise<GatewayResult> {
  const res = await call('POST', `/refunds/${encodeURIComponent(appypayId)}`, { description });
  return normalize(res.status, res.body);
}

export function environmentLabel() {
  return appyConfig().baseUrl.includes('-tst.') ? 'teste' : 'produção';
}
