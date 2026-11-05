/*
# Visita de diagnóstico: o cliente indica as datas

Novo fluxo (pedido do Edson):
1. O profissional pede a visita de diagnóstico com uma descrição (visit_note). Não propõe datas.
2. O cliente vê o pedido e indica 1 a 3 datas que lhe dão jeito (visit_slots + visit_client_note).
3. O profissional confirma uma dessas datas (visita agendada) ou pede outras.
4. Depois da visita, o profissional marca-a como realizada e envia o orçamento.

Estados (visit_status = 'requested'):
- visit_slots vazio      -> à espera das datas do cliente
- visit_slots preenchido -> à espera da confirmação do profissional
*/

alter table public.service_broadcasts add column if not exists visit_client_note text;

-- 1. Profissional pede a visita (ou pede outras datas, se nenhuma servir).
create or replace function public.provider_request_visit(p_id uuid, p_slots timestamptz[] default '{}', p_note text default null)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  if length(trim(coalesce(p_note, ''))) < 5 then raise exception 'NOTE_REQUIRED'; end if;
  update public.service_broadcasts
     set visit_status = 'requested', visit_slots = '{}', visit_at = null, visit_client_note = null,
         visit_note = left(trim(p_note), 1000), visit_requested_at = now(),
         quote_status = case when quote_status = 'onsite' then 'pending' else quote_status end,
         updated_at = now()
   where id = p_id and provider_id = auth.uid() and status = 'accepted'
     and quote_status in ('pending','onsite','rejected') and coalesce(visit_status, 'requested') = 'requested'
  returning * into v_row;
  if v_row.id is null then raise exception 'VISIT_CLOSED'; end if;
  return v_row;
end $$;

-- 2. Cliente indica as datas (pode alterá-las enquanto o profissional não confirmar).
create or replace function public.client_propose_visit_dates(p_id uuid, p_slots timestamptz[], p_note text default null)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts; v_slots timestamptz[];
begin
  select coalesce(array_agg(distinct s order by s), '{}') into v_slots from unnest(coalesce(p_slots, '{}')) s where s > now();
  if coalesce(array_length(p_slots, 1), 0) = 0 then raise exception 'SLOTS_REQUIRED'; end if;
  if coalesce(array_length(v_slots, 1), 0) <> array_length(p_slots, 1) then raise exception 'INVALID_SLOTS'; end if;
  if array_length(v_slots, 1) > 3 then raise exception 'TOO_MANY_SLOTS'; end if;
  update public.service_broadcasts
     set visit_slots = v_slots, visit_client_note = nullif(left(trim(coalesce(p_note, '')), 500), ''), updated_at = now()
   where id = p_id and client_id = auth.uid() and status = 'accepted' and visit_status = 'requested'
  returning * into v_row;
  if v_row.id is null then raise exception 'VISIT_CLOSED'; end if;
  return v_row;
end $$;

-- 3. Profissional confirma uma das datas do cliente.
create or replace function public.provider_confirm_visit(p_id uuid, p_slot timestamptz)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set visit_status = 'scheduled', visit_at = p_slot, updated_at = now()
   where id = p_id and provider_id = auth.uid() and status = 'accepted'
     and visit_status = 'requested' and p_slot = any(visit_slots) and p_slot > now()
  returning * into v_row;
  if v_row.id is null then raise exception 'INVALID_SLOT'; end if;
  return v_row;
end $$;

-- Cliente não pode na data marcada: volta a indicar datas (a descrição do profissional mantém-se).
create or replace function public.client_request_other_dates(p_id uuid, p_note text default null)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set visit_status = 'requested', visit_slots = '{}', visit_at = null,
         visit_client_note = nullif(left(trim(coalesce(p_note, '')), 500), ''), updated_at = now()
   where id = p_id and client_id = auth.uid() and status = 'accepted' and visit_status = 'scheduled'
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
     set visit_status = null, visit_slots = '{}', visit_at = null, visit_client_note = null, updated_at = now()
   where id = p_id and provider_id = auth.uid() and status = 'accepted' and visit_status in ('requested','scheduled')
  returning * into v_row;
  if v_row.id is null then raise exception 'VISIT_CLOSED'; end if;
  return v_row;
end $$;

-- O cliente já não escolhe entre datas do profissional.
drop function if exists public.client_schedule_visit(uuid, timestamptz);

-- Notificações do fluxo da visita.
create or replace function private.broadcast_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_provider text; v_client text; v_n int;
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

  -- Visita: o profissional pede, o cliente indica datas, o profissional confirma.
  if new.visit_status = 'requested' and new.visit_requested_at is distinct from old.visit_requested_at then
    perform private.notify(new.client_id, 'visit_requested', 'Visita de diagnóstico pedida',
      coalesce(v_provider, 'O profissional') || ' quer ver o local para avaliar o problema e preparar um orçamento mais certo. A visita é gratuita. Indique as datas que lhe dão jeito.', new.id);
  end if;
  v_n := coalesce(array_length(new.visit_slots, 1), 0);
  if new.visit_status = 'requested' and v_n > 0 and new.visit_slots is distinct from old.visit_slots then
    perform private.notify(new.provider_id, 'visit_dates', 'O cliente indicou datas para a visita',
      coalesce(v_client, 'O cliente') || ' indicou ' || v_n || case when v_n = 1 then ' data' else ' datas' end || ' para a visita. Confirme a que lhe dá jeito.', new.id);
  end if;
  if old.visit_status = 'scheduled' and new.visit_status = 'requested' and new.visit_requested_at is not distinct from old.visit_requested_at then
    perform private.notify(new.provider_id, 'visit_reschedule', 'O cliente precisa de outra data',
      coalesce(nullif(new.visit_client_note, ''), coalesce(v_client, 'O cliente') || ' não pode na data marcada e vai indicar outras datas.'), new.id);
  end if;
  if new.visit_status = 'scheduled' and old.visit_status is distinct from 'scheduled' then
    perform private.notify(new.client_id, 'visit_scheduled', 'Visita confirmada',
      coalesce(v_provider, 'O profissional') || ' vai ao local ' || to_char(new.visit_at at time zone 'Africa/Luanda', 'DD/MM "às" HH24:MI') || '. A visita é gratuita.', new.id);
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

-- Etapa para o admin: distingue "à espera das datas do cliente" de "à espera da confirmação do profissional".
create or replace function private.broadcast_stage(b public.service_broadcasts)
returns text language sql stable set search_path = '' as $$
  select case
    when b.status = 'open' and b.expires_at < now() then 'unanswered'
    when b.status = 'open' then 'searching'
    when b.status = 'accepted' and b.visit_status = 'requested' and coalesce(array_length(b.visit_slots, 1), 0) = 0 then 'visit_requested'
    when b.status = 'accepted' and b.visit_status = 'requested' then 'visit_confirm'
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

grant execute on function public.provider_request_visit(uuid, timestamptz[], text)      to authenticated;
grant execute on function public.client_propose_visit_dates(uuid, timestamptz[], text)  to authenticated;
grant execute on function public.provider_confirm_visit(uuid, timestamptz)              to authenticated;
grant execute on function public.client_request_other_dates(uuid, text)                 to authenticated;
grant execute on function public.provider_cancel_visit(uuid)                            to authenticated;
