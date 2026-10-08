/*
# Catálogo do prestador (web)

O prestador mostra os seus trabalhos (provider_posts — tabela partilhada com a
app mobile). Para não mexer no RLS dessa tabela, o acesso web é por funções
SECURITY DEFINER. As imagens vão para o bucket público `site-media`, na pasta
`catalog/<uid>/` (política de upload abaixo).
*/

-- Upload/remover imagens do catálogo (só na pasta do próprio prestador).
drop policy if exists "site_media_catalog_insert" on storage.objects;
create policy "site_media_catalog_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media'
              and (storage.foldername(name))[1] = 'catalog'
              and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "site_media_catalog_delete" on storage.objects;
create policy "site_media_catalog_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'site-media'
         and (storage.foldername(name))[1] = 'catalog'
         and (storage.foldername(name))[2] = auth.uid()::text);

-- Catálogo do próprio prestador.
create or replace function public.my_catalog()
returns setof public.provider_posts
language sql security definer set search_path = public, pg_temp as $$
  select * from public.provider_posts where provider_id = auth.uid() order by created_at desc;
$$;

create or replace function public.add_catalog_item(p_image_url text, p_caption text default null)
returns public.provider_posts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.provider_posts;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(trim(p_image_url),'') = '' then raise exception 'IMAGE_REQUIRED'; end if;
  insert into public.provider_posts (provider_id, image_url, caption, post_type)
  values (auth.uid(), p_image_url, nullif(trim(coalesce(p_caption,'')),''), 'post')
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.delete_catalog_item(p_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.provider_posts where id = p_id and provider_id = auth.uid();
end $$;

grant execute on function public.my_catalog()                   to authenticated;
grant execute on function public.add_catalog_item(text, text)   to authenticated;
grant execute on function public.delete_catalog_item(uuid)      to authenticated;
