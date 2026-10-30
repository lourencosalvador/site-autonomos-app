/*
# Avaliações de clientes (web) em tabela própria

`client_reviews` já existe e pertence à app mobile (request_id). As avaliações
que o profissional faz ao cliente nos pedidos web passam para
`broadcast_client_reviews`. Remove a policy que a operations_v2 tinha
acrescentado por engano à tabela da app mobile.
*/

drop policy if exists cr_participant_select on public.client_reviews;

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

grant execute on function public.rate_client(uuid, int, text) to authenticated;
grant execute on function public.get_broadcast(uuid)         to authenticated;
