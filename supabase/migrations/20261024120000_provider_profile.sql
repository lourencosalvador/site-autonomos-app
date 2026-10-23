/*
# Perfil do prestador (web): foto, portfólio por álbuns e perfil público

- Foto de perfil: upload para `site-media/avatars/<uid>/` e set_my_avatar().
- Portfólio: add_catalog_item aceita um álbum (provider_posts.highlight_title,
  o mesmo campo dos destaques da app mobile); update_catalog_item muda
  legenda/álbum.
- provider_public_profile(): o que um cliente vê do prestador (sem telefone
  nem email): dados profissionais, avaliações e portfólio.
- provider_reviews(): passa a incluir a foto do cliente.
*/

drop policy if exists "site_media_avatar_insert" on storage.objects;
create policy "site_media_avatar_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media'
              and (storage.foldername(name))[1] = 'avatars'
              and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "site_media_avatar_delete" on storage.objects;
create policy "site_media_avatar_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'site-media'
         and (storage.foldername(name))[1] = 'avatars'
         and (storage.foldername(name))[2] = auth.uid()::text);

create or replace function public.set_my_avatar(p_url text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.profiles set avatar_url = nullif(trim(coalesce(p_url, '')), ''), updated_at = now()
   where id = auth.uid();
end $$;

drop function if exists public.add_catalog_item(text, text);
create or replace function public.add_catalog_item(p_image_url text, p_caption text default null, p_highlight text default null)
returns public.provider_posts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.provider_posts;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(trim(p_image_url), '') = '' then raise exception 'IMAGE_REQUIRED'; end if;
  insert into public.provider_posts (provider_id, image_url, caption, highlight_title, post_type)
  values (auth.uid(), p_image_url, nullif(trim(coalesce(p_caption, '')), ''),
          nullif(left(trim(coalesce(p_highlight, '')), 30), ''), 'post')
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.update_catalog_item(p_id uuid, p_caption text default null, p_highlight text default null)
returns public.provider_posts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.provider_posts;
begin
  update public.provider_posts
     set caption = nullif(trim(coalesce(p_caption, '')), ''),
         highlight_title = nullif(left(trim(coalesce(p_highlight, '')), 30), '')
   where id = p_id and provider_id = auth.uid()
  returning * into v_row;
  if v_row.id is null then raise exception 'NOT_FOUND'; end if;
  return v_row;
end $$;

create or replace function public.provider_reviews()
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select jsonb_build_object(
    'average', coalesce(round(avg(rating)::numeric, 1), 0),
    'count', count(*),
    'items', coalesce(jsonb_agg(
      jsonb_build_object(
        'rating', rating, 'comment', comment, 'created_at', created_at,
        'client_name', (select name from public.profiles where id = r.client_id),
        'client_avatar_url', (select avatar_url from public.profiles where id = r.client_id)
      ) order by created_at desc), '[]'::jsonb)
  ) into v
  from public.broadcast_reviews r where r.provider_id = v_uid;
  return v;
end $$;

create or replace function public.provider_public_profile(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'avatar_url', p.avatar_url,
    'specialty', p.specialty,
    'bio', p.bio,
    'province', p.province,
    'company_name', p.company_name,
    'work_areas', coalesce(p.work_areas, case when p.work_area is not null then array[p.work_area] end),
    'created_at', p.created_at,
    'jobs_done', (select count(*) from public.service_broadcasts b where b.provider_id = p.id and b.status = 'completed'),
    'rating', (select jsonb_build_object('average', coalesce(round(avg(rating)::numeric, 1), 0), 'count', count(*))
                 from public.broadcast_reviews where provider_id = p.id),
    'reviews', coalesce((select jsonb_agg(x order by x.created_at desc) from (
                  select r.rating, r.comment, r.created_at,
                         c.name as client_name, c.avatar_url as client_avatar_url
                    from public.broadcast_reviews r join public.profiles c on c.id = r.client_id
                   where r.provider_id = p.id
                   order by r.created_at desc limit 50) x), '[]'::jsonb),
    'portfolio', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', pp.id, 'image_url', pp.image_url, 'caption', pp.caption,
                    'highlight_title', pp.highlight_title, 'created_at', pp.created_at) order by pp.created_at desc)
                  from public.provider_posts pp where pp.provider_id = p.id), '[]'::jsonb)
  ) into v
  from public.profiles p
  where p.id = p_id
    and (p.id = auth.uid()
         or (p.approval_status = 'approved'
             and (p.role = 'professional' or (p.role is null and coalesce(trim(p.work_area), '') <> ''))));
  return v;
end $$;

grant execute on function public.set_my_avatar(text)                          to authenticated;
grant execute on function public.add_catalog_item(text, text, text)           to authenticated;
grant execute on function public.update_catalog_item(uuid, text, text)        to authenticated;
grant execute on function public.provider_reviews()                           to authenticated;
grant execute on function public.provider_public_profile(uuid)                to authenticated;
