// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { generateAccessKey, normalizePhone } from '../_shared/accessKey.ts';
import { sendSms } from '../_shared/twilio.ts';

type Role = 'client' | 'professional';
type Mode = 'provision' | 'reissue';

interface ProvisionBody {
  source?: string; // 'client_signup' | 'provider_application'
  role?: Role;
  name?: string | null;
  phone?: string;
  email?: string | null;
  ref?: string | null;
  mode?: Mode;
  authUserId?: string | null;
}

const SOURCE_TABLE: Record<string, string> = {
  client_signup: 'client_signups',
  provider_application: 'provider_applications',
};

/**
 * Provisiona (ou re-emite) uma conta a partir de uma adesão feita no site.
 *
 * - provision: gera chave → cria auth.user (telefone+password) → upsert profiles
 *              → envia SMS.
 * - reissue:   gera NOVA chave → repõe a password do utilizador existente →
 *              reenvia SMS. Usado quando o SMS falhou (provision_status='sms_failed').
 *
 * O resultado é sempre escrito de volta no registo de origem (`provision_status`,
 * `provisioned_at`, `auth_user_id`) para o admin poder ver falhas e re-emitir.
 *
 * Chamada exclusivamente pelos triggers da BD (segredo partilhado). O browser
 * nunca a invoca.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const secret = req.headers.get('x-provision-secret');
  if (!secret || secret !== Deno.env.get('PROVISION_SECRET')) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: ProvisionBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const role: Role = body.role === 'professional' ? 'professional' : 'client';
  const name = body.name ?? null;
  const email = body.email || undefined;
  const mode: Mode = body.mode === 'reissue' ? 'reissue' : 'provision';
  const ref = body.ref ?? null;
  const table = SOURCE_TABLE[body.source ?? ''] ?? null;
  if (!body.phone) return json({ error: 'missing_phone' }, 400);
  const phone = normalizePhone(body.phone);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    // ---------------------------------------------------------------------
    // RE-EMISSÃO: repõe a password de um utilizador existente e reenvia o SMS.
    // ---------------------------------------------------------------------
    if (mode === 'reissue' && body.authUserId) {
      const accessKey = generateAccessKey(8);
      const { error: uErr } = await admin.auth.admin.updateUserById(body.authUserId, {
        password: accessKey,
      });
      if (uErr) {
        console.error('[provision] reissue updateUser falhou:', uErr.message);
        await markSource(admin, table, ref, { provision_status: 'error' });
        return json({ error: 'reissue_failed', detail: uErr.message }, 500);
      }
      const sms = await sendSms(phone, keyMessage(phone, accessKey));
      await markSource(admin, table, ref, {
        provision_status: sms.sent ? 'sms_sent' : 'sms_failed',
        provisioned_at: new Date().toISOString(),
      });
      return json({ status: 'reissued', smsSent: sms.sent, smsInfo: sms.info });
    }

    // ---------------------------------------------------------------------
    // PROVISIONAMENTO inicial.
    // ---------------------------------------------------------------------
    // Idempotência: já existe um perfil com este telefone?
    const { data: existing, error: exErr } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);
    if (exErr) throw exErr;
    if (existing && existing.length > 0) {
      await markSource(admin, table, ref, {
        provision_status: 'exists',
        auth_user_id: existing[0].id,
        provisioned_at: new Date().toISOString(),
      });
      return json({ status: 'exists', message: 'conta já provisionada para este número' });
    }

    const accessKey = generateAccessKey(8);

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      phone,
      email,
      password: accessKey,
      phone_confirm: true,
      email_confirm: email ? true : undefined,
      user_metadata: { name, role, source: body.source ?? 'website' },
    } as any);

    if (cErr || !created?.user) {
      console.error('[provision] createUser falhou:', cErr?.message);
      await markSource(admin, table, ref, { provision_status: 'error' });
      return json({ error: 'auth_create_failed', detail: cErr?.message ?? null }, 409);
    }

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

    const sms = await sendSms(phone, keyMessage(phone, accessKey));

    await markSource(admin, table, ref, {
      provision_status: sms.sent ? 'sms_sent' : 'sms_failed',
      auth_user_id: created.user.id,
      provisioned_at: new Date().toISOString(),
    });

    return json({ status: 'created', userId: created.user.id, role, smsSent: sms.sent, smsInfo: sms.info });
  } catch (e) {
    console.error('[provision] erro inesperado:', e);
    await markSource(admin, table, ref, { provision_status: 'error' });
    return json({ error: 'internal', detail: String(e) }, 500);
  }
});

/** Mensagem da chave (sem acentos, para máxima compatibilidade em SMS). */
function keyMessage(phone: string, key: string): string {
  return (
    `AUTONOMOUS: a sua chave de acesso e ${key}. ` +
    `Entre na app com o seu numero ${phone} e esta chave. ` +
    `Pode altera-la depois nas definicoes.`
  );
}

/** Escreve o resultado do provisionamento de volta no registo de origem. */
async function markSource(
  admin: SupabaseClient,
  table: string | null,
  ref: string | null,
  patch: Record<string, unknown>,
): Promise<void> {
  if (!table || !ref) return;
  const { error } = await admin.from(table).update(patch).eq('id', ref);
  if (error) console.error(`[provision] markSource(${table}) falhou:`, error.message);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
