/*
# Apoio ao cliente (admin)

Pedidos que passaram do 1 minuto sem nenhum prestador a aceitar caem numa fila
de apoio. O admin pode:
 - Vincular um prestador (procura por nome; o prestador assume o serviço).
 - Marcar como "sem prestadores" → o cliente vê que não há prestadores disponíveis.

Novo estado 'no_providers'.
*/

alter table public.service_broadcasts drop constraint if exists service_broadcasts_status_check;
alter table public.service_broadcasts
  add constraint service_broadcasts_status_check
  check (status in ('open','accepted','expired','cancelled','completed','no_providers'));

-- Fila: pedidos abertos, sem prestador, já passados do tempo de espera (expires_at).
create or replace function public.admin_support_queue(p_token text, p_limit int default 100)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc), '[]'::jsonb) into v from (
    select b.id, b.category, b.description, b.city, b.service_date, b.service_time, b.created_at,
           floor(extract(epoch from (now() - b.created_at)))::int as waited_seconds,
           (select name from public.profiles where id = b.client_id)  as client_name,
           (select phone from public.profiles where id = b.client_id) as client_phone
    from public.service_broadcasts b
    where b.status = 'open' and b.provider_id is null and b.expires_at < now()
    order by b.created_at asc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ) x;
  return v;
end $$;

create or replace function public.admin_support_count(p_token text)
returns int
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); n int;
begin
  select count(*)::int into n from public.service_broadcasts
   where status = 'open' and provider_id is null and expires_at < now();
  return n;
end $$;

-- Procura prestadores aprovados por nome/área.
create or replace function public.admin_search_providers(p_token text, p_query text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'work_area', p.work_area) order by p.name), '[]'::jsonb) into v
  from public.profiles p
  where p.role = 'professional' and coalesce(p.approval_status,'') = 'approved'
    and (coalesce(p_query,'') = '' or p.name ilike '%'||p_query||'%' or coalesce(p.work_area,'') ilike '%'||p_query||'%')
  limit 20;
  return v;
end $$;

-- Vincula um prestador ao pedido (assume o serviço).
create or replace function public.admin_assign_provider(p_token text, p_broadcast uuid, p_provider uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  if not exists (select 1 from public.profiles where id = p_provider and role = 'professional' and approval_status = 'approved') then
    raise exception 'invalid_provider';
  end if;
  update public.service_broadcasts
     set provider_id = p_provider, status = 'accepted', accepted_at = now(), updated_at = now()
   where id = p_broadcast and status in ('open','no_providers');
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'support.assign', p_broadcast::text, jsonb_build_object('provider', p_provider));
end $$;

-- Marca o pedido como "sem prestadores disponíveis".
create or replace function public.admin_mark_no_providers(p_token text, p_broadcast uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  update public.service_broadcasts set status = 'no_providers', updated_at = now()
   where id = p_broadcast and status = 'open';
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'support.no_providers', p_broadcast::text, '{}'::jsonb);
end $$;

grant execute on function public.admin_support_queue(text, int)             to anon, authenticated;
grant execute on function public.admin_support_count(text)                  to anon, authenticated;
grant execute on function public.admin_search_providers(text, text)         to anon, authenticated;
grant execute on function public.admin_assign_provider(text, uuid, uuid)    to anon, authenticated;
grant execute on function public.admin_mark_no_providers(text, uuid)        to anon, authenticated;
