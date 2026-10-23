/*
# Lançamento: visibilidade dos pedidos, várias áreas, empresa e orçamento

1. Correção: pedidos que "às vezes não aparecem" ao prestador.
   - O pedido deixava de ser visível 1 minuto depois de criado (expires_at),
     embora o cliente continuasse "à procura". Agora fica visível a todos os
     prestadores da área até ser aceite, cancelado ou fechado pelo apoio.
     expires_at passa a marcar apenas a entrada na fila do apoio ao cliente.
   - Perfis de prestador com role = NULL (corrida no registo) não recebiam
     pedidos. Corrige os dados e passa a reconhecer esses perfis.
   - Comparação de categoria sem diferenças de maiúsculas/espaços.

2. Prestador com até 3 áreas de atuação (profiles.work_areas). work_area
   continua a guardar a primeira área (compatibilidade com a app mobile).

3. Prestador que faz parte de uma empresa (profiles.company_name).

4. Orçamento: o prestador aceita o pedido, envia o valor (ou indica que vai
   fazer o orçamento no local), o cliente aceita o valor e só depois paga.
   quote_status: pending → onsite → sent → accepted | rejected (→ sent)

5. Funções do painel: pedidos da app com todas as etapas, prestadores com
   áreas e empresa, contacto ao cliente e orçamento em nome do prestador.
*/

-- ───────────────────────────── Perfis ─────────────────────────────
alter table public.profiles
  add column if not exists work_areas   text[],
  add column if not exists company_name text;

update public.profiles
   set role = 'professional'
 where role is null and coalesce(trim(work_area), '') <> '';

update public.profiles
   set work_areas = array[trim(work_area)]
 where work_areas is null and coalesce(trim(work_area), '') <> '';

create or replace function public.my_service_areas()
returns text[]
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select case
             when coalesce(array_length(p.work_areas, 1), 0) > 0 then p.work_areas
             when coalesce(trim(p.work_area), '') <> '' then array[p.work_area]
             else '{}'::text[]
           end
      from public.profiles p
     where p.id = auth.uid()
       and p.approval_status = 'approved'
       and (p.role = 'professional' or (p.role is null and coalesce(trim(p.work_area), '') <> ''))
  ), '{}'::text[])
$$;

create or replace function public.can_serve_category(p_category text)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from unnest(public.my_service_areas()) a
     where lower(trim(a)) = lower(trim(coalesce(p_category, '')))
  )
$$;

-- ───────────────────────────── Pedidos ────────────────────────────
alter table public.service_broadcasts
  add column if not exists quote_status       text not null default 'pending',
  add column if not exists quote_minor        bigint,
  add column if not exists quote_note         text,
  add column if not exists quote_sent_at      timestamptz,
  add column if not exists quote_responded_at timestamptz,
  add column if not exists onsite_at          timestamptz,
  add column if not exists admin_contacted_at timestamptz,
  add column if not exists admin_note         text;

alter table public.service_broadcasts drop constraint if exists service_broadcasts_quote_status_check;
alter table public.service_broadcasts
  add constraint service_broadcasts_quote_status_check
  check (quote_status in ('pending','onsite','sent','accepted','rejected'));

update public.service_broadcasts
   set quote_status = 'accepted', quote_minor = price_minor
 where status <> 'open' and quote_status = 'pending' and quote_minor is null;

alter table public.service_broadcasts alter column price_minor set default 0;

drop policy if exists sb_area_select on public.service_broadcasts;
create policy sb_area_select on public.service_broadcasts for select to authenticated
  using (status = 'open' and provider_id is null and public.can_serve_category(category));

create or replace function public.accept_broadcast(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts; v_approval text; v_role text; v_area text;
begin
  select role, approval_status, work_area into v_role, v_approval, v_area from public.profiles where id = auth.uid();
  if v_role is distinct from 'professional' and not (v_role is null and coalesce(trim(v_area), '') <> '') then
    raise exception 'NOT_PROFESSIONAL';
  end if;
  if v_approval is distinct from 'approved' then raise exception 'NOT_APPROVED'; end if;

  update public.service_broadcasts
     set status = 'accepted', provider_id = auth.uid(), accepted_at = now(), updated_at = now(),
         quote_status = 'pending'
   where id = p_id
     and status = 'open'
     and provider_id is null
     and client_id <> auth.uid()
     and public.can_serve_category(category)
  returning * into v_row;

  return v_row;
end $$;

create or replace function public.get_broadcast(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  select to_jsonb(b) - 'admin_note'
         || jsonb_build_object(
              'seconds_left', greatest(0, floor(extract(epoch from (b.expires_at - now())))::int),
              'client', (select jsonb_build_object('id',c.id,'name',c.name,'avatar_url',c.avatar_url,'phone',c.phone)
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
    select to_jsonb(b) - 'admin_note'
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
                'client',   (select jsonb_build_object('id',c.id,'name',c.name,'avatar_url',c.avatar_url,'phone',c.phone)
                             from public.profiles c where c.id = b.client_id),
                'provider', (select jsonb_build_object('id',pr.id,'name',pr.name,'avatar_url',pr.avatar_url,'phone',pr.phone,
                                                       'company_name',pr.company_name)
                             from public.profiles pr where pr.id = b.provider_id))
    from public.service_broadcasts b
    where b.client_id = auth.uid() or b.provider_id = auth.uid()
    order by b.created_at desc;
end $$;

-- ───────────────────────────── Orçamento ──────────────────────────
create or replace function public.provider_send_quote(p_id uuid, p_amount_minor bigint, p_note text default null)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  if p_amount_minor is null or p_amount_minor < 10000 or p_amount_minor > 100000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;
  update public.service_broadcasts
     set quote_minor = p_amount_minor,
         quote_note = nullif(trim(coalesce(p_note, '')), ''),
         quote_status = 'sent',
         quote_sent_at = now(),
         quote_responded_at = null,
         updated_at = now()
   where id = p_id and provider_id = auth.uid()
     and status = 'accepted' and payment_status = 'unpaid'
     and quote_status in ('pending','onsite','sent','rejected')
  returning * into v_row;
  if v_row.id is null then raise exception 'QUOTE_CLOSED'; end if;
  return v_row;
end $$;

create or replace function public.provider_quote_onsite(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set quote_status = 'onsite', onsite_at = now(), updated_at = now()
   where id = p_id and provider_id = auth.uid()
     and status = 'accepted' and payment_status = 'unpaid'
     and quote_status in ('pending','rejected')
  returning * into v_row;
  if v_row.id is null then raise exception 'QUOTE_CLOSED'; end if;
  return v_row;
end $$;

create or replace function public.client_respond_quote(p_id uuid, p_accept boolean)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set quote_status = case when p_accept then 'accepted' else 'rejected' end,
         price_minor = case when p_accept then quote_minor else price_minor end,
         quote_responded_at = now(),
         updated_at = now()
   where id = p_id and client_id = auth.uid()
     and status = 'accepted' and payment_status = 'unpaid'
     and quote_status = 'sent' and coalesce(quote_minor, 0) > 0
  returning * into v_row;
  if v_row.id is null then raise exception 'QUOTE_CLOSED'; end if;
  return v_row;
end $$;

-- Pagamento só depois de o cliente aceitar o orçamento.
create or replace function public.pay_prepare_broadcast(p_user uuid, p_id uuid, p_method text, p_phone text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  b public.service_broadcasts;
  v_total bigint;
  v_existing public.payment_charges;
  v_charge public.payment_charges;
  v_phone text; v_name text; v_profile_phone text;
begin
  if p_method not in ('REF','GPO') then raise exception 'invalid_method'; end if;
  select * into b from public.service_broadcasts where id = p_id;
  if b.id is null then raise exception 'request_not_found'; end if;
  if b.client_id is distinct from p_user then raise exception 'forbidden'; end if;
  if b.status not in ('accepted','completed') then raise exception 'request_closed'; end if;
  if b.payment_status = 'paid' then raise exception 'already_paid'; end if;
  if b.quote_status is distinct from 'accepted' then raise exception 'quote_not_accepted'; end if;
  if coalesce(b.price_minor, 0) <= 0 then raise exception 'amount_not_set'; end if;

  v_total := b.price_minor + public.flexpay_fee(b.price_minor);

  perform private.expire_charges();

  if p_method = 'REF' then
    select * into v_existing from public.payment_charges
      where site_request_id = b.id and method = 'REF' and status = 'pending' and amount_minor = v_total
        and reference_number is not null and (reference_due_at is null or reference_due_at > now() + interval '1 hour')
      order by created_at desc limit 1;
    if v_existing.id is not null then
      return jsonb_build_object('reuse', true, 'charge', private.charge_public(v_existing));
    end if;
  else
    v_phone := private.normalize_phone(p_phone);
    if v_phone is null then raise exception 'invalid_phone'; end if;
    if exists (select 1 from public.payment_charges
                where site_request_id = b.id and method = 'GPO' and status = 'pending'
                  and created_at > now() - interval '2 minutes') then
      raise exception 'charge_in_progress';
    end if;
  end if;

  select name, phone into v_name, v_profile_phone from public.profiles where id = p_user;

  insert into public.payment_charges (
    merchant_tx_id, method, purpose, site_request_id, client_id, provider_id, payer_name, payer_phone,
    description, amount_minor, currency, created_by
  ) values (
    private.merchant_tx_id(), p_method, 'service', b.id, b.client_id, b.provider_id, v_name,
    coalesce(v_phone, private.normalize_phone(v_profile_phone)),
    'AUTONOMOUS ' || coalesce(b.category, 'Servico'), v_total, 'AOA', 'app'
  )
  returning * into v_charge;

  insert into public.payment_charge_events (charge_id, source, status, message)
  values (v_charge.id, 'create', 'pending', 'Cobranca criada pela app (pedido web).');

  return jsonb_build_object(
    'reuse', false,
    'charge', private.charge_public(v_charge),
    'gateway_request', private.gateway_request(v_charge)
  );
end $$;

create or replace function public.pay_test_broadcast(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare b public.service_broadcasts; v_total bigint; v_name text; v_phone text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into b from public.service_broadcasts where id = p_id;
  if b.id is null then raise exception 'NOT_FOUND'; end if;
  if b.client_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
  if b.status <> 'accepted' then raise exception 'REQUEST_CLOSED'; end if;
  if b.payment_status = 'paid' then raise exception 'ALREADY_PAID'; end if;
  if b.quote_status is distinct from 'accepted' or coalesce(b.price_minor, 0) <= 0 then raise exception 'QUOTE_NOT_ACCEPTED'; end if;

  v_total := b.price_minor + public.flexpay_fee(b.price_minor);
  select name, phone into v_name, v_phone from public.profiles where id = b.client_id;

  insert into public.payment_charges (
    merchant_tx_id, method, purpose, site_request_id, client_id, provider_id, payer_name, payer_phone,
    description, amount_minor, currency, status, created_by, paid_at
  ) values (
    private.merchant_tx_id(), 'REF', 'service', b.id, b.client_id, b.provider_id, v_name, v_phone,
    'AUTONOMOUS TESTE ' || coalesce(b.category, ''), v_total, 'AOA', 'success', 'app', now()
  );

  select * into b from public.service_broadcasts where id = p_id;
  return b;
end $$;

-- ───────────────────────────── Perfil ─────────────────────────────
drop function if exists public.update_my_profile(text,text,text,text,text,text);
create or replace function public.update_my_profile(
  p_name text, p_phone text default null, p_work_areas text[] default null,
  p_specialty text default null, p_bio text default null, p_province text default null,
  p_company_name text default null
)
returns public.profiles
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_row public.profiles; v_areas text[]; v_pro boolean;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'INVALID_NAME'; end if;

  select role = 'professional' or (role is null and coalesce(trim(work_area), '') <> '')
    into v_pro from public.profiles where id = v_uid;

  if v_pro and p_work_areas is not null then
    select coalesce(array_agg(s.a order by s.i), '{}') into v_areas
      from (select trim(t.a) as a, min(t.i) as i
              from unnest(p_work_areas) with ordinality t(a, i)
             where coalesce(trim(t.a), '') <> ''
             group by trim(t.a)) s;
    if coalesce(array_length(v_areas, 1), 0) = 0 then raise exception 'AREAS_REQUIRED'; end if;
    if array_length(v_areas, 1) > 3 then raise exception 'TOO_MANY_AREAS'; end if;
  end if;

  update public.profiles
     set name = trim(p_name),
         phone = p_phone,
         work_areas = case when v_pro and v_areas is not null then v_areas else work_areas end,
         work_area  = case when v_pro and v_areas is not null then v_areas[1] else work_area end,
         specialty = case when v_pro then p_specialty else specialty end,
         company_name = case when v_pro then nullif(trim(coalesce(p_company_name, '')), '') else company_name end,
         bio = p_bio,
         province = p_province,
         updated_at = now()
   where id = v_uid
  returning * into v_row;
  return v_row;
end $$;

-- ───────────────────────────── Painel ─────────────────────────────
create or replace function private.broadcast_stage(b public.service_broadcasts)
returns text language sql stable set search_path = '' as $$
  select case
    when b.status = 'open' and b.expires_at < now() then 'unanswered'
    when b.status = 'open' then 'searching'
    when b.status = 'accepted' and b.payment_status = 'unpaid' then
      case b.quote_status
        when 'pending'  then 'quote_pending'
        when 'onsite'   then 'quote_onsite'
        when 'sent'     then 'quote_sent'
        when 'rejected' then 'quote_rejected'
        else 'awaiting_payment' end
    when b.status = 'accepted' and b.provider_done_at is not null then 'awaiting_confirmation'
    when b.status = 'accepted' then 'in_progress'
    else b.status end
$$;

create or replace function public.admin_app_requests(p_token text, p_limit int default 300)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v from (
    select b.id, b.category, b.description, b.city, b.address, b.service_date, b.service_time,
           b.status, private.broadcast_stage(b) as stage,
           b.quote_status, b.quote_minor, b.quote_note, b.quote_sent_at, b.quote_responded_at, b.onsite_at,
           b.price_minor, b.payment_status, b.paid_at, b.held_minor, b.provider_done_at,
           b.escrow_released, b.created_at, b.accepted_at, b.completed_at, b.cancelled_at,
           b.admin_contacted_at, b.admin_note,
           (select jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'email', u.email)
              from public.profiles c left join auth.users u on u.id = c.id where c.id = b.client_id) as client,
           (select jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'email', u.email,
                                      'company_name', p.company_name,
                                      'work_areas', coalesce(p.work_areas, case when p.work_area is not null then array[p.work_area] end))
              from public.profiles p left join auth.users u on u.id = p.id where p.id = b.provider_id) as provider
      from public.service_broadcasts b
     order by b.created_at desc
     limit greatest(1, least(coalesce(p_limit, 300), 1000))
  ) x;
  return v;
end $$;

-- Pedidos que precisam de uma chamada do admin: prestador de empresa aceitou
-- e ainda não há orçamento, ou o cliente recusou o orçamento.
create or replace function public.admin_app_requests_count(p_token text)
returns int
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); n int;
begin
  select count(*)::int into n
    from public.service_broadcasts b
    join public.profiles p on p.id = b.provider_id
   where b.status = 'accepted' and b.payment_status = 'unpaid' and b.admin_contacted_at is null
     and ((p.company_name is not null and b.quote_status in ('pending','onsite')) or b.quote_status = 'rejected');
  return n;
end $$;

create or replace function public.admin_mark_contacted(p_token text, p_broadcast uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  update public.service_broadcasts
     set admin_contacted_at = now(),
         admin_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), admin_note),
         updated_at = now()
   where id = p_broadcast;
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'app_request.contacted', p_broadcast::text, jsonb_build_object('note', p_note));
end $$;

create or replace function public.admin_set_quote(p_token text, p_broadcast uuid, p_amount_minor bigint, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  if p_amount_minor is null or p_amount_minor < 10000 then raise exception 'invalid_amount'; end if;
  update public.service_broadcasts
     set quote_minor = p_amount_minor,
         quote_note = nullif(trim(coalesce(p_note, '')), ''),
         quote_status = 'sent', quote_sent_at = now(), quote_responded_at = null, updated_at = now()
   where id = p_broadcast and status = 'accepted' and payment_status = 'unpaid'
     and quote_status in ('pending','onsite','sent','rejected');
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'app_request.quote', p_broadcast::text, jsonb_build_object('amount_minor', p_amount_minor));
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
           p.company_name, p.specialty, p.phone, p.province, p.bio,
           coalesce(p.approval_status, 'pending') as approval_status,
           p.approval_reviewed_at,
           u.email, u.created_at,
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

create or replace function public.admin_set_professional_approval(p_token text, p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'invalid_status'; end if;
  update public.profiles
     set approval_status = p_status,
         approval_reviewed_at = case when p_status = 'pending' then null else now() end,
         role = coalesce(role, 'professional'),
         updated_at = now()
   where id = p_id and (role = 'professional' or (role is null and coalesce(trim(work_area), '') <> ''));
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'professional.approval', p_id::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_professionals_pending(p_token text)
returns int
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); n int;
begin
  select count(*)::int into n from public.profiles p
   where (p.role = 'professional' or (p.role is null and coalesce(trim(p.work_area), '') <> ''))
     and coalesce(p.approval_status, 'pending') = 'pending';
  return n;
end $$;

create or replace function public.admin_search_providers(p_token text, p_query text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'name', p.name, 'company_name', p.company_name,
           'work_area', array_to_string(coalesce(p.work_areas, array[p.work_area]), ', ')) order by p.name), '[]'::jsonb) into v
  from public.profiles p
  where (p.role = 'professional' or (p.role is null and coalesce(trim(p.work_area), '') <> ''))
    and coalesce(p.approval_status, '') = 'approved'
    and (coalesce(p_query, '') = ''
         or p.name ilike '%' || p_query || '%'
         or coalesce(p.company_name, '') ilike '%' || p_query || '%'
         or array_to_string(coalesce(p.work_areas, array[p.work_area]), ' ') ilike '%' || p_query || '%')
  limit 20;
  return v;
end $$;

create or replace function public.admin_assign_provider(p_token text, p_broadcast uuid, p_provider uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  if not exists (select 1 from public.profiles
                  where id = p_provider and approval_status = 'approved'
                    and (role = 'professional' or (role is null and coalesce(trim(work_area), '') <> ''))) then
    raise exception 'invalid_provider';
  end if;
  update public.service_broadcasts
     set provider_id = p_provider, status = 'accepted', accepted_at = now(), updated_at = now(), quote_status = 'pending'
   where id = p_broadcast and status in ('open','no_providers');
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'support.assign', p_broadcast::text, jsonb_build_object('provider', p_provider));
end $$;

grant execute on function public.my_service_areas()                                  to authenticated;
grant execute on function public.can_serve_category(text)                            to authenticated;
grant execute on function public.provider_send_quote(uuid, bigint, text)             to authenticated;
grant execute on function public.provider_quote_onsite(uuid)                         to authenticated;
grant execute on function public.client_respond_quote(uuid, boolean)                 to authenticated;
grant execute on function public.update_my_profile(text,text,text[],text,text,text,text) to authenticated;
grant execute on function public.admin_app_requests(text, int)                       to anon, authenticated;
grant execute on function public.admin_app_requests_count(text)                      to anon, authenticated;
grant execute on function public.admin_mark_contacted(text, uuid, text)              to anon, authenticated;
grant execute on function public.admin_set_quote(text, uuid, bigint, text)           to anon, authenticated;
grant execute on function public.admin_professionals_pending(text)                   to anon, authenticated;
