/*
# Avaliações do prestador (para mostrar no painel)

Devolve a média, o total e as avaliações recebidas pelo prestador autenticado.
*/
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
        'client_name', (select name from public.profiles where id = r.client_id)
      ) order by created_at desc), '[]'::jsonb)
  ) into v
  from public.broadcast_reviews r where r.provider_id = v_uid;
  return v;
end $$;

grant execute on function public.provider_reviews() to authenticated;
