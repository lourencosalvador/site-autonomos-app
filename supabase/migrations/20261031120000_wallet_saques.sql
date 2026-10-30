/*
# Carteira com saldo e saques

Quando o admin confirma o pagamento do cliente, o valor líquido do serviço
entra no saldo da carteira do profissional. O profissional pede um saque
(indica IBAN e titular) e a AUTONOMOUS transfere manualmente; o admin marca o
saque como pago (ou rejeita com motivo).

Tabela própria `broadcast_withdrawals` (`withdrawals` é da app mobile).
Saldo disponível = líquido dos serviços pagos − saques pendentes e pagos.
*/

create table if not exists public.broadcast_withdrawals (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references public.profiles(id) on delete cascade,
  amount_minor    bigint not null check (amount_minor > 0),
  iban            text not null,
  iban_holder     text not null,
  status          text not null default 'pending' check (status in ('pending','paid','rejected','cancelled')),
  reference       text,
  rejected_reason text,
  created_at      timestamptz not null default now(),
  processed_at    timestamptz
);
create index if not exists idx_bw_provider on public.broadcast_withdrawals (provider_id, created_at desc);
create index if not exists idx_bw_status on public.broadcast_withdrawals (status, created_at);
alter table public.broadcast_withdrawals enable row level security;
drop policy if exists bw_own_select on public.broadcast_withdrawals;
create policy bw_own_select on public.broadcast_withdrawals for select to authenticated using (provider_id = auth.uid());
grant select on public.broadcast_withdrawals to authenticated;

create or replace function private.broadcast_provider_balance(p_uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with credits as (
    select coalesce(sum(coalesce(b.provider_net_minor, b.price_minor - coalesce(b.provider_fee_minor, 0))), 0) as total
      from public.service_broadcasts b
     where b.provider_id = p_uid and b.status = 'completed' and b.payment_status = 'paid'
  ), w as (
    select coalesce(sum(amount_minor) filter (where status = 'pending'), 0) as pending,
           coalesce(sum(amount_minor) filter (where status = 'paid'), 0) as paid
      from public.broadcast_withdrawals where provider_id = p_uid
  )
  select jsonb_build_object(
    'credited_minor', credits.total,
    'pending_withdrawal_minor', w.pending,
    'withdrawn_minor', w.paid,
    'available_minor', greatest(0, credits.total - w.pending - w.paid))
  from credits, w
$$;

create or replace function public.request_broadcast_withdrawal(p_amount_minor bigint, p_iban text, p_iban_holder text)
returns public.broadcast_withdrawals
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_iban text; v_available bigint; v_row public.broadcast_withdrawals;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and approval_status = 'approved'
                   and (role = 'professional' or (role is null and coalesce(trim(work_area), '') <> ''))) then
    raise exception 'NOT_APPROVED';
  end if;
  v_iban := private.ao_iban(p_iban);
  if v_iban is null then raise exception 'INVALID_IBAN'; end if;
  if coalesce(trim(p_iban_holder), '') = '' then raise exception 'HOLDER_REQUIRED'; end if;
  if p_amount_minor is null or p_amount_minor < 10000 then raise exception 'INVALID_AMOUNT'; end if;

  perform pg_advisory_xact_lock(hashtext('withdrawal:' || v_uid::text));
  if exists (select 1 from public.broadcast_withdrawals where provider_id = v_uid and status = 'pending') then
    raise exception 'WITHDRAWAL_PENDING';
  end if;
  v_available := (private.broadcast_provider_balance(v_uid)->>'available_minor')::bigint;
  if p_amount_minor > v_available then raise exception 'INSUFFICIENT_BALANCE'; end if;

  update public.profiles set iban = v_iban, iban_holder = trim(p_iban_holder), updated_at = now() where id = v_uid;
  insert into public.broadcast_withdrawals (provider_id, amount_minor, iban, iban_holder)
  values (v_uid, p_amount_minor, v_iban, trim(p_iban_holder))
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.cancel_broadcast_withdrawal(p_id uuid)
returns public.broadcast_withdrawals
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.broadcast_withdrawals;
begin
  update public.broadcast_withdrawals set status = 'cancelled', processed_at = now()
   where id = p_id and provider_id = auth.uid() and status = 'pending'
  returning * into v_row;
  if v_row.id is null then raise exception 'WITHDRAWAL_CLOSED'; end if;
  return v_row;
end $$;

create or replace function public.provider_wallet()
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v jsonb; v_bal jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  v_bal := private.broadcast_provider_balance(v_uid);
  with services as (
    select b.id, 'service'::text as type, b.category as label,
           b.price_minor as gross_minor, coalesce(b.provider_fee_minor, 0) as fee_minor,
           coalesce(b.provider_net_minor, b.price_minor - coalesce(b.provider_fee_minor, 0)) as amount_minor,
           case when b.status = 'completed' and b.payment_status = 'paid' then 'credited' else 'awaiting_payment' end as state,
           coalesce(b.payment_confirmed_at, b.completed_at, b.client_confirmed_at) as at,
           (select name from public.profiles where id = b.client_id) as client_name,
           null::text as reference, null::text as rejected_reason, null::text as iban
      from public.service_broadcasts b
     where b.provider_id = v_uid
       and ((b.status = 'completed' and b.payment_status = 'paid') or (b.status = 'accepted' and b.client_confirmed_at is not null))
  ), saques as (
    select w.id, 'withdrawal'::text, 'Saque'::text, null::bigint, null::bigint, w.amount_minor,
           w.status, coalesce(w.processed_at, w.created_at), null::text, w.reference, w.rejected_reason, w.iban
      from public.broadcast_withdrawals w
     where w.provider_id = v_uid and w.status <> 'cancelled'
  ), ledger as (select * from services union all select * from saques)
  select v_bal || jsonb_build_object(
    'upcoming_minor', coalesce((select sum(amount_minor) from services where state = 'awaiting_payment'), 0),
    'gross_minor', coalesce((select sum(gross_minor) from services where state = 'credited'), 0),
    'fees_minor', coalesce((select sum(fee_minor) from services where state = 'credited'), 0),
    'jobs_done', (select count(*) from services where state = 'credited'),
    'pending_withdrawal', (select to_jsonb(w) from public.broadcast_withdrawals w where w.provider_id = v_uid and w.status = 'pending' limit 1),
    'movements', coalesce((select jsonb_agg(to_jsonb(l) order by l.at desc nulls last) from ledger l), '[]'::jsonb)
  ) into v;
  return v;
end $$;

create or replace function public.admin_list_broadcast_withdrawals(p_token text, p_limit int default 300)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) into v from (
    select w.created_at,
           to_jsonb(w) || jsonb_build_object(
             'provider', (select jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone,
                                                    'email', case when u.email like '%@telefone.autonomous.ao' then null else u.email end,
                                                    'company_name', p.company_name)
                            from public.profiles p left join auth.users u on u.id = p.id where p.id = w.provider_id),
             'balance', private.broadcast_provider_balance(w.provider_id)) as j
      from public.broadcast_withdrawals w
     where w.status <> 'cancelled'
     order by w.created_at desc
     limit greatest(1, least(coalesce(p_limit, 300), 1000))
  ) x;
  return v;
end $$;

create or replace function public.admin_mark_broadcast_withdrawal_paid(p_token text, p_id uuid, p_reference text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  update public.broadcast_withdrawals
     set status = 'paid', processed_at = now(), reference = nullif(trim(coalesce(p_reference, '')), '')
   where id = p_id and status = 'pending';
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'withdrawal.paid', p_id::text, jsonb_build_object('reference', p_reference));
end $$;

create or replace function public.admin_reject_broadcast_withdrawal(p_token text, p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  update public.broadcast_withdrawals
     set status = 'rejected', processed_at = now(), rejected_reason = trim(p_reason)
   where id = p_id and status = 'pending';
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'withdrawal.reject', p_id::text, jsonb_build_object('reason', p_reason));
end $$;

create or replace function private.broadcast_withdrawal_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status and new.status in ('paid','rejected') then
    insert into public.notifications (user_id, type, title, body, link)
    values (new.provider_id,
            case when new.status = 'paid' then 'withdrawal_paid' else 'withdrawal_rejected' end,
            case when new.status = 'paid' then 'Saque transferido' else 'Saque não aprovado' end,
            case when new.status = 'paid'
                 then private.fmt_kz(new.amount_minor) || ' foram transferidos para a sua conta' || coalesce(' (ref. ' || new.reference || ')', '') || '.'
                 else coalesce(new.rejected_reason, 'Fale connosco para mais informações.') || ' O valor voltou ao seu saldo.' end,
            '/conta/financas');
  end if;
  return new;
end $$;

drop trigger if exists trg_broadcast_withdrawal_notify on public.broadcast_withdrawals;
create trigger trg_broadcast_withdrawal_notify after update on public.broadcast_withdrawals
  for each row execute function private.broadcast_withdrawal_notify();

-- O pagamento confirmado passa a ir para o saldo (texto da notificação).
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
      private.fmt_kz(new.provider_net_minor) || ' foram adicionados ao seu saldo. Pode sacar na carteira.', new.id);
  end if;
  if new.payment_status = 'rejected' and old.payment_status is distinct from 'rejected' then
    perform private.notify(new.client_id, 'payment_rejected', 'Comprovativo não aceite',
      coalesce(new.payment_rejected_reason, 'Envie um novo comprovativo.'), new.id);
  end if;
  return new;
end $$;

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
    else b.status end
$$;

create or replace function public.admin_app_requests_count(p_token text)
returns int
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); n int;
begin
  select count(*)::int into n
    from public.service_broadcasts b
   where (b.status = 'accepted' and b.payment_status = 'submitted')
      or (b.status = 'accepted' and b.quote_status = 'rejected' and b.admin_contacted_at is null);
  return n;
end $$;

create or replace function public.admin_broadcast_withdrawals_count(p_token text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_admin private.admins := private.require_admin(p_token); n int;
begin
  select count(*)::int into n from public.broadcast_withdrawals where status = 'pending';
  return n;
end $$;

grant execute on function public.request_broadcast_withdrawal(bigint, text, text)        to authenticated;
grant execute on function public.cancel_broadcast_withdrawal(uuid)                       to authenticated;
grant execute on function public.provider_wallet()                             to authenticated;
grant execute on function public.admin_list_broadcast_withdrawals(text, int)             to anon, authenticated;
grant execute on function public.admin_mark_broadcast_withdrawal_paid(text, uuid, text)  to anon, authenticated;
grant execute on function public.admin_reject_broadcast_withdrawal(text, uuid, text)     to anon, authenticated;
grant execute on function public.admin_broadcast_withdrawals_count(text)                 to anon, authenticated;
