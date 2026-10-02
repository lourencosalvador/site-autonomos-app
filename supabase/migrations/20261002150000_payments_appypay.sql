/*
# Pagamentos: AppyPay (Referência + Multicaixa Express) e gestão financeira no painel

Correr UMA vez no Supabase → SQL Editor, depois da migração 20261002120000_admin_dashboard.sql.
É idempotente (pode voltar a correr sem estragar nada).

O que cria
  1. `private.payment_settings` — parâmetros financeiros (unidade dos valores, taxas, nomes de estados
     usados pela app). Editáveis no painel → Pagamentos → Configuração.
  2. `payment_charges` — cada cobrança feita na AppyPay (REF = referência, GPO = Multicaixa Express).
     O cliente só consegue LER as suas; quem escreve são as Edge Functions (service role).
  3. `payment_charge_events` — histórico de cada cobrança (criação, webhook, verificação, reembolso).
  4. Colunas de gestão em `withdrawals` (nota do admin, quem processou e quando).
  5. Funções `pay_*` — usadas só pelas Edge Functions (service role): preparar a cobrança, registar a
     resposta da AppyPay e, quando o pagamento entra, criar a linha em `payments` com o escrow
     (o mesmo formato que a carteira da app já lê).
  6. Funções `admin_*` — relatórios e ações do painel (exigem o token de sessão do admin).

Valores monetários
  Tal como em `payments`/`requests`, os valores guardam-se em unidades mínimas (cêntimos):
  `minor_unit_factor` = 100 → 1500000 = 15.000,00 Kz. Se a app guardar kwanzas inteiros, mude para 1
  no painel. À AppyPay envia-se sempre o valor em kwanzas.
*/

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- ===========================================================================
-- 1. Configuração
-- ===========================================================================
create table if not exists private.payment_settings (
  id int primary key default 1 check (id = 1),
  minor_unit_factor int not null default 100 check (minor_unit_factor in (1, 100)),
  client_fee_rate numeric(5, 4) not null default 0.10 check (client_fee_rate between 0 and 1),
  provider_fee_rate numeric(5, 4) not null default 0.10 check (provider_fee_rate between 0 and 1),
  payment_success_status text not null default 'succeeded',
  request_paid_status text not null default 'succeeded',
  escrow_held_status text not null default 'held',
  withdrawal_paid_status text not null default 'paid',
  updated_at timestamptz not null default now()
);
insert into private.payment_settings (id) values (1) on conflict (id) do nothing;

-- ===========================================================================
-- 2. Cobranças AppyPay
-- ===========================================================================
create table if not exists public.payment_charges (
  id uuid primary key default gen_random_uuid(),
  merchant_tx_id text not null unique check (merchant_tx_id ~ '^[A-Z0-9]{8,15}$'),
  appypay_id text unique,
  method text not null check (method in ('REF', 'GPO')),
  purpose text not null default 'service' check (purpose in ('service', 'manual')),
  request_id uuid,
  site_request_id uuid,
  client_id uuid,
  provider_id uuid,
  payer_name text,
  payer_phone text,
  payer_email text,
  description text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'AOA',
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'expired', 'cancelled', 'refunded')),
  gateway_status text,
  gateway_code int,
  gateway_message text,
  reference_entity text,
  reference_number text,
  reference_due_at timestamptz,
  payment_id uuid,
  paid_at timestamptz,
  settled_at timestamptz,
  refunded_at timestamptz,
  created_by text not null default 'app' check (created_by in ('app', 'admin')),
  created_by_admin text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_charges_status_idx on public.payment_charges (status, created_at desc);
create index if not exists payment_charges_request_idx on public.payment_charges (request_id);
create index if not exists payment_charges_client_idx on public.payment_charges (client_id, created_at desc);
create index if not exists payment_charges_payment_idx on public.payment_charges (payment_id);

alter table public.payment_charges enable row level security;

drop policy if exists "client_reads_own_charges" on public.payment_charges;
create policy "client_reads_own_charges"
  on public.payment_charges for select
  to authenticated using (client_id = auth.uid());

revoke insert, update, delete on public.payment_charges from anon, authenticated;

-- Realtime: a app pode subscrever o estado da cobrança (o RLS garante que cada cliente só vê as suas).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payment_charges') then
    alter publication supabase_realtime add table public.payment_charges;
  end if;
end;
$$;

create table if not exists public.payment_charge_events (
  id bigint generated always as identity primary key,
  charge_id uuid not null references public.payment_charges (id) on delete cascade,
  source text not null check (source in ('create', 'webhook', 'verify', 'admin', 'settle', 'refund')),
  status text,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists payment_charge_events_charge_idx on public.payment_charge_events (charge_id, created_at);

alter table public.payment_charge_events enable row level security;
revoke all on public.payment_charge_events from anon, authenticated;

-- ===========================================================================
-- 3. Saques: colunas de gestão (aditivo, não muda nada do que a app já usa)
-- ===========================================================================
do $$
begin
  if to_regclass('public.withdrawals') is not null then
    alter table public.withdrawals add column if not exists admin_note text;
    alter table public.withdrawals add column if not exists processed_at timestamptz;
    alter table public.withdrawals add column if not exists processed_by text;
  end if;
end;
$$;

-- ===========================================================================
-- 4. Funções auxiliares (privadas)
-- ===========================================================================

-- Identificador da transação para a AppyPay: 15 caracteres alfanuméricos.
create or replace function private.merchant_tx_id()
returns text
language plpgsql volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(13);
  v_id text := 'AU';
begin
  for i in 0..12 loop
    v_id := v_id || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return v_id;
end;
$$;

-- Telefone angolano para a AppyPay: 9XXXXXXXX ou 2449XXXXXXXX. Devolve null se inválido.
create or replace function private.normalize_phone(p_phone text)
returns text
language sql immutable
set search_path = ''
as $$
  select case
    when d ~ '^9[0-9]{8}$' then d
    when d ~ '^2449[0-9]{8}$' then d
    when d ~ '^002449[0-9]{8}$' then substr(d, 3)
    else null
  end
  from (select regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') as d) s;
$$;

-- Descrição aceite pela AppyPay (sem caracteres especiais).
create or replace function private.gateway_text(p_text text, p_max int default 60)
returns text
language sql immutable
set search_path = ''
as $$
  select left(trim(regexp_replace(regexp_replace(
    translate(coalesce(p_text, ''), 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'),
    '[^A-Za-z0-9 ]', ' ', 'g'), ' {2,}', ' ', 'g')), p_max);
$$;

-- Valores aceites por um CHECK de uma coluna (ex.: estados de withdrawals.status).
create or replace function private.check_values(p_table regclass, p_column text)
returns text[]
language sql stable
set search_path = ''
as $$
  select coalesce(array_agg(distinct m[1]), '{}')
    from pg_constraint c
    cross join lateral regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') as m
   where c.conrelid = p_table and c.contype = 'c'
     and pg_get_constraintdef(c.oid) like '%' || p_column || '%';
$$;

-- Marca como expiradas as referências fora de prazo e os Express sem resposta.
create or replace function private.expire_charges()
returns void
language sql
set search_path = ''
as $$
  update public.payment_charges
     set status = 'expired', updated_at = now()
   where status = 'pending'
     and ((method = 'REF' and reference_due_at is not null and reference_due_at < now())
       -- referência que nunca chegou a ser gerada (AppyPay sem resposta)
       or (method = 'REF' and reference_number is null and created_at < now() - interval '1 hour')
       or (method = 'GPO' and created_at < now() - interval '15 minutes'));
$$;

-- Vista pública de uma cobrança (o que a app pode mostrar ao cliente).
create or replace function private.charge_public(c public.payment_charges)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'method', c.method,
    'status', c.status,
    'amount_minor', c.amount_minor,
    'amount', round(c.amount_minor::numeric / s.minor_unit_factor, 2),
    'currency', c.currency,
    'request_id', c.request_id,
    'reference', case when c.reference_number is null then null else jsonb_build_object(
      'entity', c.reference_entity, 'number', c.reference_number, 'due_at', c.reference_due_at) end,
    'message', c.gateway_message,
    'created_at', c.created_at,
    'paid_at', c.paid_at
  )
  from private.payment_settings s where s.id = 1;
$$;

-- Corpo do pedido para a AppyPay (a Edge Function só o envia).
create or replace function private.gateway_request(c public.payment_charges)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'merchantTransactionId', c.merchant_tx_id,
    'amount', round(c.amount_minor::numeric / s.minor_unit_factor, 2),
    'currency', 'AOA',
    'description', coalesce(nullif(private.gateway_text(c.description), ''), 'AUTONOMOUS'),
    'method', c.method,
    'phoneNumber', c.payer_phone,
    'notify', case when c.payer_phone is null then null else jsonb_build_object(
      'name', coalesce(nullif(private.gateway_text(c.payer_name, 40), ''), 'Cliente'),
      'telephone', right(c.payer_phone, 9),
      'smsNotification', true) end
  )
  from private.payment_settings s where s.id = 1;
$$;

-- Quando a AppyPay confirma: cria o pagamento em `payments` (escrow retido) e marca o pedido como pago.
create or replace function private.settle_charge(p_charge_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  c public.payment_charges;
  s private.payment_settings;
  r record;
  v_payment uuid;
  v_urgent bigint;
  v_agreed bigint;
  v_request_fee bigint;
  v_service_fee bigint;
begin
  select * into c from public.payment_charges where id = p_charge_id for update;
  if c.id is null or c.status <> 'success' or c.settled_at is not null then return; end if;
  select * into s from private.payment_settings where id = 1;

  if c.purpose = 'service' and c.request_id is not null and to_regclass('public.requests') is not null then
    select id, client_id, provider_id, currency, client_total, agreed_amount, request_fee, service_fee,
           urgent_bonus, provider_net, platform_net
      into r from public.requests where id = c.request_id;

    if r.id is not null then
      select id into v_payment from public.payments where request_id = r.id limit 1;

      if v_payment is null then
        -- Usa a "fotografia" das taxas guardada no pedido; se faltar, calcula com as taxas configuradas.
        v_urgent := coalesce(r.urgent_bonus, 0);
        v_agreed := coalesce(r.agreed_amount, round((c.amount_minor - v_urgent) / (1 + s.client_fee_rate)));
        v_request_fee := coalesce(r.request_fee, c.amount_minor - v_agreed - v_urgent);
        v_service_fee := coalesce(r.service_fee, round(v_agreed * s.provider_fee_rate));

        insert into public.payments (
          request_id, client_id, provider_id, amount, currency, status, stripe_payment_intent_id, paid_at,
          escrow_status, agreed_amount, request_fee, service_fee, urgent_bonus, provider_net, platform_net
        ) values (
          r.id, r.client_id, r.provider_id, c.amount_minor, coalesce(r.currency, lower(c.currency)),
          s.payment_success_status, 'appypay_' || c.merchant_tx_id, coalesce(c.paid_at, now()),
          s.escrow_held_status, v_agreed, v_request_fee, v_service_fee, v_urgent,
          coalesce(r.provider_net, v_agreed - v_service_fee + v_urgent),
          coalesce(r.platform_net, v_request_fee + v_service_fee)
        )
        returning id into v_payment;
      end if;

      update public.requests
         set payment_status = s.request_paid_status,
             paid_at = coalesce(paid_at, c.paid_at, now()),
             escrow_status = coalesce(escrow_status, s.escrow_held_status)
       where id = r.id;
    end if;
  end if;

  update public.payment_charges
     set payment_id = coalesce(v_payment, payment_id), settled_at = now(), updated_at = now()
   where id = c.id;

  insert into public.payment_charge_events (charge_id, source, status, message, payload)
  values (c.id, 'settle', 'success',
          case when v_payment is null then 'Pagamento confirmado (sem pedido da app associado).'
               else 'Pagamento registado em payments com o escrow retido.' end,
          jsonb_build_object('payment_id', v_payment));
end;
$$;

-- ===========================================================================
-- 5. Funções para as Edge Functions (só service role)
-- ===========================================================================

-- Prepara a cobrança de um pedido da app. O valor vem SEMPRE do pedido, nunca do cliente.
create or replace function public.pay_prepare_charge(p_user uuid, p_request_id uuid, p_method text, p_phone text default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  s private.payment_settings;
  r record;
  v_existing public.payment_charges;
  v_charge public.payment_charges;
  v_phone text;
  v_name text;
  v_profile_phone text;
begin
  if p_method not in ('REF', 'GPO') then raise exception 'invalid_method'; end if;
  select * into s from private.payment_settings where id = 1;

  select id, client_id, provider_id, client_total, currency, payment_status, status, service_name
    into r from public.requests where id = p_request_id;
  if r.id is null then raise exception 'request_not_found'; end if;
  if r.client_id is distinct from p_user then raise exception 'forbidden'; end if;
  if r.status in ('cancelled', 'rejected') then raise exception 'request_closed'; end if;
  if coalesce(r.client_total, 0) <= 0 then raise exception 'amount_not_set'; end if;
  if upper(coalesce(r.currency, 'AOA')) <> 'AOA' then raise exception 'unsupported_currency'; end if;
  if r.payment_status = s.request_paid_status
     or exists (select 1 from public.payments p where p.request_id = r.id and p.paid_at is not null) then
    raise exception 'already_paid';
  end if;

  perform private.expire_charges();

  if p_method = 'REF' then
    -- Reaproveita uma referência ainda válida para o mesmo pedido e valor.
    select * into v_existing from public.payment_charges
     where request_id = r.id and method = 'REF' and status = 'pending' and amount_minor = r.client_total
       and reference_number is not null and (reference_due_at is null or reference_due_at > now() + interval '1 hour')
     order by created_at desc limit 1;
    if v_existing.id is not null then
      return jsonb_build_object('reuse', true, 'charge', private.charge_public(v_existing));
    end if;
  else
    v_phone := private.normalize_phone(p_phone);
    if v_phone is null then raise exception 'invalid_phone'; end if;
    if exists (select 1 from public.payment_charges
                where request_id = r.id and method = 'GPO' and status = 'pending'
                  and created_at > now() - interval '2 minutes') then
      raise exception 'charge_in_progress';
    end if;
  end if;

  select name, phone into v_name, v_profile_phone from public.profiles where id = p_user;

  insert into public.payment_charges (
    merchant_tx_id, method, purpose, request_id, client_id, provider_id, payer_name, payer_phone,
    description, amount_minor, currency, created_by
  ) values (
    private.merchant_tx_id(), p_method, 'service', r.id, r.client_id, r.provider_id, v_name,
    coalesce(v_phone, private.normalize_phone(v_profile_phone)),
    'AUTONOMOUS ' || coalesce(r.service_name, 'Servico'), r.client_total, 'AOA', 'app'
  )
  returning * into v_charge;

  insert into public.payment_charge_events (charge_id, source, status, message)
  values (v_charge.id, 'create', 'pending', 'Cobrança criada pela app.');

  return jsonb_build_object(
    'reuse', false,
    'charge', private.charge_public(v_charge),
    'gateway_request', private.gateway_request(v_charge)
  );
end;
$$;

/*
 Regista uma resposta da AppyPay (normalizada pela Edge Function):
   { ok, http_status, appypay_id, status: 'Requested'|'Pending'|'Success'|'Failed', code, message,
     reference: { entity, number, due_at }, raw }
 Nunca "despromove" um pagamento confirmado. Se ficar confirmado, regista-o em `payments`.
*/
create or replace function public.pay_record_gateway(p_charge_id uuid, p_source text, p_gateway jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  c public.payment_charges;
  v_gw text := p_gateway ->> 'status';
  v_ok boolean := coalesce((p_gateway ->> 'ok')::boolean, false);
  v_http int := coalesce((p_gateway ->> 'http_status')::int, 0);
  v_new text;
begin
  if p_source not in ('create', 'webhook', 'verify', 'admin', 'refund') then raise exception 'invalid_source'; end if;
  select * into c from public.payment_charges where id = p_charge_id for update;
  if c.id is null then raise exception 'charge_not_found'; end if;

  if p_source = 'refund' then
    v_new := case when v_ok and v_gw = 'Success' then 'refunded' else c.status end;
  else
    v_new := case
      when v_gw = 'Success' then 'success'
      when v_gw = 'Failed' then 'failed'
      when v_gw in ('Pending', 'Requested') then 'pending'
      -- Recusa definitiva no momento da criação (dados inválidos, método não configurado, etc.)
      when p_source = 'create' and not v_ok and v_http between 400 and 499 then 'failed'
      else c.status
    end;
    -- Um pagamento confirmado (ou reembolsado) não volta atrás.
    if c.status in ('success', 'refunded') and v_new <> c.status then v_new := c.status; end if;
  end if;

  update public.payment_charges
     set status = v_new,
         appypay_id = coalesce(nullif(p_gateway ->> 'appypay_id', ''), appypay_id),
         gateway_status = coalesce(v_gw, gateway_status),
         gateway_code = coalesce((p_gateway ->> 'code')::int, gateway_code),
         gateway_message = coalesce(nullif(p_gateway ->> 'message', ''), gateway_message),
         reference_entity = coalesce(nullif(p_gateway #>> '{reference,entity}', ''), reference_entity),
         reference_number = coalesce(nullif(p_gateway #>> '{reference,number}', ''), reference_number),
         reference_due_at = coalesce((nullif(p_gateway #>> '{reference,due_at}', ''))::timestamptz, reference_due_at),
         paid_at = case when v_new = 'success' then coalesce(paid_at, now()) else paid_at end,
         refunded_at = case when v_new = 'refunded' then coalesce(refunded_at, now()) else refunded_at end,
         raw = coalesce(p_gateway -> 'raw', raw),
         updated_at = now()
   where id = c.id
  returning * into c;

  insert into public.payment_charge_events (charge_id, source, status, message, payload)
  values (c.id, p_source, v_new, p_gateway ->> 'message', coalesce(p_gateway, '{}'::jsonb));

  if c.status = 'success' and c.settled_at is null then
    perform private.settle_charge(c.id);
    select * into c from public.payment_charges where id = c.id;
  end if;

  return private.charge_public(c) || jsonb_build_object('appypay_id', c.appypay_id);
end;
$$;

-- Encontra a cobrança de um webhook (pelo id da AppyPay ou pelo merchantTransactionId).
create or replace function public.pay_find_charge(p_appypay_id text, p_merchant_tx text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select to_jsonb(c) from public.payment_charges c
   where (p_appypay_id is not null and c.appypay_id = p_appypay_id)
      or (p_merchant_tx is not null and c.merchant_tx_id = p_merchant_tx)
   limit 1;
$$;

-- Estado de uma cobrança para o cliente que a criou (diz à Edge Function se vale a pena confirmar na AppyPay).
create or replace function public.pay_get_charge_for_user(p_user uuid, p_charge_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  c public.payment_charges;
begin
  perform private.expire_charges();
  select * into c from public.payment_charges where id = p_charge_id;
  if c.id is null then raise exception 'charge_not_found'; end if;
  if c.client_id is distinct from p_user then raise exception 'forbidden'; end if;
  return private.charge_public(c) || jsonb_build_object(
    'appypay_id', c.appypay_id,
    'should_verify', c.status = 'pending' and c.appypay_id is not null and c.updated_at < now() - interval '30 seconds'
  );
end;
$$;

-- ===========================================================================
-- 6. API do painel
-- ===========================================================================

create or replace function public.admin_payment_counts(p_token text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_withdrawals int := 0;
begin
  if to_regclass('public.withdrawals') is not null then
    select count(*) into v_withdrawals from public.withdrawals
     where paid_at is null and lower(coalesce(status, '')) not in ('failed', 'cancelled', 'canceled', 'rejected', 'paid', 'completed');
  end if;
  return jsonb_build_object(
    'withdrawals_pending', v_withdrawals,
    'charges_pending', (select count(*) from public.payment_charges where status = 'pending')
  );
end;
$$;

create or replace function public.admin_payment_meta(p_token text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  s private.payment_settings;
  v_wd text[] := '{}';
  v_escrow text[] := '{}';
  v_pay text[] := '{}';
begin
  select * into s from private.payment_settings where id = 1;
  if to_regclass('public.withdrawals') is not null then
    v_wd := private.check_values('public.withdrawals'::regclass, 'status');
    v_wd := v_wd || coalesce((select array_agg(distinct status) from public.withdrawals where status is not null), '{}');
  end if;
  if to_regclass('public.payments') is not null then
    v_escrow := private.check_values('public.payments'::regclass, 'escrow_status')
      || coalesce((select array_agg(distinct escrow_status) from public.payments where escrow_status is not null), '{}');
    v_pay := coalesce((select array_agg(distinct status) from public.payments where status is not null), '{}');
  end if;
  if cardinality(v_wd) = 0 then v_wd := array['pending', 'processing', s.withdrawal_paid_status, 'failed']; end if;

  return jsonb_build_object(
    'settings', to_jsonb(s) - 'id',
    'withdrawal_statuses', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from unnest(v_wd || s.withdrawal_paid_status) x),
    'escrow_statuses', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from unnest(v_escrow) x),
    'payment_statuses', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from unnest(v_pay) x)
  );
end;
$$;

create or replace function public.admin_update_payment_settings(p_token text, p_settings jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  s private.payment_settings;
begin
  update private.payment_settings set
    minor_unit_factor = coalesce((p_settings ->> 'minor_unit_factor')::int, minor_unit_factor),
    client_fee_rate = coalesce((p_settings ->> 'client_fee_rate')::numeric, client_fee_rate),
    provider_fee_rate = coalesce((p_settings ->> 'provider_fee_rate')::numeric, provider_fee_rate),
    payment_success_status = coalesce(nullif(trim(p_settings ->> 'payment_success_status'), ''), payment_success_status),
    request_paid_status = coalesce(nullif(trim(p_settings ->> 'request_paid_status'), ''), request_paid_status),
    escrow_held_status = coalesce(nullif(trim(p_settings ->> 'escrow_held_status'), ''), escrow_held_status),
    withdrawal_paid_status = coalesce(nullif(trim(p_settings ->> 'withdrawal_paid_status'), ''), withdrawal_paid_status),
    updated_at = now()
  where id = 1
  returning * into s;
  perform private.audit(v_admin, 'payments.settings', null, to_jsonb(s) - 'id');
  return to_jsonb(s) - 'id';
end;
$$;

-- ---------- Resumo financeiro ----------
create or replace function public.admin_payments_overview(p_token text, p_days int default 30)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  s private.payment_settings;
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from timestamptz := now() - make_interval(days => v_days);
  v_prev timestamptz := now() - make_interval(days => v_days * 2);
  v_from_day date := ((now() - make_interval(days => v_days - 1)) at time zone 'Africa/Luanda')::date;
  v_today date := (now() at time zone 'Africa/Luanda')::date;
  v_cur text;
  v_result jsonb;
  v_withdrawals jsonb := '{}'::jsonb;
  v_wd_paid numeric := 0;
  v_wd_pending numeric := 0;
  v_wd_pending_count int := 0;
begin
  select * into s from private.payment_settings where id = 1;
  perform private.expire_charges();

  -- Moeda principal (a de maior volume); as restantes aparecem à parte.
  select lower(coalesce(currency, 'aoa')) into v_cur from public.payments
   where paid_at is not null group by lower(coalesce(currency, 'aoa')) order by sum(amount) desc limit 1;
  v_cur := coalesce(v_cur, 'aoa');

  v_result := jsonb_build_object(
    'days', v_days,
    'currency', upper(v_cur),
    'factor', s.minor_unit_factor,
    'generated_at', now()
  );

  -- Totais (período, período anterior e desde sempre)
  v_result := v_result || jsonb_build_object('totals', (
    select jsonb_build_object(
      'gross',          coalesce(sum(amount) filter (where paid_at >= v_from), 0),
      'gross_prev',     coalesce(sum(amount) filter (where paid_at >= v_prev and paid_at < v_from), 0),
      'platform',       coalesce(sum(platform_net) filter (where paid_at >= v_from), 0),
      'platform_prev',  coalesce(sum(platform_net) filter (where paid_at >= v_prev and paid_at < v_from), 0),
      'provider',       coalesce(sum(provider_net) filter (where paid_at >= v_from), 0),
      'request_fees',   coalesce(sum(request_fee) filter (where paid_at >= v_from), 0),
      'service_fees',   coalesce(sum(service_fee) filter (where paid_at >= v_from), 0),
      'urgent',         coalesce(sum(urgent_bonus) filter (where paid_at >= v_from), 0),
      'count',          count(*) filter (where paid_at >= v_from),
      'count_prev',     count(*) filter (where paid_at >= v_prev and paid_at < v_from),
      'all_gross',      coalesce(sum(amount), 0),
      'all_platform',   coalesce(sum(platform_net), 0),
      'all_count',      count(*),
      'escrow_held',    coalesce(sum(provider_net) filter (where released_at is null), 0),
      'escrow_held_count', count(*) filter (where released_at is null),
      'released',       coalesce(sum(provider_net) filter (where released_at is not null), 0),
      'released_period', coalesce(sum(provider_net) filter (where released_at >= v_from), 0)
    )
    from public.payments
    where paid_at is not null and lower(coalesce(currency, 'aoa')) = v_cur
  ));

  -- Saques
  if to_regclass('public.withdrawals') is not null then
    select coalesce(sum(amount) filter (where paid_at is not null), 0),
           coalesce(sum(amount) filter (where paid_at is null and lower(coalesce(status, '')) not in ('failed', 'cancelled', 'canceled', 'rejected')), 0),
           count(*) filter (where paid_at is null and lower(coalesce(status, '')) not in ('failed', 'cancelled', 'canceled', 'rejected'))
      into v_wd_paid, v_wd_pending, v_wd_pending_count
      from public.withdrawals where lower(coalesce(currency, v_cur)) = v_cur;

    v_withdrawals := jsonb_build_object(
      'paid', v_wd_paid,
      'paid_period', (select coalesce(sum(amount), 0) from public.withdrawals where paid_at >= v_from and lower(coalesce(currency, v_cur)) = v_cur),
      'pending', v_wd_pending,
      'pending_count', v_wd_pending_count,
      'by_status', coalesce((
        select jsonb_agg(jsonb_build_object('status', status, 'count', n, 'amount', total) order by n desc)
          from (select coalesce(status, '—') as status, count(*) as n, coalesce(sum(amount), 0) as total
                  from public.withdrawals group by 1) w
      ), '[]'::jsonb),
      'by_method', coalesce((
        select jsonb_agg(jsonb_build_object('method', method, 'count', n, 'amount', total) order by total desc)
          from (select coalesce(method, '—') as method, count(*) as n, coalesce(sum(amount), 0) as total
                  from public.withdrawals where requested_at >= v_from or created_at >= v_from group by 1) w
      ), '[]'::jsonb)
    );
  end if;
  v_result := v_result || jsonb_build_object('withdrawals', v_withdrawals);

  -- Dinheiro dos prestadores ainda na plataforma = libertado − sacado − saques pendentes
  v_result := v_result || jsonb_build_object('provider_available',
    greatest(0, ((v_result #>> '{totals,released}')::numeric) - v_wd_paid - v_wd_pending));

  -- Série diária
  v_result := v_result || jsonb_build_object('series', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'date', d.day,
      'gross', coalesce(p.gross, 0),
      'platform', coalesce(p.platform, 0),
      'count', coalesce(p.n, 0)
    ) order by d.day), '[]'::jsonb)
    from (select g::date as day from generate_series(v_from_day::timestamp, v_today::timestamp, interval '1 day') g) d
    left join (
      select (paid_at at time zone 'Africa/Luanda')::date as day, sum(amount) as gross, sum(platform_net) as platform, count(*) as n
        from public.payments
       where paid_at >= v_from_day::timestamp at time zone 'Africa/Luanda' and lower(coalesce(currency, 'aoa')) = v_cur
       group by 1
    ) p on p.day = d.day
  ));

  -- Por método de pagamento
  v_result := v_result || jsonb_build_object('methods', (
    select coalesce(jsonb_agg(jsonb_build_object('method', method, 'count', n, 'amount', total) order by total desc), '[]'::jsonb)
      from (
        select case
                 when c.method is not null then c.method
                 when p.stripe_payment_intent_id like 'appypay_%' then 'APPYPAY'
                 when p.stripe_payment_intent_id is not null then 'STRIPE'
                 else 'OUTRO'
               end as method,
               count(*) as n, sum(p.amount) as total
          from public.payments p
          left join public.payment_charges c on c.payment_id = p.id
         where p.paid_at >= v_from and lower(coalesce(p.currency, 'aoa')) = v_cur
         group by 1
      ) m
  ));

  -- Cobranças AppyPay
  v_result := v_result || jsonb_build_object('charges', (
    select jsonb_build_object(
      'pending', count(*) filter (where status = 'pending'),
      'pending_amount', coalesce(sum(amount_minor) filter (where status = 'pending'), 0),
      'success', count(*) filter (where status = 'success' and created_at >= v_from),
      'failed', count(*) filter (where status = 'failed' and created_at >= v_from),
      'expired', count(*) filter (where status = 'expired' and created_at >= v_from),
      'refunded', count(*) filter (where status = 'refunded' and created_at >= v_from),
      'created', count(*) filter (where created_at >= v_from),
      'ref', count(*) filter (where method = 'REF' and created_at >= v_from),
      'gpo', count(*) filter (where method = 'GPO' and created_at >= v_from)
    ) from public.payment_charges
  ));

  -- Rankings
  v_result := v_result || jsonb_build_object(
    'top_providers', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.provider_id, 'name', coalesce(pr.name, 'Sem nome'), 'amount', t.total, 'count', t.n) order by t.total desc)
        from (select provider_id, sum(provider_net) as total, count(*) as n from public.payments
               where paid_at >= v_from and lower(coalesce(currency, 'aoa')) = v_cur and provider_id is not null
               group by 1 order by 2 desc limit 6) t
        left join public.profiles pr on pr.id = t.provider_id
    ), '[]'::jsonb),
    'top_services', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'amount', total, 'count', n) order by total desc)
        from (select coalesce(r.service_name, 'Sem serviço') as label, sum(p.amount) as total, count(*) as n
                from public.payments p left join public.requests r on r.id = p.request_id
               where p.paid_at >= v_from and lower(coalesce(p.currency, 'aoa')) = v_cur
               group by 1 order by 2 desc limit 6) t
    ), '[]'::jsonb),
    'other_currencies', coalesce((
      select jsonb_agg(jsonb_build_object('currency', upper(cur), 'amount', total, 'count', n))
        from (select lower(coalesce(currency, 'aoa')) as cur, sum(amount) as total, count(*) as n
                from public.payments where paid_at is not null and lower(coalesce(currency, 'aoa')) <> v_cur group by 1) o
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(x order by (x ->> 'paid_at') desc)
        from (
          select jsonb_build_object(
                   'id', p.id, 'paid_at', p.paid_at, 'amount', p.amount, 'currency', p.currency,
                   'client', cl.name, 'provider', pv.name, 'service', r.service_name,
                   'released', p.released_at is not null,
                   'method', coalesce(c.method, case when p.stripe_payment_intent_id like 'appypay_%' then 'APPYPAY' else 'STRIPE' end)
                 ) as x
            from public.payments p
            left join public.profiles cl on cl.id = p.client_id
            left join public.profiles pv on pv.id = p.provider_id
            left join public.requests r on r.id = p.request_id
            left join public.payment_charges c on c.payment_id = p.id
           where p.paid_at is not null
           order by p.paid_at desc limit 8
        ) l
    ), '[]'::jsonb)
  );

  return v_result;
end;
$$;

-- ---------- Transações ----------
create or replace function public.admin_list_transactions(
  p_token text, p_escrow text default null, p_search text default null,
  p_from date default null, p_to date default null, p_limit int default 25, p_offset int default 0
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_lim int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_off int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  return (
    with base as (
      select p.*, cl.name as client_name, pv.name as provider_name, r.service_name, r.is_multi_day, r.is_urgent,
             c.method as charge_method, c.reference_number,
             coalesce(c.method, case when p.stripe_payment_intent_id like 'appypay_%' then 'APPYPAY'
                                     when p.stripe_payment_intent_id is not null then 'STRIPE' else 'OUTRO' end) as method
        from public.payments p
        left join public.profiles cl on cl.id = p.client_id
        left join public.profiles pv on pv.id = p.provider_id
        left join public.requests r on r.id = p.request_id
        left join public.payment_charges c on c.payment_id = p.id
       where p.paid_at is not null
         and (p_from is null or (p.paid_at at time zone 'Africa/Luanda')::date >= p_from)
         and (p_to is null or (p.paid_at at time zone 'Africa/Luanda')::date <= p_to)
    ), f as (
      select * from base
       where (p_escrow is null or (p_escrow = 'held') = (released_at is null))
         and (v_q is null or position(v_q in lower(
               coalesce(client_name, '') || ' ' || coalesce(provider_name, '') || ' ' || coalesce(service_name, '') || ' ' ||
               coalesce(reference_number, '') || ' ' || coalesce(stripe_payment_intent_id, '') || ' ' || id::text)) > 0)
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'sum_amount', (select coalesce(sum(amount), 0) from f),
      'sum_platform', (select coalesce(sum(platform_net), 0) from f),
      'counts', (select jsonb_build_object(
                   'all', count(*),
                   'held', count(*) filter (where released_at is null),
                   'released', count(*) filter (where released_at is not null)) from base),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', x.id, 'paid_at', x.paid_at, 'created_at', x.created_at, 'amount', x.amount, 'currency', x.currency,
                 'request_fee', x.request_fee, 'service_fee', x.service_fee, 'urgent_bonus', x.urgent_bonus,
                 'provider_net', x.provider_net, 'platform_net', x.platform_net, 'agreed_amount', x.agreed_amount,
                 'status', x.status, 'escrow_status', x.escrow_status, 'released_at', x.released_at,
                 'method', x.method, 'reference_number', x.reference_number,
                 'client', jsonb_build_object('id', x.client_id, 'name', x.client_name),
                 'provider', jsonb_build_object('id', x.provider_id, 'name', x.provider_name),
                 'service', x.service_name, 'is_multi_day', x.is_multi_day, 'is_urgent', x.is_urgent,
                 'request_id', x.request_id
               ) order by x.paid_at desc)
          from (select * from f order by paid_at desc limit v_lim offset v_off) x
      ), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.admin_transaction_detail(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  p public.payments;
  v_charges jsonb;
begin
  select * into p from public.payments where id = p_id;
  if p.id is null then raise exception 'not_found'; end if;

  select coalesce(jsonb_agg(to_jsonb(c) - 'raw' || jsonb_build_object(
           'events', coalesce((select jsonb_agg(to_jsonb(e) - 'payload' order by e.created_at)
                                 from public.payment_charge_events e where e.charge_id = c.id), '[]'::jsonb))
         order by c.created_at), '[]'::jsonb)
    into v_charges
    from public.payment_charges c
   where c.payment_id = p.id or (p.request_id is not null and c.request_id = p.request_id);

  return jsonb_build_object(
    'payment', to_jsonb(p),
    'method', coalesce((select method from public.payment_charges where payment_id = p.id limit 1),
                       case when p.stripe_payment_intent_id like 'appypay_%' then 'APPYPAY' else 'STRIPE' end),
    'request', (select jsonb_build_object(
                  'id', r.id, 'status', r.status, 'service_name', r.service_name, 'location', r.location,
                  'is_multi_day', r.is_multi_day, 'is_urgent', r.is_urgent, 'client_total', r.client_total,
                  'payment_status', r.payment_status, 'escrow_status', r.escrow_status,
                  'accepted_at', r.accepted_at, 'completed_at', r.completed_at, 'cancelled_at', r.cancelled_at)
                from public.requests r where r.id = p.request_id),
    'client', (select jsonb_build_object('id', pr.id, 'name', pr.name, 'phone', pr.phone, 'email', u.email)
                 from public.profiles pr left join auth.users u on u.id = pr.id where pr.id = p.client_id),
    'provider', (select jsonb_build_object('id', pr.id, 'name', pr.name, 'phone', pr.phone, 'email', u.email)
                   from public.profiles pr left join auth.users u on u.id = pr.id where pr.id = p.provider_id),
    'charges', v_charges
  );
end;
$$;

-- ---------- Cobranças AppyPay ----------
create or replace function public.admin_list_charges(
  p_token text, p_status text default null, p_method text default null, p_search text default null,
  p_limit int default 25, p_offset int default 0
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_lim int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_off int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  perform private.expire_charges();
  return (
    with f as (
      select c.*, coalesce(pr.name, c.payer_name) as display_name
        from public.payment_charges c
        left join public.profiles pr on pr.id = c.client_id
       where (p_status is null or c.status = p_status)
         and (p_method is null or c.method = p_method)
         and (v_q is null or position(v_q in lower(
               coalesce(pr.name, '') || ' ' || coalesce(c.payer_name, '') || ' ' || coalesce(c.payer_phone, '') || ' ' ||
               coalesce(c.reference_number, '') || ' ' || c.merchant_tx_id || ' ' || coalesce(c.description, ''))) > 0)
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'counts', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.payment_charges group by status) s), '{}'::jsonb),
      'rows', coalesce((select jsonb_agg(to_jsonb(x) - 'raw' order by x.created_at desc)
                          from (select * from f order by created_at desc limit v_lim offset v_off) x), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.admin_charge_detail(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  c public.payment_charges;
begin
  perform private.expire_charges();
  select * into c from public.payment_charges where id = p_id;
  if c.id is null then raise exception 'not_found'; end if;
  return jsonb_build_object(
    'charge', to_jsonb(c),
    'client', (select jsonb_build_object('id', pr.id, 'name', pr.name, 'phone', pr.phone) from public.profiles pr where pr.id = c.client_id),
    'provider', (select jsonb_build_object('id', pr.id, 'name', pr.name) from public.profiles pr where pr.id = c.provider_id),
    'request', (select jsonb_build_object('id', r.id, 'service_name', r.service_name, 'status', r.status)
                  from public.requests r where r.id = c.request_id),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.payment_charge_events e where e.charge_id = c.id), '[]'::jsonb)
  );
end;
$$;

-- Prepara uma cobrança manual (a Edge Function appypay-admin envia-a depois à AppyPay).
create or replace function public.admin_prepare_charge(p_token text, p_charge jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  s private.payment_settings;
  v_method text := upper(coalesce(p_charge ->> 'method', ''));
  v_amount numeric := (p_charge ->> 'amount')::numeric;
  v_phone text := private.normalize_phone(p_charge ->> 'phone');
  v_request uuid := nullif(p_charge ->> 'request_id', '')::uuid;
  v_client uuid;
  v_provider uuid;
  v_total bigint;
  v_service text;
  c public.payment_charges;
begin
  select * into s from private.payment_settings where id = 1;
  if v_method not in ('REF', 'GPO') then raise exception 'invalid_method'; end if;
  if v_method = 'GPO' and v_phone is null then raise exception 'invalid_phone'; end if;
  if nullif(p_charge ->> 'phone', '') is not null and v_phone is null then raise exception 'invalid_phone'; end if;

  if v_request is not null then
    select client_id, provider_id, client_total, service_name into v_client, v_provider, v_total, v_service
      from public.requests where id = v_request;
    if not found then raise exception 'request_not_found'; end if;
    if exists (select 1 from public.payments where request_id = v_request and paid_at is not null) then raise exception 'already_paid'; end if;
    v_amount := coalesce(v_amount, v_total::numeric / s.minor_unit_factor);
  end if;

  if v_amount is null or v_amount < 1 then raise exception 'invalid_amount'; end if;

  insert into public.payment_charges (
    merchant_tx_id, method, purpose, request_id, site_request_id, client_id, provider_id,
    payer_name, payer_phone, payer_email, description, amount_minor, currency, created_by, created_by_admin
  ) values (
    private.merchant_tx_id(), v_method, case when v_request is null then 'manual' else 'service' end,
    v_request, nullif(p_charge ->> 'site_request_id', '')::uuid, v_client, v_provider,
    nullif(trim(p_charge ->> 'name'), ''), v_phone, nullif(trim(p_charge ->> 'email'), ''),
    coalesce(nullif(trim(p_charge ->> 'description'), ''), 'AUTONOMOUS ' || coalesce(v_service, 'Servico')),
    round(v_amount * s.minor_unit_factor), 'AOA', 'admin', v_admin.name
  )
  returning * into c;

  insert into public.payment_charge_events (charge_id, source, status, message)
  values (c.id, 'admin', 'pending', 'Cobrança criada no painel por ' || v_admin.name || '.');
  perform private.audit(v_admin, 'payment.charge_create', c.id::text,
    jsonb_build_object('method', v_method, 'amount', v_amount, 'name', c.payer_name));

  return jsonb_build_object('charge', private.charge_public(c), 'gateway_request', private.gateway_request(c));
end;
$$;

create or replace function public.admin_cancel_charge(p_token text, p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  update public.payment_charges set status = 'cancelled', updated_at = now()
   where id = p_id and status = 'pending';
  if not found then raise exception 'not_pending'; end if;
  insert into public.payment_charge_events (charge_id, source, status, message)
  values (p_id, 'admin', 'cancelled', 'Cancelada no painel por ' || v_admin.name || '.');
  perform private.audit(v_admin, 'payment.charge_cancel', p_id::text);
end;
$$;

-- Usada pela Edge Function antes de verificar/reembolsar: devolve os dados da cobrança.
drop function if exists public.admin_charge_for_gateway(text, uuid);
create or replace function public.admin_charge_for_gateway(p_token text, p_id uuid, p_action text default 'verify')
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  c public.payment_charges;
begin
  select * into c from public.payment_charges where id = p_id;
  if c.id is null then raise exception 'not_found'; end if;
  if p_action = 'refund' then
    perform private.audit(v_admin, 'payment.refund_request', c.id::text,
      jsonb_build_object('amount', round(c.amount_minor::numeric / (select minor_unit_factor from private.payment_settings where id = 1), 2)));
  end if;
  return jsonb_build_object('id', c.id, 'appypay_id', c.appypay_id, 'method', c.method, 'status', c.status,
                            'merchant_tx_id', c.merchant_tx_id, 'admin', v_admin.name);
end;
$$;

-- ---------- Saques ----------
create or replace function public.admin_list_withdrawals(
  p_token text, p_status text default null, p_search text default null, p_limit int default 25, p_offset int default 0
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_lim int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_off int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  if to_regclass('public.withdrawals') is null then
    return jsonb_build_object('total', 0, 'rows', '[]'::jsonb, 'counts', '{}'::jsonb);
  end if;
  return (
    with f as (
      select w.*, pr.name as provider_name, pr.phone as provider_phone, u.email as provider_email
        from public.withdrawals w
        left join public.profiles pr on pr.id = w.provider_id
        left join auth.users u on u.id = w.provider_id
       where (p_status is null or w.status = p_status)
         and (v_q is null or position(v_q in lower(coalesce(pr.name, '') || ' ' || coalesce(pr.phone, '') || ' ' ||
                                                   coalesce(u.email, '') || ' ' || coalesce(w.method, ''))) > 0)
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'sum_amount', (select coalesce(sum(amount), 0) from f),
      'counts', coalesce((select jsonb_object_agg(coalesce(status, '—'), n) from (select status, count(*) n from public.withdrawals group by status) s), '{}'::jsonb),
      'rows', coalesce((
        select jsonb_agg(to_jsonb(x) order by coalesce(x.requested_at, x.created_at) desc)
          from (select * from f order by coalesce(requested_at, created_at) desc limit v_lim offset v_off) x
      ), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.admin_update_withdrawal(p_token text, p_id uuid, p_status text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  s private.payment_settings;
  v_allowed text[];
  v_old text;
begin
  select * into s from private.payment_settings where id = 1;
  v_allowed := private.check_values('public.withdrawals'::regclass, 'status');
  if cardinality(v_allowed) > 0 and not (p_status = any (v_allowed)) then raise exception 'invalid_status'; end if;
  if coalesce(trim(p_status), '') = '' then raise exception 'invalid_status'; end if;

  select status into v_old from public.withdrawals where id = p_id for update;
  if not found then raise exception 'not_found'; end if;

  update public.withdrawals
     set status = p_status,
         admin_note = coalesce(nullif(trim(p_note), ''), admin_note),
         processed_at = now(),
         processed_by = v_admin.name,
         paid_at = case when p_status = s.withdrawal_paid_status then coalesce(paid_at, now()) else paid_at end,
         updated_at = now()
   where id = p_id;

  perform private.audit(v_admin, 'payment.withdrawal_status', p_id::text,
    jsonb_build_object('status', p_status, 'from', v_old, 'note', nullif(trim(p_note), '')));
end;
$$;

-- ---------- Saldos dos prestadores ----------
create or replace function public.admin_provider_balances(
  p_token text, p_search text default null, p_limit int default 25, p_offset int default 0
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_lim int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_off int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
  v_has_wd boolean := to_regclass('public.withdrawals') is not null;
begin
  return (
    with earn as (
      select provider_id,
             coalesce(sum(provider_net), 0) as earned,
             coalesce(sum(provider_net) filter (where released_at is null), 0) as held,
             coalesce(sum(provider_net) filter (where released_at is not null), 0) as released,
             count(*) as jobs,
             max(paid_at) as last_paid_at
        from public.payments
       where paid_at is not null and provider_id is not null
       group by provider_id
    ), wd as (
      select provider_id,
             coalesce(sum(amount) filter (where paid_at is not null), 0) as withdrawn,
             coalesce(sum(amount) filter (where paid_at is null and lower(coalesce(status, '')) not in ('failed', 'cancelled', 'canceled', 'rejected')), 0) as pending,
             max(coalesce(requested_at, created_at)) as last_withdrawal_at
        from public.withdrawals
       where v_has_wd
       group by provider_id
    ), base as (
      select e.provider_id as id, pr.name, pr.phone, u.email, e.earned, e.held, e.released, e.jobs, e.last_paid_at,
             coalesce(w.withdrawn, 0) as withdrawn, coalesce(w.pending, 0) as pending_withdrawals, w.last_withdrawal_at,
             greatest(0, e.released - coalesce(w.withdrawn, 0) - coalesce(w.pending, 0)) as available
        from earn e
        left join wd w on w.provider_id = e.provider_id
        left join public.profiles pr on pr.id = e.provider_id
        left join auth.users u on u.id = e.provider_id
    ), f as (
      select * from base
       where v_q is null or position(v_q in lower(coalesce(name, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(email, ''))) > 0
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'totals', (select jsonb_build_object(
                   'earned', coalesce(sum(earned), 0), 'held', coalesce(sum(held), 0),
                   'available', coalesce(sum(available), 0), 'withdrawn', coalesce(sum(withdrawn), 0),
                   'pending_withdrawals', coalesce(sum(pending_withdrawals), 0)) from base),
      'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.earned desc)
                          from (select * from f order by earned desc limit v_lim offset v_off) x), '[]'::jsonb)
    )
  );
end;
$$;

-- ---------- Exportação (CSV no painel) ----------
create or replace function public.admin_export_payments(p_token text, p_from date, p_to date)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  perform private.audit(v_admin, 'payment.export', null, jsonb_build_object('from', p_from, 'to', p_to));
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', p.id, 'paid_at', p.paid_at, 'service', r.service_name, 'client', cl.name, 'provider', pv.name,
             'method', coalesce(c.method, case when p.stripe_payment_intent_id like 'appypay_%' then 'APPYPAY' else 'STRIPE' end),
             'reference', c.reference_number, 'currency', p.currency, 'amount', p.amount, 'agreed_amount', p.agreed_amount,
             'request_fee', p.request_fee, 'service_fee', p.service_fee, 'urgent_bonus', p.urgent_bonus,
             'provider_net', p.provider_net, 'platform_net', p.platform_net, 'escrow_status', p.escrow_status,
             'released_at', p.released_at
           ) order by p.paid_at)
      from public.payments p
      left join public.requests r on r.id = p.request_id
      left join public.profiles cl on cl.id = p.client_id
      left join public.profiles pv on pv.id = p.provider_id
      left join public.payment_charges c on c.payment_id = p.id
     where p.paid_at is not null
       and (p.paid_at at time zone 'Africa/Luanda')::date between p_from and p_to
     limit 10000
  ), '[]'::jsonb);
end;
$$;

-- ===========================================================================
-- 7. Permissões
-- ===========================================================================
do $$
declare
  f record;
begin
  -- Painel: acessíveis pela API, mas todas exigem o token de sessão.
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;

  -- Edge Functions: só com a service role.
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'pay\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;

  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private'
       and p.proname in ('merchant_tx_id', 'normalize_phone', 'gateway_text', 'check_values', 'expire_charges',
                         'charge_public', 'gateway_request', 'settle_charge')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;
