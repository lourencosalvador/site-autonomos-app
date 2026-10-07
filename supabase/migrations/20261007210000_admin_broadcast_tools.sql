/*
# Ferramentas de teste no painel (pedidos da app web)

Permite ao admin ver e apagar os pedidos (`service_broadcasts`) a partir do
painel, sem ir ao SQL do Supabase — útil para testar o fluxo (ex.: limpar tudo
e voltar a testar o timeout de 1 minuto). Apagar um pedido remove em cascata as
suas mensagens (FK on delete cascade).
*/

create or replace function public.admin_list_broadcasts(p_token text, p_limit int default 100)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v from (
    select b.id, b.category, b.status, b.created_at, b.expires_at,
           greatest(0, floor(extract(epoch from (b.expires_at - now())))::int) as seconds_left,
           (select name from public.profiles where id = b.client_id)   as client_name,
           (select name from public.profiles where id = b.provider_id) as provider_name
    from public.service_broadcasts b
    order by b.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ) x;
  return v;
end $$;

create or replace function public.admin_clear_broadcasts(p_token text)
returns int
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); n int;
begin
  with d as (delete from public.service_broadcasts returning 1)
  select count(*)::int into n from d;
  perform private.audit(v_admin, 'clear_broadcasts', 'service_broadcasts', jsonb_build_object('count', n));
  return n;
end $$;

create or replace function public.admin_delete_broadcast(p_token text, p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  delete from public.service_broadcasts where id = p_id;
  perform private.audit(v_admin, 'delete_broadcast', p_id::text, '{}'::jsonb);
end $$;

grant execute on function public.admin_list_broadcasts(text, int) to anon, authenticated;
grant execute on function public.admin_clear_broadcasts(text)      to anon, authenticated;
grant execute on function public.admin_delete_broadcast(text, uuid) to anon, authenticated;
