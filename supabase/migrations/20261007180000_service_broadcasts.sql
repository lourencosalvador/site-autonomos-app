/*
# Fluxo de pedido (broadcast / leilão) para a web

O cliente cria um pedido de uma categoria. O pedido é difundido a TODOS os
prestadores aprovados dessa área (`profiles.work_area = category`). O primeiro
prestador a aceitar fica com o serviço (claim atómico) e o pedido desaparece
para os restantes. Se ninguém aceitar em 1 minuto, o pedido expira e o cliente
é informado que não há prestador disponível.

Tabela nova e isolada (`service_broadcasts`) — NÃO mexe na `requests` (app mobile,
1-para-1) nem na `service_requests` (formulário público antigo).

Estados: open → accepted | expired | cancelled ; accepted → completed | cancelled
Todas as transições passam por funções SECURITY DEFINER (claim atómico e seguro).
Leitura controlada por RLS. Tabela publicada em `supabase_realtime` para tempo real.
*/

-- ────────────────────────────── Tabela ──────────────────────────────
create table if not exists public.service_broadcasts (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles(id) on delete cascade,
  provider_id   uuid references public.profiles(id) on delete set null,
  category      text not null,
  description   text not null,
  service_date  text,
  service_time  text,
  city          text,
  address       text,
  status        text not null default 'open'
                check (status in ('open','accepted','expired','cancelled','completed')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '1 minute'),
  accepted_at   timestamptz,
  cancelled_at  timestamptz,
  completed_at  timestamptz,
  updated_at    timestamptz
);

create index if not exists idx_sb_open    on public.service_broadcasts (category, status, expires_at);
create index if not exists idx_sb_client  on public.service_broadcasts (client_id, created_at desc);
create index if not exists idx_sb_provider on public.service_broadcasts (provider_id, created_at desc);

-- ────────────────────────────── RLS ─────────────────────────────────
alter table public.service_broadcasts enable row level security;

-- Dono vê os seus pedidos
drop policy if exists sb_owner_select on public.service_broadcasts;
create policy sb_owner_select on public.service_broadcasts for select to authenticated
  using (client_id = auth.uid());

-- Prestador que aceitou vê o pedido
drop policy if exists sb_provider_select on public.service_broadcasts;
create policy sb_provider_select on public.service_broadcasts for select to authenticated
  using (provider_id = auth.uid());

-- Prestador aprovado vê pedidos ABERTOS e por expirar da sua área
drop policy if exists sb_area_select on public.service_broadcasts;
create policy sb_area_select on public.service_broadcasts for select to authenticated
  using (
    status = 'open' and expires_at > now()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'professional'
        and p.approval_status = 'approved'
        and p.work_area = service_broadcasts.category
    )
  );

-- Escrita só pelas funções abaixo (SECURITY DEFINER). Sem policies de INSERT/UPDATE/DELETE.

-- ──────────────────────── Funções (RPC) ─────────────────────────────

-- Cliente cria um pedido (expira em 1 minuto).
create or replace function public.create_broadcast(
  p_category text,
  p_description text,
  p_service_date text default null,
  p_service_time text default null,
  p_city text default null,
  p_address text default null
) returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(trim(p_category),'') = '' then raise exception 'CATEGORY_REQUIRED'; end if;
  if coalesce(trim(p_description),'') = '' then raise exception 'DESCRIPTION_REQUIRED'; end if;

  insert into public.service_broadcasts
    (client_id, category, description, service_date, service_time, city, address, status, expires_at)
  values
    (auth.uid(), trim(p_category), trim(p_description), p_service_date, p_service_time, p_city, p_address,
     'open', now() + interval '1 minute')
  returning * into v_row;
  return v_row;
end $$;

-- Prestador aceita (claim atómico). Devolve a linha ou NULL se já tomada/expirada.
create or replace function public.accept_broadcast(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts; v_area text; v_approval text; v_role text;
begin
  select role, work_area, approval_status into v_role, v_area, v_approval
    from public.profiles where id = auth.uid();
  if v_role is distinct from 'professional' then raise exception 'NOT_PROFESSIONAL'; end if;
  if v_approval is distinct from 'approved' then raise exception 'NOT_APPROVED'; end if;

  update public.service_broadcasts
     set status = 'accepted', provider_id = auth.uid(), accepted_at = now(), updated_at = now()
   where id = p_id
     and status = 'open'
     and expires_at > now()
     and category = v_area
  returning * into v_row;

  return v_row; -- NULL => outro prestador ficou com ele, ou expirou
end $$;

-- Cliente finaliza o timeout (sem prestador). Marca expirado se ainda aberto.
create or replace function public.expire_broadcast(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set status = 'expired', updated_at = now()
   where id = p_id and client_id = auth.uid() and status = 'open'
  returning * into v_row;
  return v_row;
end $$;

-- Cliente cancela (aberto ou já aceite).
create or replace function public.cancel_broadcast(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where id = p_id and client_id = auth.uid() and status in ('open','accepted')
  returning * into v_row;
  return v_row;
end $$;

-- Marca concluído (cliente ou prestador do pedido aceite).
create or replace function public.complete_broadcast(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set status = 'completed', completed_at = now(), updated_at = now()
   where id = p_id and status = 'accepted'
     and (client_id = auth.uid() or provider_id = auth.uid())
  returning * into v_row;
  return v_row;
end $$;

-- Um pedido (com dados do cliente e, se aceite, do prestador) em JSON.
create or replace function public.get_broadcast(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  select to_jsonb(b)
         || jsonb_build_object(
              'seconds_left', greatest(0, floor(extract(epoch from (b.expires_at - now())))::int),
              'client', (select jsonb_build_object('id',c.id,'name',c.name,'avatar_url',c.avatar_url,'phone',c.phone)
                         from public.profiles c where c.id = b.client_id),
              'provider', (select jsonb_build_object('id',pr.id,'name',pr.name,'avatar_url',pr.avatar_url,'phone',pr.phone,
                                                     'work_area',pr.work_area,'specialty',pr.specialty)
                           from public.profiles pr where pr.id = b.provider_id))
    into v
  from public.service_broadcasts b
  where b.id = p_id
    and (
      b.client_id = auth.uid()
      or b.provider_id = auth.uid()
      or (b.status = 'open' and b.expires_at > now()
          and exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.role='professional'
                        and p.approval_status='approved' and p.work_area = b.category))
    );
  return v; -- NULL se não existe ou sem permissão
end $$;

-- Lista de pedidos abertos da área do prestador (com dados do cliente e tempo restante).
create or replace function public.list_open_broadcasts()
returns setof jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_area text; v_approval text; v_role text;
begin
  select role, work_area, approval_status into v_role, v_area, v_approval
    from public.profiles where id = auth.uid();
  if v_role is distinct from 'professional' or v_approval is distinct from 'approved' then
    return; -- sem resultados
  end if;

  return query
    select to_jsonb(b)
           || jsonb_build_object(
                'seconds_left', greatest(0, floor(extract(epoch from (b.expires_at - now())))::int),
                'client', jsonb_build_object('id',c.id,'name',c.name,'avatar_url',c.avatar_url,'phone',c.phone))
    from public.service_broadcasts b
    join public.profiles c on c.id = b.client_id
    where b.status = 'open' and b.expires_at > now() and b.category = v_area
    order by b.created_at asc;
end $$;

-- Histórico de pedidos do próprio utilizador (cliente ou prestador).
create or replace function public.my_broadcasts()
returns setof jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then return; end if;
  return query
    select to_jsonb(b)
           || jsonb_build_object(
                'client',   (select jsonb_build_object('id',c.id,'name',c.name,'avatar_url',c.avatar_url,'phone',c.phone)
                             from public.profiles c where c.id = b.client_id),
                'provider', (select jsonb_build_object('id',pr.id,'name',pr.name,'avatar_url',pr.avatar_url,'phone',pr.phone)
                             from public.profiles pr where pr.id = b.provider_id))
    from public.service_broadcasts b
    where b.client_id = auth.uid() or b.provider_id = auth.uid()
    order by b.created_at desc;
end $$;

grant execute on function public.create_broadcast(text,text,text,text,text,text) to authenticated;
grant execute on function public.accept_broadcast(uuid)  to authenticated;
grant execute on function public.expire_broadcast(uuid)  to authenticated;
grant execute on function public.cancel_broadcast(uuid)  to authenticated;
grant execute on function public.complete_broadcast(uuid) to authenticated;
grant execute on function public.get_broadcast(uuid)     to authenticated;
grant execute on function public.list_open_broadcasts()  to authenticated;
grant execute on function public.my_broadcasts()         to authenticated;

-- ──────────────────────── Realtime ──────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.service_broadcasts;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
