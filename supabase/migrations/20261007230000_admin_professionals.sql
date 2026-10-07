/*
# Aprovação de prestadores no painel (web)

Os prestadores que se registam na web ficam `approval_status = 'pending'` e só
recebem pedidos depois de aprovados. Estas funções deixam o admin ver e
aprovar/rejeitar prestadores (define `profiles.approval_status`) — o que faltava
na web (antes só a app mobile o fazia).
*/

create or replace function public.admin_list_professionals(p_token text, p_status text default null, p_limit int default 200)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token); v jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v from (
    select p.id, p.name, p.work_area, p.specialty, p.phone,
           coalesce(p.approval_status, 'pending') as approval_status,
           u.email, u.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'professional'
      and (p_status is null or coalesce(p.approval_status, 'pending') = p_status)
    order by u.created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
  ) x;
  return v;
end $$;

create or replace function public.admin_set_professional_approval(p_token text, p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_admin private.admins := private.require_admin(p_token);
begin
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'invalid_status'; end if;
  update public.profiles set approval_status = p_status, updated_at = now()
   where id = p_id and role = 'professional';
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'professional.approval', p_id::text, jsonb_build_object('status', p_status));
end $$;

grant execute on function public.admin_list_professionals(text, text, int)   to anon, authenticated;
grant execute on function public.admin_set_professional_approval(text, uuid, text) to anon, authenticated;
