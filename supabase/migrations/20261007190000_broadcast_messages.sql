/*
# Chat do pedido (cliente ↔ prestador)

Mensagens ligadas a um `service_broadcasts` aceite. Só os dois participantes
(cliente e prestador do pedido) leem e escrevem. Tempo real por `supabase_realtime`.
*/

create table if not exists public.broadcast_messages (
  id           uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.service_broadcasts(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);

create index if not exists idx_bm_broadcast on public.broadcast_messages (broadcast_id, created_at);

alter table public.broadcast_messages enable row level security;

-- Participantes (cliente ou prestador do pedido) leem as mensagens. Necessário também para o realtime.
drop policy if exists bm_participant_select on public.broadcast_messages;
create policy bm_participant_select on public.broadcast_messages for select to authenticated
  using (
    exists (
      select 1 from public.service_broadcasts b
      where b.id = broadcast_messages.broadcast_id
        and (b.client_id = auth.uid() or b.provider_id = auth.uid())
    )
  );

-- Escrita via RPC (valida participação e estado). Sem policy de INSERT.

-- Envia uma mensagem no pedido (só participantes, só quando aceite/concluído).
create or replace function public.send_message(p_broadcast uuid, p_body text)
returns public.broadcast_messages
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.broadcast_messages; v_ok boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(trim(p_body),'') = '' then raise exception 'EMPTY_MESSAGE'; end if;

  select true into v_ok from public.service_broadcasts b
   where b.id = p_broadcast
     and (b.client_id = auth.uid() or b.provider_id = auth.uid())
     and b.status in ('accepted','completed');
  if v_ok is not true then raise exception 'NOT_ALLOWED'; end if;

  insert into public.broadcast_messages (broadcast_id, sender_id, body)
  values (p_broadcast, auth.uid(), trim(p_body))
  returning * into v_row;
  return v_row;
end $$;

-- Marca como lidas as mensagens do outro participante.
create or replace function public.mark_messages_read(p_broadcast uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.broadcast_messages
     set read_at = now()
   where broadcast_id = p_broadcast and sender_id <> auth.uid() and read_at is null
     and exists (select 1 from public.service_broadcasts b
                 where b.id = p_broadcast and (b.client_id = auth.uid() or b.provider_id = auth.uid()));
end $$;

grant select on public.broadcast_messages to authenticated;
grant execute on function public.send_message(uuid,text)      to authenticated;
grant execute on function public.mark_messages_read(uuid)      to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.broadcast_messages;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
