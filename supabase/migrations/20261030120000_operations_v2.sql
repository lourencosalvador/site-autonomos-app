/*
# Operações v2 (documento "alterações AUTONOMOUS")

1. Configuração da plataforma: taxas (cliente 10% + profissional 10%) e dados
   de pagamento (IBAN), editáveis no painel.
2. Empresas parceiras (lista gerida no painel) e perfil profissional completo
   (empresa, IBAN, BI, anos de experiência). Uma conta pode ter perfil de
   cliente e de profissional (activate_professional).
3. Pedido com localização estruturada (província, município, bairro, GPS).
4. Visita de diagnóstico gratuita: o profissional propõe datas, o cliente
   escolhe; enquanto a visita está pendente o orçamento fica bloqueado.
5. Orçamento com checklist (mão de obra, deslocação, materiais, …) e
   registo das taxas no momento da aceitação.
6. Pagamento DEPOIS do serviço: profissional conclui → cliente confirma →
   cliente transfere e envia comprovativo → admin confirma → concluído.
   A carteira regista bruto, taxas e líquido; o admin marca a transferência.
7. Avaliações nos dois sentidos.
8. Notificações (geradas por triggers) e mensagens não lidas.
*/

-- ───────────────────────────── Utilitários ─────────────────────────────
create or replace function private.ao_phone(p text)
returns text language plpgsql immutable set search_path = '' as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if length(d) = 12 and left(d, 3) = '244' then d := substr(d, 4); end if;
  if length(d) <> 9 or left(d, 1) <> '9' then return null; end if;
  return '+244 ' || substr(d, 1, 3) || ' ' || substr(d, 4, 3) || ' ' || substr(d, 7, 3);
end $$;

create or replace function private.ao_iban(p text)
returns text language plpgsql immutable set search_path = '' as $$
declare d text := upper(regexp_replace(coalesce(p, ''), '[^0-9A-Za-z]', '', 'g'));
begin
  if left(d, 4) = 'AO06' then d := substr(d, 5); end if;
  if d !~ '^[0-9]{21}$' then return null; end if;
  return 'AO06' || d;
end $$;

-- ───────────────────────────── 1. Configuração ─────────────────────────
create table if not exists public.app_settings (
  id                int primary key default 1 check (id = 1),
  client_fee_rate   numeric(5,4) not null default 0.10 check (client_fee_rate between 0 and 0.5),
  provider_fee_rate numeric(5,4) not null default 0.10 check (provider_fee_rate between 0 and 0.5),
  bank_name         text,
  iban              text,
  account_holder    text,
  updated_at        timestamptz not null default now()
);
alter table public.app_settings enable row level security;
insert into public.app_settings (id, iban, account_holder)
values (1, 'AO06004000008529834810207', 'EDSON SANTOS')
on conflict (id) do nothing;

create or replace function public.payment_info()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'client_fee_rate', client_fee_rate, 'provider_fee_rate', provider_fee_rate,
    'bank_name', bank_name, 'iban', iban, 'account_holder', account_holder)
  from public.app_settings where id = 1
$$;

create or replace function public.flexpay_fee(p_work bigint)
returns bigint language sql stable set search_path = '' as $$
  select round(coalesce(p_work, 0) * coalesce((select client_fee_rate from public.app_settings where id = 1), 0.10))::bigint
$$;

create or replace function public.admin_update_app_settings(
  p_token text, p_client_fee_rate numeric, p_provider_fee_rate numeric,
  p_bank_name text, p_iban text, p_account_holder text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token); v_iban text;
begin
  if p_client_fee_rate is null or p_client_fee_rate < 0 or p_client_fee_rate > 0.5
     or p_provider_fee_rate is null or p_provider_fee_rate < 0 or p_provider_fee_rate > 0.5 then
    raise exception 'invalid_rate';
  end if;
  v_iban := private.ao_iban(p_iban);
  if v_iban is null then raise exception 'invalid_iban'; end if;
  if coalesce(trim(p_account_holder), '') = '' then raise exception 'invalid_name'; end if;
  update public.app_settings
     set client_fee_rate = p_client_fee_rate, provider_fee_rate = p_provider_fee_rate,
         bank_name = nullif(trim(coalesce(p_bank_name, '')), ''), iban = v_iban,
         account_holder = trim(p_account_holder), updated_at = now()
   where id = 1;
  perform private.audit(v_admin, 'settings.payment', '1',
    jsonb_build_object('client_fee_rate', p_client_fee_rate, 'provider_fee_rate', p_provider_fee_rate));
  return public.payment_info();
end $$;

-- ───────────────────────────── 2. Empresas e perfil ────────────────────
create table if not exists public.partner_companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 2 and 80),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists partner_companies_name_key on public.partner_companies (lower(trim(name)));
alter table public.partner_companies enable row level security;
drop policy if exists pc_public_select on public.partner_companies;
create policy pc_public_select on public.partner_companies for select to anon, authenticated using (active);
grant select on public.partner_companies to anon, authenticated;

alter table public.profiles
  add column if not exists company_id       uuid references public.partner_companies(id) on delete set null,
  add column if not exists iban             text,
  add column if not exists iban_holder      text,
  add column if not exists id_document_url  text,
  add column if not exists experience_years int;

create or replace function public.admin_list_companies(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id, 'name', c.name, 'active', c.active, 'created_at', c.created_at,
           'professionals', (select count(*) from public.profiles p where p.company_id = c.id)) order by c.name), '[]'::jsonb)
    into v from public.partner_companies c;
  return v;
end $$;

create or replace function public.admin_save_company(p_token text, p_id uuid, p_name text, p_active boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token); v_id uuid;
begin
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'invalid_name'; end if;
  if p_id is null then
    insert into public.partner_companies (name, active) values (trim(p_name), coalesce(p_active, true)) returning id into v_id;
  else
    update public.partner_companies set name = trim(p_name), active = coalesce(p_active, active) where id = p_id returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
    update public.profiles set company_name = trim(p_name) where company_id = v_id;
  end if;
  perform private.audit(v_admin, 'company.save', v_id::text, jsonb_build_object('name', p_name, 'active', p_active));
  return v_id;
exception when unique_violation then
  raise exception 'duplicate_name';
end $$;

create or replace function public.admin_delete_company(p_token text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  if exists (select 1 from public.profiles where company_id = p_id) then raise exception 'company_in_use'; end if;
  delete from public.partner_companies where id = p_id;
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'company.delete', p_id::text, '{}'::jsonb);
end $$;

drop function if exists public.update_my_profile(text,text,text[],text,text,text,text);
create or replace function public.update_my_profile(
  p_name text, p_phone text default null, p_work_areas text[] default null,
  p_specialty text default null, p_bio text default null, p_province text default null,
  p_company_id uuid default null, p_iban text default null, p_iban_holder text default null,
  p_experience_years int default null
)
returns public.profiles
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_row public.profiles; v_areas text[]; v_pro boolean;
        v_phone text; v_iban text; v_company text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'INVALID_NAME'; end if;

  select role = 'professional' or (role is null and coalesce(trim(work_area), '') <> '')
    into v_pro from public.profiles where id = v_uid;

  if coalesce(trim(p_phone), '') <> '' then
    v_phone := private.ao_phone(p_phone);
    if v_phone is null then raise exception 'INVALID_PHONE'; end if;
  end if;
  if v_pro and v_phone is null then raise exception 'PHONE_REQUIRED'; end if;

  if v_pro and p_work_areas is not null then
    select coalesce(array_agg(s.a order by s.i), '{}') into v_areas
      from (select trim(t.a) as a, min(t.i) as i
              from unnest(p_work_areas) with ordinality t(a, i)
             where coalesce(trim(t.a), '') <> ''
             group by trim(t.a)) s;
    if coalesce(array_length(v_areas, 1), 0) = 0 then raise exception 'AREAS_REQUIRED'; end if;
    if array_length(v_areas, 1) > 3 then raise exception 'TOO_MANY_AREAS'; end if;
  end if;

  if v_pro and p_company_id is not null then
    select name into v_company from public.partner_companies where id = p_company_id and active;
    if v_company is null then raise exception 'INVALID_COMPANY'; end if;
  end if;

  if v_pro and coalesce(trim(p_iban), '') <> '' then
    v_iban := private.ao_iban(p_iban);
    if v_iban is null then raise exception 'INVALID_IBAN'; end if;
  end if;

  if p_experience_years is not null and (p_experience_years < 0 or p_experience_years > 70) then
    raise exception 'INVALID_EXPERIENCE';
  end if;

  update public.profiles
     set name = trim(p_name),
         phone = v_phone,
         work_areas = case when v_pro and v_areas is not null then v_areas else work_areas end,
         work_area  = case when v_pro and v_areas is not null then v_areas[1] else work_area end,
         specialty = case when v_pro then nullif(trim(coalesce(p_specialty, '')), '') else specialty end,
         company_id = case when v_pro then p_company_id else company_id end,
         company_name = case when v_pro then v_company else company_name end,
         iban = case when v_pro then v_iban else iban end,
         iban_holder = case when v_pro then nullif(trim(coalesce(p_iban_holder, '')), '') else iban_holder end,
         experience_years = case when v_pro then p_experience_years else experience_years end,
         bio = nullif(trim(coalesce(p_bio, '')), ''),
         province = nullif(trim(coalesce(p_province, '')), ''),
         updated_at = now()
   where id = v_uid
  returning * into v_row;
  return v_row;
end $$;

-- Um cliente acrescenta o perfil profissional à mesma conta (fica por aprovar).
create or replace function public.activate_professional(
  p_work_areas text[], p_phone text, p_specialty text default null, p_experience_years int default null,
  p_bio text default null, p_company_id uuid default null, p_province text default null,
  p_id_document_url text default null)
returns public.profiles
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_row public.profiles; v_phone text; v_areas text[]; v_company text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from public.profiles where id = v_uid and role = 'professional') then raise exception 'ALREADY_PROFESSIONAL'; end if;
  v_phone := private.ao_phone(p_phone);
  if v_phone is null then raise exception 'INVALID_PHONE'; end if;
  select coalesce(array_agg(distinct trim(a)), '{}') into v_areas from unnest(coalesce(p_work_areas, '{}')) a where coalesce(trim(a), '') <> '';
  if coalesce(array_length(v_areas, 1), 0) = 0 then raise exception 'AREAS_REQUIRED'; end if;
  if array_length(v_areas, 1) > 3 then raise exception 'TOO_MANY_AREAS'; end if;
  if p_company_id is not null then
    select name into v_company from public.partner_companies where id = p_company_id and active;
    if v_company is null then raise exception 'INVALID_COMPANY'; end if;
  end if;
  update public.profiles
     set role = 'professional', approval_status = 'pending', approval_requested_at = now(),
         phone = v_phone, work_areas = v_areas, work_area = v_areas[1],
         specialty = nullif(trim(coalesce(p_specialty, '')), ''),
         experience_years = p_experience_years,
         bio = coalesce(nullif(trim(coalesce(p_bio, '')), ''), bio),
         company_id = p_company_id, company_name = v_company,
         province = coalesce(nullif(trim(coalesce(p_province, '')), ''), province),
         id_document_url = coalesce(p_id_document_url, id_document_url),
         updated_at = now()
   where id = v_uid
  returning * into v_row;
  return v_row;
end $$;

-- ───────────────────────────── 3–6. Pedidos ────────────────────────────
alter table public.service_broadcasts
  add column if not exists province             text,
  add column if not exists municipality         text,
  add column if not exists neighborhood         text,
  add column if not exists lat                  double precision,
  add column if not exists lng                  double precision,
  add column if not exists visit_status         text,
  add column if not exists visit_slots          timestamptz[] not null default '{}',
  add column if not exists visit_at             timestamptz,
  add column if not exists visit_note           text,
  add column if not exists visit_requested_at   timestamptz,
  add column if not exists visit_done_at        timestamptz,
  add column if not exists quote_items          jsonb not null default '[]'::jsonb,
  add column if not exists client_fee_minor     bigint,
  add column if not exists provider_fee_minor   bigint,
  add column if not exists provider_net_minor   bigint,
  add column if not exists client_confirmed_at  timestamptz,
  add column if not exists proof_url            text,
  add column if not exists proof_reference      text,
  add column if not exists proof_submitted_at   timestamptz,
  add column if not exists payment_rejected_reason text,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payout_status        text not null default 'pending',
  add column if not exists payout_at            timestamptz,
  add column if not exists payout_reference     text;

alter table public.service_broadcasts drop constraint if exists service_broadcasts_visit_status_check;
alter table public.service_broadcasts add constraint service_broadcasts_visit_status_check
  check (visit_status is null or visit_status in ('requested','scheduled','done'));
alter table public.service_broadcasts drop constraint if exists service_broadcasts_payment_status_check;
alter table public.service_broadcasts add constraint service_broadcasts_payment_status_check
  check (payment_status in ('unpaid','submitted','paid','rejected'));
alter table public.service_broadcasts drop constraint if exists service_broadcasts_payout_status_check;
alter table public.service_broadcasts add constraint service_broadcasts_payout_status_check
  check (payout_status in ('pending','paid'));

-- Pedidos antigos já pagos/concluídos: taxas calculadas com o modelo atual.
update public.service_broadcasts
   set client_fee_minor = coalesce(client_fee_minor, round(price_minor * 0.10)),
       provider_fee_minor = coalesce(provider_fee_minor, 0),
       provider_net_minor = coalesce(provider_net_minor, price_minor)
 where quote_status = 'accepted' and provider_net_minor is null;

drop function if exists public.create_broadcast(text,text,text,text,text,text);
create or replace function public.create_broadcast(
  p_category text, p_description text,
  p_service_date text default null, p_service_time text default null,
  p_city text default null, p_address text default null,
  p_province text default null, p_municipality text default null, p_neighborhood text default null,
  p_lat double precision default null, p_lng double precision default null
) returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(trim(p_category), '') = '' then raise exception 'CATEGORY_REQUIRED'; end if;
  if coalesce(trim(p_description), '') = '' then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if (p_lat is null) <> (p_lng is null) or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
    raise exception 'INVALID_LOCATION';
  end if;
  insert into public.service_broadcasts
    (client_id, category, description, service_date, service_time, city, address,
     province, municipality, neighborhood, lat, lng, status, expires_at)
  values
    (auth.uid(), trim(p_category), trim(p_description), p_service_date, p_service_time,
     nullif(trim(coalesce(p_city, p_municipality, '')), ''), nullif(trim(coalesce(p_address, '')), ''),
     nullif(trim(coalesce(p_province, '')), ''), nullif(trim(coalesce(p_municipality, '')), ''),
     nullif(trim(coalesce(p_neighborhood, '')), ''), p_lat, p_lng,
     'open', now() + interval '1 minute')
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.cancel_broadcast(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where id = p_id and client_id = auth.uid()
     and (status = 'open' or (status = 'accepted' and provider_done_at is null))
  returning * into v_row;
  return v_row;
end $$;

-- Visita de diagnóstico ---------------------------------------------------
create or replace function public.provider_request_visit(p_id uuid, p_slots timestamptz[], p_note text default null)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts; v_slots timestamptz[];
begin
  select coalesce(array_agg(distinct s order by s), '{}') into v_slots from unnest(coalesce(p_slots, '{}')) s where s > now();
  if coalesce(array_length(v_slots, 1), 0) = 0 then raise exception 'SLOTS_REQUIRED'; end if;
  if array_length(v_slots, 1) > 5 then raise exception 'TOO_MANY_SLOTS'; end if;
  if coalesce(array_length(p_slots, 1), 0) <> array_length(v_slots, 1) then raise exception 'INVALID_SLOTS'; end if;
  update public.service_broadcasts
     set visit_status = 'requested', visit_slots = v_slots, visit_at = null,
         visit_note = nullif(trim(coalesce(p_note, '')), ''), visit_requested_at = now(),
         quote_status = case when quote_status = 'onsite' then 'pending' else quote_status end,
         updated_at = now()
   where id = p_id and provider_id = auth.uid() and status = 'accepted'
     and quote_status in ('pending','onsite','rejected') and coalesce(visit_status, 'requested') = 'requested'
  returning * into v_row;
  if v_row.id is null then raise exception 'VISIT_CLOSED'; end if;
  return v_row;
end $$;

create or replace function public.provider_cancel_visit(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set visit_status = null, visit_slots = '{}', visit_at = null, updated_at = now()
   where id = p_id and provider_id = auth.uid() and status = 'accepted' and visit_status in ('requested','scheduled')
  returning * into v_row;
  if v_row.id is null then raise exception 'VISIT_CLOSED'; end if;
  return v_row;
end $$;

create or replace function public.client_schedule_visit(p_id uuid, p_slot timestamptz)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set visit_status = 'scheduled', visit_at = p_slot, updated_at = now()
   where id = p_id and client_id = auth.uid() and status = 'accepted'
     and visit_status = 'requested' and p_slot = any(visit_slots) and p_slot > now()
  returning * into v_row;
  if v_row.id is null then raise exception 'INVALID_SLOT'; end if;
  return v_row;
end $$;

create or replace function public.client_request_other_dates(p_id uuid, p_note text default null)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set visit_status = 'requested', visit_slots = '{}', visit_at = null,
         visit_note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now()
   where id = p_id and client_id = auth.uid() and status = 'accepted' and visit_status in ('requested','scheduled')
  returning * into v_row;
  if v_row.id is null then raise exception 'VISIT_CLOSED'; end if;
  return v_row;
end $$;

create or replace function public.provider_mark_visit_done(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set visit_status = 'done', visit_done_at = now(), updated_at = now()
   where id = p_id and provider_id = auth.uid() and status = 'accepted' and visit_status = 'scheduled'
  returning * into v_row;
  if v_row.id is null then raise exception 'VISIT_CLOSED'; end if;
  return v_row;
end $$;

-- Orçamento ---------------------------------------------------------------
create or replace function private.clean_quote_items(p jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', e->>'key',
           'label', left(coalesce(nullif(trim(e->>'label'), ''), e->>'key'), 60),
           'amount_minor', case when (e->>'amount_minor') ~ '^[0-9]{1,13}$' then (e->>'amount_minor')::bigint end)), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) e
  where e->>'key' in ('mao_de_obra','deslocacao','materiais','equipamentos','outros')
$$;

drop function if exists public.provider_send_quote(uuid, bigint, text);
create or replace function public.provider_send_quote(p_id uuid, p_amount_minor bigint, p_note text default null, p_items jsonb default '[]'::jsonb)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts; v_b public.service_broadcasts;
begin
  if p_amount_minor is null or p_amount_minor < 10000 or p_amount_minor > 100000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;
  select * into v_b from public.service_broadcasts where id = p_id and provider_id = auth.uid();
  if v_b.id is null then raise exception 'QUOTE_CLOSED'; end if;
  if v_b.visit_status in ('requested','scheduled') then raise exception 'VISIT_PENDING'; end if;
  update public.service_broadcasts
     set quote_minor = p_amount_minor,
         quote_note = nullif(trim(coalesce(p_note, '')), ''),
         quote_items = private.clean_quote_items(p_items),
         quote_status = 'sent', quote_sent_at = now(), quote_responded_at = null, updated_at = now()
   where id = p_id and provider_id = auth.uid()
     and status = 'accepted' and payment_status = 'unpaid'
     and quote_status in ('pending','onsite','sent','rejected')
  returning * into v_row;
  if v_row.id is null then raise exception 'QUOTE_CLOSED'; end if;
  return v_row;
end $$;

drop function if exists public.provider_quote_onsite(uuid);

create or replace function public.client_respond_quote(p_id uuid, p_accept boolean)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts; s public.app_settings;
begin
  select * into s from public.app_settings where id = 1;
  update public.service_broadcasts
     set quote_status = case when p_accept then 'accepted' else 'rejected' end,
         price_minor = case when p_accept then quote_minor else price_minor end,
         client_fee_minor = case when p_accept then round(quote_minor * coalesce(s.client_fee_rate, 0.10)) else client_fee_minor end,
         provider_fee_minor = case when p_accept then round(quote_minor * coalesce(s.provider_fee_rate, 0.10)) else provider_fee_minor end,
         provider_net_minor = case when p_accept then quote_minor - round(quote_minor * coalesce(s.provider_fee_rate, 0.10)) else provider_net_minor end,
         quote_responded_at = now(), updated_at = now()
   where id = p_id and client_id = auth.uid()
     and status = 'accepted' and payment_status = 'unpaid'
     and quote_status = 'sent' and coalesce(quote_minor, 0) > 0
  returning * into v_row;
  if v_row.id is null then raise exception 'QUOTE_CLOSED'; end if;
  return v_row;
end $$;

-- Conclusão e pagamento ----------------------------------------------------
create or replace function public.provider_mark_done(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set provider_done_at = now(), updated_at = now()
   where id = p_id and status = 'accepted' and provider_id = auth.uid()
     and quote_status = 'accepted' and provider_done_at is null
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.client_confirm_service(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set client_confirmed_at = now(), updated_at = now()
   where id = p_id and client_id = auth.uid() and status = 'accepted'
     and provider_done_at is not null and client_confirmed_at is null
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.complete_broadcast(p_id uuid)
returns public.service_broadcasts
language sql security definer set search_path = public, pg_temp as $$
  select * from public.client_confirm_service(p_id)
$$;

create or replace function public.client_submit_payment(p_id uuid, p_proof_url text, p_reference text default null)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  if coalesce(trim(p_proof_url), '') = '' then raise exception 'PROOF_REQUIRED'; end if;
  update public.service_broadcasts
     set payment_status = 'submitted', proof_url = trim(p_proof_url),
         proof_reference = nullif(trim(coalesce(p_reference, '')), ''),
         proof_submitted_at = now(), payment_rejected_reason = null, updated_at = now()
   where id = p_id and client_id = auth.uid() and status = 'accepted'
     and client_confirmed_at is not null and payment_status in ('unpaid','rejected')
  returning * into v_row;
  if v_row.id is null then raise exception 'PAYMENT_CLOSED'; end if;
  return v_row;
end $$;

drop function if exists public.pay_test_broadcast(uuid);

create or replace function public.admin_confirm_payment(p_token text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  update public.service_broadcasts
     set payment_status = 'paid', paid_at = now(), payment_confirmed_at = now(),
         held_minor = price_minor + coalesce(client_fee_minor, 0),
         status = 'completed', completed_at = now(), escrow_released = true, escrow_released_at = now(),
         updated_at = now()
   where id = p_id and status = 'accepted' and payment_status = 'submitted';
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'payment.confirm', p_id::text, '{}'::jsonb);
end $$;

create or replace function public.admin_reject_payment(p_token text, p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  update public.service_broadcasts
     set payment_status = 'rejected', payment_rejected_reason = trim(p_reason), updated_at = now()
   where id = p_id and status = 'accepted' and payment_status = 'submitted';
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'payment.reject', p_id::text, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_mark_payout(p_token text, p_id uuid, p_reference text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  update public.service_broadcasts
     set payout_status = 'paid', payout_at = now(), payout_reference = nullif(trim(coalesce(p_reference, '')), ''), updated_at = now()
   where id = p_id and status = 'completed' and payment_status = 'paid' and payout_status = 'pending';
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'payout.mark', p_id::text, jsonb_build_object('reference', p_reference));
end $$;

-- Carteira de registo ------------------------------------------------------
create or replace function public.provider_wallet()
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  with rows as (
    select b.*,
           coalesce(b.provider_net_minor, b.price_minor - coalesce(b.provider_fee_minor, 0)) as net,
           case when b.status = 'completed' and b.payout_status = 'paid' then 'transferred'
                when b.status = 'completed' then 'due'
                else 'awaiting_payment' end as state
      from public.service_broadcasts b
     where b.provider_id = v_uid
       and (b.status = 'completed' or (b.status = 'accepted' and b.client_confirmed_at is not null))
  )
  select jsonb_build_object(
    'transferred_minor', coalesce(sum(net) filter (where state = 'transferred'), 0),
    'due_minor',         coalesce(sum(net) filter (where state = 'due'), 0),
    'upcoming_minor',    coalesce(sum(net) filter (where state = 'awaiting_payment'), 0),
    'gross_minor',       coalesce(sum(price_minor) filter (where status = 'completed'), 0),
    'fees_minor',        coalesce(sum(coalesce(provider_fee_minor, 0)) filter (where status = 'completed'), 0),
    'jobs_done',         count(*) filter (where status = 'completed'),
    'available_minor',   coalesce(sum(net) filter (where state in ('transferred','due')), 0),
    'pending_minor',     coalesce(sum(net) filter (where state = 'awaiting_payment'), 0),
    'movements', coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'category', category, 'gross_minor', price_minor,
        'fee_minor', coalesce(provider_fee_minor, 0), 'amount_minor', net, 'state', state,
        'kind', case when state = 'awaiting_payment' then 'pending' else 'available' end,
        'payout_at', payout_at, 'payout_reference', payout_reference,
        'at', coalesce(payout_at, completed_at, client_confirmed_at),
        'client_name', (select name from public.profiles where id = rows.client_id))
      order by coalesce(payout_at, completed_at, client_confirmed_at) desc), '[]'::jsonb)
  ) into v from rows;
  return v;
end $$;

-- ───────────────────────────── 7. Avaliações ───────────────────────────
create table if not exists public.broadcast_client_reviews (
  id           uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null unique references public.service_broadcasts(id) on delete cascade,
  provider_id  uuid not null references public.profiles(id) on delete cascade,
  client_id    uuid not null references public.profiles(id) on delete cascade,
  rating       int  not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);
alter table public.broadcast_client_reviews enable row level security;
drop policy if exists bcr_participant_select on public.broadcast_client_reviews;
create policy bcr_participant_select on public.broadcast_client_reviews for select to authenticated
  using (provider_id = auth.uid() or client_id = auth.uid());
grant select on public.broadcast_client_reviews to authenticated;

create or replace function public.rate_provider(p_broadcast uuid, p_rating int, p_comment text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); b public.service_broadcasts;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;
  select * into b from public.service_broadcasts where id = p_broadcast;
  if b.id is null then raise exception 'NOT_FOUND'; end if;
  if b.client_id is distinct from v_uid then raise exception 'FORBIDDEN'; end if;
  if b.status <> 'completed' and b.client_confirmed_at is null then raise exception 'NOT_COMPLETED'; end if;
  if b.provider_id is null then raise exception 'NO_PROVIDER'; end if;
  if exists (select 1 from public.broadcast_reviews where broadcast_id = p_broadcast) then raise exception 'ALREADY_RATED'; end if;
  insert into public.broadcast_reviews (broadcast_id, provider_id, client_id, rating, comment)
  values (p_broadcast, b.provider_id, v_uid, p_rating, nullif(trim(coalesce(p_comment, '')), ''));
end $$;

create or replace function public.rate_client(p_broadcast uuid, p_rating int, p_comment text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); b public.service_broadcasts;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;
  select * into b from public.service_broadcasts where id = p_broadcast;
  if b.id is null then raise exception 'NOT_FOUND'; end if;
  if b.provider_id is distinct from v_uid then raise exception 'FORBIDDEN'; end if;
  if b.status <> 'completed' and b.client_confirmed_at is null then raise exception 'NOT_COMPLETED'; end if;
  if exists (select 1 from public.broadcast_client_reviews where broadcast_id = p_broadcast) then raise exception 'ALREADY_RATED'; end if;
  insert into public.broadcast_client_reviews (broadcast_id, provider_id, client_id, rating, comment)
  values (p_broadcast, v_uid, b.client_id, p_rating, nullif(trim(coalesce(p_comment, '')), ''));
end $$;

-- ───────────────────────────── 8. Notificações ─────────────────────────
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         text not null,
  title        text not null,
  body         text,
  link         text,
  broadcast_id uuid references public.service_broadcasts(id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notif_own_select on public.notifications;
create policy notif_own_select on public.notifications for select to authenticated using (user_id = auth.uid());
grant select on public.notifications to authenticated;

create or replace function private.notify(p_user uuid, p_type text, p_title text, p_body text, p_broadcast uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, title, body, link, broadcast_id)
  select p_user, p_type, p_title, p_body,
         case when p_broadcast is not null then '/conta/pedido/' || p_broadcast::text end, p_broadcast
   where p_user is not null
$$;

create or replace function private.fmt_kz(p bigint)
returns text language sql immutable set search_path = '' as $$
  select replace(to_char(round(coalesce(p, 0) / 100.0), 'FM999G999G999G990'), ',', '.') || ' Kz'
$$;

create or replace function private.broadcast_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_provider text; v_client text;
begin
  select name into v_provider from public.profiles where id = new.provider_id;
  select name into v_client from public.profiles where id = new.client_id;

  if old.status = 'open' and new.status = 'accepted' then
    perform private.notify(new.client_id, 'accepted', 'Profissional encontrado',
      coalesce(v_provider, 'Um profissional') || ' aceitou o seu pedido de ' || new.category || '.', new.id);
  end if;
  if old.status <> 'no_providers' and new.status = 'no_providers' then
    perform private.notify(new.client_id, 'no_providers', 'Sem profissionais disponíveis',
      'De momento não há profissionais disponíveis para ' || new.category || '.', new.id);
  end if;
  if old.status = 'accepted' and new.status = 'cancelled' then
    perform private.notify(new.provider_id, 'cancelled', 'Pedido cancelado',
      coalesce(v_client, 'O cliente') || ' cancelou o pedido de ' || new.category || '.', new.id);
  end if;

  if new.visit_status = 'requested' and coalesce(array_length(new.visit_slots, 1), 0) > 0
     and (old.visit_status is distinct from 'requested' or old.visit_slots is distinct from new.visit_slots) then
    perform private.notify(new.client_id, 'visit_requested', 'Agende a visita de diagnóstico',
      coalesce(v_provider, 'O profissional') || ' precisa de ver o local para fazer o orçamento. Escolha uma das datas propostas. A visita é gratuita.', new.id);
  end if;
  if new.visit_status = 'requested' and coalesce(array_length(new.visit_slots, 1), 0) = 0
     and coalesce(array_length(old.visit_slots, 1), 0) > 0 then
    perform private.notify(new.provider_id, 'visit_reschedule', 'O cliente pediu outras datas',
      coalesce(nullif(new.visit_note, ''), 'Proponha novas datas para a visita de diagnóstico.'), new.id);
  end if;
  if new.visit_status = 'scheduled' and old.visit_status is distinct from 'scheduled' then
    perform private.notify(new.provider_id, 'visit_scheduled', 'Visita agendada',
      coalesce(v_client, 'O cliente') || ' marcou a visita para ' || to_char(new.visit_at at time zone 'Africa/Luanda', 'DD/MM "às" HH24:MI') || '.', new.id);
  end if;
  if old.visit_status in ('requested','scheduled') and new.visit_status is null then
    perform private.notify(new.client_id, 'visit_cancelled', 'Visita dispensada',
      coalesce(v_provider, 'O profissional') || ' vai enviar o orçamento sem visita.', new.id);
  end if;
  if new.visit_status = 'done' and old.visit_status is distinct from 'done' then
    perform private.notify(new.client_id, 'visit_done', 'Visita realizada',
      coalesce(v_provider, 'O profissional') || ' vai agora enviar-lhe o orçamento.', new.id);
  end if;

  if new.quote_status = 'sent' and new.quote_sent_at is distinct from old.quote_sent_at then
    perform private.notify(new.client_id, 'quote_sent', 'Orçamento recebido',
      coalesce(v_provider, 'O profissional') || ' enviou um orçamento de ' || private.fmt_kz(new.quote_minor) || '.', new.id);
  end if;
  if new.quote_status = 'accepted' and old.quote_status is distinct from 'accepted' then
    perform private.notify(new.provider_id, 'quote_accepted', 'Orçamento aceite',
      coalesce(v_client, 'O cliente') || ' aceitou o orçamento de ' || private.fmt_kz(new.quote_minor) || '. Pode avançar com o serviço.', new.id);
  end if;
  if new.quote_status = 'rejected' and old.quote_status is distinct from 'rejected' then
    perform private.notify(new.provider_id, 'quote_rejected', 'Orçamento recusado',
      coalesce(v_client, 'O cliente') || ' recusou o orçamento. Pode enviar um novo valor.', new.id);
  end if;

  if new.provider_done_at is not null and old.provider_done_at is null then
    perform private.notify(new.client_id, 'provider_done', 'Confirme a conclusão do serviço',
      coalesce(v_provider, 'O profissional') || ' marcou o serviço como concluído.', new.id);
  end if;
  if new.client_confirmed_at is not null and old.client_confirmed_at is null then
    perform private.notify(new.provider_id, 'client_confirmed', 'Serviço confirmado',
      coalesce(v_client, 'O cliente') || ' confirmou a conclusão. Aguarde a confirmação do pagamento.', new.id);
  end if;
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    perform private.notify(new.client_id, 'payment_confirmed', 'Pagamento confirmado',
      'Recebemos o seu pagamento. Obrigado por usar a AUTONOMOUS.', new.id);
    perform private.notify(new.provider_id, 'payment_confirmed', 'Pagamento recebido',
      private.fmt_kz(new.provider_net_minor) || ' vão ser transferidos para a sua conta.', new.id);
  end if;
  if new.payment_status = 'rejected' and old.payment_status is distinct from 'rejected' then
    perform private.notify(new.client_id, 'payment_rejected', 'Comprovativo não aceite',
      coalesce(new.payment_rejected_reason, 'Envie um novo comprovativo.'), new.id);
  end if;
  if new.payout_status = 'paid' and old.payout_status is distinct from 'paid' then
    perform private.notify(new.provider_id, 'payout', 'Transferência efetuada',
      private.fmt_kz(new.provider_net_minor) || ' foram transferidos para a sua conta.', new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_broadcast_notify on public.service_broadcasts;
create trigger trg_broadcast_notify after update on public.service_broadcasts
  for each row execute function private.broadcast_notify();

create or replace function private.approval_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.approval_status is distinct from old.approval_status then
    if new.approval_status = 'approved' then
      perform private.notify(new.id, 'approved', 'Perfil aprovado', 'Já pode receber pedidos de clientes.');
    elsif new.approval_status = 'rejected' then
      perform private.notify(new.id, 'rejected', 'Perfil não aprovado', 'Fale connosco para rever a situação.');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_approval_notify on public.profiles;
create trigger trg_approval_notify after update of approval_status on public.profiles
  for each row execute function private.approval_notify();

create or replace function public.my_notifications(p_limit int default 50)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]'::jsonb)
    from (select * from public.notifications where user_id = auth.uid()
          order by created_at desc limit greatest(1, least(coalesce(p_limit, 50), 200))) n
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids))
$$;

create or replace function public.my_unread()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'notifications', (select count(*) from public.notifications where user_id = auth.uid() and read_at is null),
    'messages', coalesce((select sum(c) from (
        select count(*) c from public.broadcast_messages m join public.service_broadcasts b on b.id = m.broadcast_id
         where (b.client_id = auth.uid() or b.provider_id = auth.uid()) and m.sender_id <> auth.uid() and m.read_at is null) t), 0),
    'by_broadcast', coalesce((select jsonb_object_agg(broadcast_id, c) from (
        select m.broadcast_id, count(*) c from public.broadcast_messages m join public.service_broadcasts b on b.id = m.broadcast_id
         where (b.client_id = auth.uid() or b.provider_id = auth.uid()) and m.sender_id <> auth.uid() and m.read_at is null
         group by m.broadcast_id) t), '{}'::jsonb))
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ───────────────────────────── Leitura dos pedidos ─────────────────────
create or replace function public.get_broadcast(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  select (case when b.client_id = auth.uid() or b.provider_id = auth.uid() then to_jsonb(b)
               else to_jsonb(b) - 'address' - 'lat' - 'lng' end) - 'admin_note'
         || jsonb_build_object(
              'seconds_left', greatest(0, floor(extract(epoch from (b.expires_at - now())))::int),
              'client_rated', exists (select 1 from public.broadcast_reviews r where r.broadcast_id = b.id),
              'provider_rated', exists (select 1 from public.broadcast_client_reviews r where r.broadcast_id = b.id),
              'client', (select jsonb_build_object('id',c.id,'name',c.name,'avatar_url',c.avatar_url,
                                                   'phone', case when b.provider_id = auth.uid() or b.client_id = auth.uid() then c.phone end)
                         from public.profiles c where c.id = b.client_id),
              'provider', (select jsonb_build_object('id',pr.id,'name',pr.name,'avatar_url',pr.avatar_url,'phone',pr.phone,
                                                     'work_area',pr.work_area,'work_areas',pr.work_areas,
                                                     'specialty',pr.specialty,'company_name',pr.company_name)
                           from public.profiles pr where pr.id = b.provider_id))
    into v
  from public.service_broadcasts b
  where b.id = p_id
    and (
      b.client_id = auth.uid()
      or b.provider_id = auth.uid()
      or (b.status = 'open' and b.provider_id is null and public.can_serve_category(b.category))
    );
  return v;
end $$;

create or replace function public.list_open_broadcasts()
returns setof jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(array_length(public.my_service_areas(), 1), 0) = 0 then return; end if;
  return query
    select to_jsonb(b) - 'admin_note' - 'address' - 'lat' - 'lng'
           || jsonb_build_object(
                'client', jsonb_build_object('id',c.id,'name',c.name,'avatar_url',c.avatar_url))
    from public.service_broadcasts b
    join public.profiles c on c.id = b.client_id
    where b.status = 'open' and b.provider_id is null
      and b.client_id <> auth.uid()
      and public.can_serve_category(b.category)
    order by b.created_at desc;
end $$;

create or replace function public.my_broadcasts()
returns setof jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then return; end if;
  return query
    select to_jsonb(b) - 'admin_note'
           || jsonb_build_object(
                'unread', (select count(*) from public.broadcast_messages m
                            where m.broadcast_id = b.id and m.sender_id <> auth.uid() and m.read_at is null),
                'client',   (select jsonb_build_object('id',c.id,'name',c.name,'avatar_url',c.avatar_url,'phone',c.phone)
                             from public.profiles c where c.id = b.client_id),
                'provider', (select jsonb_build_object('id',pr.id,'name',pr.name,'avatar_url',pr.avatar_url,'phone',pr.phone,
                                                       'company_name',pr.company_name)
                             from public.profiles pr where pr.id = b.provider_id))
    from public.service_broadcasts b
    where b.client_id = auth.uid() or b.provider_id = auth.uid()
    order by b.created_at desc;
end $$;

-- ───────────────────────────── Painel ──────────────────────────────────
create or replace function private.broadcast_stage(b public.service_broadcasts)
returns text language sql stable set search_path = '' as $$
  select case
    when b.status = 'open' and b.expires_at < now() then 'unanswered'
    when b.status = 'open' then 'searching'
    when b.status = 'accepted' and b.visit_status = 'requested' then 'visit_requested'
    when b.status = 'accepted' and b.visit_status = 'scheduled' then 'visit_scheduled'
    when b.status = 'accepted' and b.quote_status in ('pending','onsite') then 'quote_pending'
    when b.status = 'accepted' and b.quote_status = 'sent' then 'quote_sent'
    when b.status = 'accepted' and b.quote_status = 'rejected' then 'quote_rejected'
    when b.status = 'accepted' and b.provider_done_at is null then 'in_progress'
    when b.status = 'accepted' and b.client_confirmed_at is null then 'awaiting_confirmation'
    when b.status = 'accepted' and b.payment_status = 'submitted' then 'payment_review'
    when b.status = 'accepted' then 'awaiting_payment'
    when b.status = 'completed' and b.payout_status = 'pending' then 'payout_pending'
    else b.status end
$$;

create or replace function public.admin_app_requests(p_token text, p_limit int default 300)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) into v from (
    select b.created_at,
           to_jsonb(b) || jsonb_build_object(
             'stage', private.broadcast_stage(b),
             'client', (select jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'email', u.email)
                          from public.profiles c left join auth.users u on u.id = c.id where c.id = b.client_id),
             'provider', (select jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'email', u.email,
                                                    'company_name', p.company_name, 'iban', p.iban, 'iban_holder', p.iban_holder,
                                                    'work_areas', coalesce(p.work_areas, case when p.work_area is not null then array[p.work_area] end))
                            from public.profiles p left join auth.users u on u.id = p.id where p.id = b.provider_id)) as j
      from public.service_broadcasts b
     order by b.created_at desc
     limit greatest(1, least(coalesce(p_limit, 300), 1000))
  ) x;
  return v;
end $$;

create or replace function public.admin_app_requests_count(p_token text)
returns int
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); n int;
begin
  select count(*)::int into n
    from public.service_broadcasts b
   where (b.status = 'accepted' and b.payment_status = 'submitted')
      or (b.status = 'accepted' and b.quote_status = 'rejected' and b.admin_contacted_at is null)
      or (b.status = 'completed' and b.payment_status = 'paid' and b.payout_status = 'pending');
  return n;
end $$;

create or replace function public.admin_list_professionals(p_token text, p_status text default null, p_limit int default 200)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v from (
    select p.id, p.name, p.work_area,
           coalesce(p.work_areas, case when p.work_area is not null then array[p.work_area] end) as work_areas,
           p.company_name, p.company_id, p.specialty, p.phone, p.province, p.bio, p.avatar_url,
           p.id_document_url, p.experience_years, p.iban, p.iban_holder,
           coalesce(p.approval_status, 'pending') as approval_status,
           p.approval_reviewed_at,
           case when u.email like '%@telefone.autonomous.ao' then null else u.email end as email,
           u.created_at,
           (select count(*) from public.service_broadcasts b where b.provider_id = p.id and b.status = 'completed')::int as jobs_done
    from public.profiles p
    join auth.users u on u.id = p.id
    where (p.role = 'professional' or (p.role is null and coalesce(trim(p.work_area), '') <> ''))
      and (p_status is null or coalesce(p.approval_status, 'pending') = p_status)
    order by u.created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
  ) x;
  return v;
end $$;

-- ───────────────────────────── Comprovativos ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_proofs_insert" on storage.objects;
create policy "payment_proofs_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────────────────────── Permissões ──────────────────────────────
grant execute on function public.payment_info()                                                    to anon, authenticated;
grant execute on function public.admin_update_app_settings(text, numeric, numeric, text, text, text) to anon, authenticated;
grant execute on function public.admin_list_companies(text)                                        to anon, authenticated;
grant execute on function public.admin_save_company(text, uuid, text, boolean)                     to anon, authenticated;
grant execute on function public.admin_delete_company(text, uuid)                                  to anon, authenticated;
grant execute on function public.update_my_profile(text,text,text[],text,text,text,uuid,text,text,int) to authenticated;
grant execute on function public.activate_professional(text[],text,text,int,text,uuid,text,text)   to authenticated;
grant execute on function public.create_broadcast(text,text,text,text,text,text,text,text,text,double precision,double precision) to authenticated;
grant execute on function public.provider_request_visit(uuid, timestamptz[], text)                 to authenticated;
grant execute on function public.provider_cancel_visit(uuid)                                       to authenticated;
grant execute on function public.client_schedule_visit(uuid, timestamptz)                          to authenticated;
grant execute on function public.client_request_other_dates(uuid, text)                            to authenticated;
grant execute on function public.provider_mark_visit_done(uuid)                                    to authenticated;
grant execute on function public.provider_send_quote(uuid, bigint, text, jsonb)                    to authenticated;
grant execute on function public.client_confirm_service(uuid)                                      to authenticated;
grant execute on function public.client_submit_payment(uuid, text, text)                           to authenticated;
grant execute on function public.admin_confirm_payment(text, uuid)                                 to anon, authenticated;
grant execute on function public.admin_reject_payment(text, uuid, text)                            to anon, authenticated;
grant execute on function public.admin_mark_payout(text, uuid, text)                               to anon, authenticated;
grant execute on function public.rate_client(uuid, int, text)                                      to authenticated;
grant execute on function public.my_notifications(int)                                             to authenticated;
grant execute on function public.mark_notifications_read(uuid[])                                   to authenticated;
grant execute on function public.my_unread()                                                       to authenticated;
