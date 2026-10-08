/*
# Avaliações dos pedidos web (tabela própria)

A tabela `reviews` é da app mobile (request_id NOT NULL, ligado a requests).
Para não a partir, as avaliações da web ficam numa tabela própria.
*/

create table if not exists public.broadcast_reviews (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null unique references public.service_broadcasts(id) on delete cascade,
  provider_id  uuid not null references public.profiles(id) on delete cascade,
  client_id    uuid not null references public.profiles(id) on delete cascade,
  rating       int  not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_broadcast_reviews_provider on public.broadcast_reviews (provider_id);

alter table public.broadcast_reviews enable row level security;
drop policy if exists br_participant_select on public.broadcast_reviews;
create policy br_participant_select on public.broadcast_reviews for select to authenticated
  using (provider_id = auth.uid() or client_id = auth.uid());
grant select on public.broadcast_reviews to authenticated;

-- O cliente avalia o prestador de um serviço concluído (uma vez por pedido).
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
  if b.status <> 'completed' then raise exception 'NOT_COMPLETED'; end if;
  if b.provider_id is null then raise exception 'NO_PROVIDER'; end if;
  if exists (select 1 from public.broadcast_reviews where broadcast_id = p_broadcast) then raise exception 'ALREADY_RATED'; end if;

  insert into public.broadcast_reviews (broadcast_id, provider_id, client_id, rating, comment)
  values (p_broadcast, b.provider_id, v_uid, p_rating, nullif(trim(coalesce(p_comment,'')),''));
end $$;

grant execute on function public.rate_provider(uuid,int,text) to authenticated;
