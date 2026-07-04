// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { generateAccessKey, normalizePhone } from '../_shared/accessKey.ts';
import { sendSms } from '../_shared/twilio.ts';

type Role = 'client' | 'professional';

interface ProvisionBody {
  source?: string;
  role?: Role;
  name?: string | null;
  phone?: string;
  email?: string | null;
  ref?: string | null;
}

/**
 * Provisiona uma conta a partir de uma adesão feita no site:
 *   1. gera uma chave de acesso (= password inicial);
 *   2. cria o utilizador no Supabase Auth (telefone + password);
 *   3. cria/atualiza a linha em `profiles` (role, phone, approval_status);
 *   4. envia a chave por SMS (Twilio).
 *
 * Chamada exclusivamente pelos triggers da BD (com o segredo partilhado). O
 * browser nunca a invoca — evita criação de contas / SMS-bombing a partir do
 * cliente.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // --- Autorização por segredo partilhado (definido pelo trigger) ---
  const secret = req.headers.get('x-provision-secret');
  if (!secret || secret !== Deno.env.get('PROVISION_SECRET')) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: ProvisionBody;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const role: Role = payload.role === 'professional' ? 'professional' : 'client';
  const name = payload.name ?? null;
  const email = payload.email || undefined;
  if (!payload.phone) return json({ error: 'missing_phone' }, 400);
  const phone = normalizePhone(payload.phone);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    // --- Idempotência: já existe um perfil com este telefone? ---
    const { data: existing, error: exErr } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);
    if (exErr) throw exErr;
    if (existing && existing.length > 0) {
      return json({ status: 'exists', message: 'conta já provisionada para este número' });
    }

    // --- 1) chave de acesso (password inicial) ---
    const accessKey = generateAccessKey(8);

    // --- 2) utilizador no Auth ---
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      phone,
      email,
      password: accessKey,
      phone_confirm: true,
      email_confirm: email ? true : undefined,
      user_metadata: { name, role, source: payload.source ?? 'website' },
    } as any);

    if (cErr || !created?.user) {
      console.error('[provision] createUser falhou:', cErr?.message);
      return json({ error: 'auth_create_failed', detail: cErr?.message ?? null }, 409);
    }

    // --- 3) profile (id = auth uid). upsert é seguro caso um trigger
    //         handle_new_user já tenha criado a linha. ---
    const { error: pErr } = await admin.from('profiles').upsert(
      {
        id: created.user.id,
        role,
        name,
        phone,
        approval_status: role === 'professional' ? 'approved' : null,
        onboarding_completed: false,
      },
      { onConflict: 'id' },
    );
    if (pErr) console.error('[provision] upsert profiles falhou:', pErr.message);

    // --- 4) SMS com a chave ---
    const message =
      `AUTONOMOUS: a sua chave de acesso e ${accessKey}. ` +
      `Entre na app com o seu numero ${phone} e esta chave. ` +
      `Pode altera-la depois nas definicoes.`;
    const sms = await sendSms(phone, message);

    return json({
      status: 'created',
      userId: created.user.id,
      role,
      smsSent: sms.sent,
      smsInfo: sms.info,
    });
  } catch (e) {
    console.error('[provision] erro inesperado:', e);
    return json({ error: 'internal', detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
