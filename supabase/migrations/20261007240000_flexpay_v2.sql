/*
# FlexPay v2 — pagamento único + conclusão em 2 passos

Substitui o modelo 30/70 por um pagamento único em escrow:
- Preço: Total do trabalho (2.000 Kz) + taxa de serviço 10% = Total a pagar (2.200 Kz).
- O cliente paga o total; fica retido na conta da empresa (escrow).
- Conclusão: o PRESTADOR marca "Serviço concluído"; depois o CLIENTE confirma
  a conclusão — nesse momento o valor é libertado para o prestador.

Autossuficiente (pode correr mesmo que o FlexPay anterior não tenha sido aplicado).
*/

alter table public.service_broadcasts
  add column if not exists price_minor        bigint  not null default 200000, -- total do trabalho (2.000 Kz)
  add column if not exists payment_status     text    not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  add column if not exists paid_at            timestamptz,
  add column if not exists held_minor         bigint,        -- total retido em escrow (trabalho + taxa)
  add column if not exists provider_done_at   timestamptz,   -- prestador marcou concluído
  add column if not exists escrow_released    boolean not null default false,
  add column if not exists escrow_released_at timestamptz;

-- Taxa de serviço (10%).
create or replace function public.flexpay_fee(p_work bigint)
returns bigint language sql immutable set search_path = '' as $$
  select round(coalesce(p_work,0) * 0.10)::bigint
$$;

-- Prepara a cobrança (cobra o TOTAL = trabalho + 10%).
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

-- Pagamento confirmado → pedido pago e valor retido (total).
create or replace function private.sync_broadcast_payment()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'success' and new.site_request_id is not null
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    update public.service_broadcasts
       set payment_status = 'paid',
           paid_at = coalesce(paid_at, now()),
           held_minor = new.amount_minor,
           updated_at = now()
     where id = new.site_request_id and payment_status <> 'paid';
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_broadcast_payment on public.payment_charges;
create trigger trg_sync_broadcast_payment
  after insert or update of status on public.payment_charges
  for each row execute function private.sync_broadcast_payment();

-- Passo 1: o PRESTADOR marca o serviço como concluído.
create or replace function public.provider_mark_done(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set provider_done_at = now(), updated_at = now()
   where id = p_id and status = 'accepted' and provider_id = auth.uid()
  returning * into v_row;
  return v_row;
end $$;

-- Passo 2: o CLIENTE confirma a conclusão → liberta o valor ao prestador.
create or replace function public.complete_broadcast(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set status = 'completed', completed_at = now(), updated_at = now(),
         escrow_released = case when payment_status = 'paid' then true else escrow_released end,
         escrow_released_at = case when payment_status = 'paid' and escrow_released_at is null then now() else escrow_released_at end
   where id = p_id and client_id = auth.uid() and status = 'accepted' and provider_done_at is not null
  returning * into v_row;
  return v_row;
end $$;

grant execute on function public.flexpay_fee(bigint) to authenticated, anon;
grant execute on function public.pay_prepare_broadcast(uuid, uuid, text, text) to authenticated;
grant execute on function public.provider_mark_done(uuid) to authenticated;
