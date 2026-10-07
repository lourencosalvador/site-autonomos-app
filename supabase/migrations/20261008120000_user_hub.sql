/*
# Hub do utilizador (web): carteira do prestador, editar perfil, avaliar

- provider_wallet(): saldo disponível + retido + movimentos do prestador.
- update_my_profile(): o utilizador edita o seu próprio perfil.
- rate_provider(): o cliente avalia o prestador depois de concluir o serviço.
*/

-- Liga uma avaliação ao pedido web (reviews.request_id aponta para a app mobile).
alter table public.reviews add column if not exists broadcast_id uuid;
create index if not exists idx_reviews_broadcast on public.reviews (broadcast_id);
create index if not exists idx_reviews_provider on public.reviews (provider_id);

-- Carteira do prestador: ganha o "total do trabalho" de cada serviço concluído; a taxa de 10% é da plataforma.
create or replace function public.provider_wallet()
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select jsonb_build_object(
    'available_minor', coalesce((select sum(price_minor) from public.service_broadcasts
                                  where provider_id = v_uid and status = 'completed' and escrow_released), 0),
    'pending_minor',   coalesce((select sum(price_minor) from public.service_broadcasts
                                  where provider_id = v_uid and status = 'accepted' and payment_status = 'paid'), 0),
    'jobs_done',       (select count(*) from public.service_broadcasts where provider_id = v_uid and status = 'completed'),
    'movements', coalesce((
      select jsonb_agg(m order by m.at desc) from (
        select b.id,
               b.category,
               b.price_minor as amount_minor,
               case when b.status = 'completed' and b.escrow_released then 'available'
                    when b.status = 'accepted' and b.payment_status = 'paid' then 'pending'
                    else 'other' end as kind,
               coalesce(b.completed_at, b.paid_at, b.accepted_at) as at,
               (select name from public.profiles where id = b.client_id) as client_name
          from public.service_broadcasts b
         where b.provider_id = v_uid and (b.status = 'completed' or (b.status = 'accepted' and b.payment_status = 'paid'))
         order by at desc limit 50
      ) m
    ), '[]'::jsonb)
  ) into v;
  return v;
end $$;

-- O utilizador edita o seu próprio perfil.
create or replace function public.update_my_profile(
  p_name text, p_phone text default null, p_work_area text default null,
  p_specialty text default null, p_bio text default null, p_province text default null
)
returns public.profiles
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_row public.profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'INVALID_NAME'; end if;
  update public.profiles
     set name = trim(p_name),
         phone = p_phone,
         work_area = case when role = 'professional' then coalesce(p_work_area, work_area) else work_area end,
         specialty = case when role = 'professional' then p_specialty else specialty end,
         bio = p_bio,
         province = p_province,
         updated_at = now()
   where id = v_uid
  returning * into v_row;
  return v_row;
end $$;

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
  if exists (select 1 from public.reviews where broadcast_id = p_broadcast) then raise exception 'ALREADY_RATED'; end if;

  insert into public.reviews (provider_id, client_id, rating, comment, broadcast_id, client_avatar_url)
  values (b.provider_id, v_uid, p_rating, nullif(trim(coalesce(p_comment,'')),''), p_broadcast,
          (select avatar_url from public.profiles where id = v_uid));
end $$;

grant execute on function public.provider_wallet()                               to authenticated;
grant execute on function public.update_my_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.rate_provider(uuid,int,text)                    to authenticated;
