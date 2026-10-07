/*
# Perfil completo do profissional no painel (candidatura + conta na app)

Correr no Supabase → SQL Editor, depois de 20261002120000_admin_dashboard.sql
(e, se existir, de 20261002150000_payments_appypay.sql). É idempotente.

O que cria
  1. `private.admin_notes` — notas internas da equipa sobre um candidato / profissional.
  2. `private.match_professional_account(...)` — liga uma candidatura à conta da app:
       auth_user_id (se a coluna existir) → telefone (últimos 9 dígitos) → email.
  3. `public.admin_professional_profile(token, application_id, user_id)` — tudo sobre o profissional:
       candidatura, conta, estatísticas, evolução mensal, serviços, catálogo (provider_posts),
       histórico de trabalho (requests), avaliações (reviews), finanças (payments/withdrawals),
       notas e linha temporal.
  4. `public.admin_add_note` / `public.admin_delete_note`.
  5. `public.admin_set_application_status` passa a registar `reviewed_at` (se a coluna existir).
*/

create schema if not exists private;

-- ===========================================================================
-- 1. Notas internas
-- ===========================================================================
create table if not exists private.admin_notes (
  id bigint generated always as identity primary key,
  entity text not null check (entity in ('application', 'user')),
  entity_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  admin_id uuid,
  admin_name text,
  created_at timestamptz not null default now()
);
create index if not exists admin_notes_entity_idx on private.admin_notes (entity, entity_id, created_at desc);

-- ===========================================================================
-- 2. Ligação candidatura → conta
-- ===========================================================================
create or replace function private.phone_key(p_phone text)
returns text
language sql immutable
set search_path = ''
as $$
  select nullif(right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 9), '');
$$;

-- Devolve { user_id, via } ou null. `via` diz como foi encontrada a conta.
create or replace function private.match_professional_account(p_application jsonb)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_id uuid;
  v_phone text := private.phone_key(p_application ->> 'phone');
  v_email text := lower(nullif(trim(p_application ->> 'email'), ''));
begin
  if p_application is null then return null; end if;

  v_id := nullif(p_application ->> 'auth_user_id', '')::uuid;
  if v_id is not null and exists (select 1 from auth.users where id = v_id) then
    return jsonb_build_object('user_id', v_id, 'via', 'auth_user_id');
  end if;

  if v_phone is not null and char_length(v_phone) = 9 then
    select u.id into v_id
      from auth.users u
      left join public.profiles p on p.id = u.id
     where private.phone_key(p.phone) = v_phone or private.phone_key(u.phone) = v_phone
     order by (p.role = 'professional') desc nulls last, u.created_at
     limit 1;
    if v_id is not null then return jsonb_build_object('user_id', v_id, 'via', 'phone'); end if;
  end if;

  if v_email is not null then
    select id into v_id from auth.users where lower(email) = v_email limit 1;
    if v_id is not null then return jsonb_build_object('user_id', v_id, 'via', 'email'); end if;
  end if;

  return null;
end;
$$;

-- ===========================================================================
-- 3. Perfil completo
-- ===========================================================================
create or replace function public.admin_professional_profile(
  p_token text, p_application_id uuid default null, p_user_id uuid default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_factor int := 100;
  v_app jsonb;
  v_match jsonb;
  v_uid uuid := p_user_id;
  v_account jsonb;
  v_result jsonb;
  v_has_requests boolean := to_regclass('public.requests') is not null;
  v_has_reviews boolean := to_regclass('public.reviews') is not null;
  v_has_posts boolean := to_regclass('public.provider_posts') is not null;
  v_has_payments boolean := to_regclass('public.payments') is not null;
  v_has_withdrawals boolean := to_regclass('public.withdrawals') is not null;
  v_stats jsonb := '{}'::jsonb;
  v_timeline jsonb := '[]'::jsonb;
begin
  if p_application_id is null and p_user_id is null then raise exception 'not_found'; end if;

  if to_regclass('private.payment_settings') is not null then
    execute 'select minor_unit_factor from private.payment_settings where id = 1' into v_factor;
    v_factor := coalesce(v_factor, 100);
  end if;

  -- Candidatura (pela id pedida ou, a partir da conta, a mais recente com o mesmo telefone/email)
  if to_regclass('public.provider_applications') is not null then
    if p_application_id is not null then
      select to_jsonb(a) into v_app from public.provider_applications a where a.id = p_application_id;
      if v_app is null then raise exception 'not_found'; end if;
    end if;
  elsif p_application_id is not null then
    raise exception 'not_found';
  end if;

  if v_uid is null and v_app is not null then
    v_match := private.match_professional_account(v_app);
    v_uid := (v_match ->> 'user_id')::uuid;
  end if;

  -- Conta na app
  if v_uid is not null then
    select coalesce(to_jsonb(p), jsonb_build_object('id', u.id)) || jsonb_build_object(
             'email', u.email, 'auth_phone', u.phone, 'created_at', u.created_at,
             'last_sign_in_at', u.last_sign_in_at, 'banned_until', u.banned_until,
             'suspended', coalesce(u.banned_until > now(), false), 'role', coalesce(p.role, 'client'),
             'active_sessions', (select count(*) from auth.sessions s where s.user_id = u.id)
           )
      into v_account
      from auth.users u left join public.profiles p on p.id = u.id
     where u.id = v_uid;
    if v_account is null and p_user_id is not null then raise exception 'not_found'; end if;
  end if;

  if v_app is null and v_account is not null and to_regclass('public.provider_applications') is not null then
    select to_jsonb(a) into v_app
      from public.provider_applications a
     where (private.phone_key(a.phone) is not null
            and private.phone_key(a.phone) in (private.phone_key(v_account ->> 'phone'), private.phone_key(v_account ->> 'auth_phone')))
        or (nullif(a.email, '') is not null and lower(a.email) = lower(v_account ->> 'email'))
     order by a.created_at desc
     limit 1;
    if v_app is not null then v_match := jsonb_build_object('user_id', v_uid, 'via', 'account'); end if;
  end if;

  v_result := jsonb_build_object(
    'factor', v_factor,
    'application', v_app,
    'account', v_account,
    'link', v_match ->> 'via',
    'other_applications', case when v_app is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'status', a.status, 'work_area', a.work_area, 'created_at', a.created_at) order by a.created_at desc)
        from public.provider_applications a
       where a.id <> (v_app ->> 'id')::uuid
         and ((private.phone_key(a.phone) is not null and private.phone_key(a.phone) = private.phone_key(v_app ->> 'phone'))
           or (nullif(a.email, '') is not null and lower(a.email) = lower(v_app ->> 'email')))
    ), '[]'::jsonb) end
  );

  -- ----- Trabalho (requests em que é o prestador) -----
  if v_uid is not null and v_has_requests then
    v_stats := v_stats || (
      select jsonb_build_object(
        'jobs_total', count(*),
        'jobs_pending', count(*) filter (where status = 'pending'),
        'jobs_accepted', count(*) filter (where status = 'accepted'),
        'jobs_completed', count(*) filter (where status = 'completed'),
        'jobs_rejected', count(*) filter (where status = 'rejected'),
        'jobs_cancelled', count(*) filter (where status = 'cancelled'),
        'clients', count(distinct client_id),
        'repeat_clients', (select count(*) from (select client_id from public.requests
                            where provider_id = v_uid group by client_id having count(*) > 1) rc),
        'first_job_at', min(created_at),
        'last_job_at', max(created_at),
        'avg_response_hours', round((avg(extract(epoch from (accepted_at - created_at)) / 3600)
                                     filter (where accepted_at is not null and accepted_at >= created_at))::numeric, 1)
      )
      from public.requests where provider_id = v_uid
    );

    v_result := v_result || jsonb_build_object(
      'jobs', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id, 'service', r.service_name, 'status', r.status, 'description', r.description,
                 'location', r.location, 'service_date', r.service_date, 'service_time', r.service_time,
                 'created_at', r.created_at, 'accepted_at', r.accepted_at, 'completed_at', r.completed_at,
                 'cancelled_at', r.cancelled_at, 'rejected_at', r.rejected_at,
                 'is_urgent', r.is_urgent, 'is_multi_day', r.is_multi_day,
                 'agreed_amount', r.agreed_amount, 'client_total', r.client_total, 'provider_net', r.provider_net,
                 'payment_status', r.payment_status, 'escrow_status', r.escrow_status,
                 'client', jsonb_build_object('id', r.client_id, 'name', coalesce(cl.name, to_jsonb(r) ->> 'client_name'), 'avatar_url', cl.avatar_url),
                 'rating', rv.rating
               ) order by r.created_at desc)
          from (select * from public.requests where provider_id = v_uid order by created_at desc limit 100) r
          left join public.profiles cl on cl.id = r.client_id
          left join lateral (select rating from public.reviews x where v_has_reviews and x.request_id = r.id limit 1) rv on true
      ), '[]'::jsonb),
      'services', coalesce((
        select jsonb_agg(jsonb_build_object('label', label, 'count', n, 'completed', done) order by n desc)
          from (select coalesce(service_name, 'Sem serviço') as label, count(*) as n,
                       count(*) filter (where status = 'completed') as done
                  from public.requests where provider_id = v_uid group by 1 order by 2 desc limit 8) s
      ), '[]'::jsonb),
      'monthly', (
        select coalesce(jsonb_agg(jsonb_build_object('month', to_char(m.month, 'YYYY-MM'), 'jobs', coalesce(j.n, 0),
                                                     'completed', coalesce(j.done, 0), 'earned', coalesce(e.earned, 0))
                                  order by m.month), '[]'::jsonb)
          from (select generate_series(date_trunc('month', now() at time zone 'Africa/Luanda') - interval '11 months',
                                       date_trunc('month', now() at time zone 'Africa/Luanda'), interval '1 month') as month) m
          left join (select date_trunc('month', created_at at time zone 'Africa/Luanda') as month, count(*) as n,
                            count(*) filter (where status = 'completed') as done
                       from public.requests where provider_id = v_uid group by 1) j on j.month = m.month
          left join (select date_trunc('month', paid_at at time zone 'Africa/Luanda') as month, sum(provider_net) as earned
                       from public.payments where v_has_payments and provider_id = v_uid and paid_at is not null group by 1) e on e.month = m.month
      )
    );
  end if;

  -- ----- Avaliações -----
  if v_uid is not null and v_has_reviews then
    v_stats := v_stats || (
      select jsonb_build_object(
        'reviews_count', count(*),
        'rating_avg', round(avg(rating)::numeric, 2),
        'rating_dist', jsonb_build_object(
          '5', count(*) filter (where rating = 5), '4', count(*) filter (where rating = 4),
          '3', count(*) filter (where rating = 3), '2', count(*) filter (where rating = 2),
          '1', count(*) filter (where rating = 1)),
        'reviews_with_comment', count(*) filter (where nullif(trim(comment), '') is not null)
      )
      from public.reviews where provider_id = v_uid
    );
    v_result := v_result || jsonb_build_object('reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', rv.id, 'rating', rv.rating, 'comment', rv.comment, 'created_at', rv.created_at,
               'client', jsonb_build_object('id', rv.client_id, 'name', cl.name, 'avatar_url', coalesce(rv.client_avatar_url, cl.avatar_url)),
               'service', rq.service_name, 'request_id', rv.request_id
             ) order by rv.created_at desc)
        from (select * from public.reviews where provider_id = v_uid order by created_at desc limit 100) rv
        left join public.profiles cl on cl.id = rv.client_id
        left join public.requests rq on v_has_requests and rq.id = rv.request_id
    ), '[]'::jsonb));
  end if;

  -- ----- Catálogo (portfólio) -----
  if v_uid is not null and v_has_posts then
    v_stats := v_stats || (
      select jsonb_build_object('posts', count(*) filter (where coalesce(post_type, 'post') = 'post'),
                                'stories', count(*) filter (where post_type = 'story'))
        from public.provider_posts where provider_id = v_uid
    );
    v_result := v_result || jsonb_build_object('catalog', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'image_url', image_url, 'caption', caption,
                                          'highlight', highlight_title, 'type', coalesce(post_type, 'post'),
                                          'created_at', created_at) order by created_at desc)
        from (select * from public.provider_posts where provider_id = v_uid order by created_at desc limit 120) x
    ), '[]'::jsonb));
  end if;

  -- ----- Finanças -----
  if v_uid is not null and v_has_payments then
    v_stats := v_stats || (
      select jsonb_build_object(
        'earned', coalesce(sum(provider_net), 0),
        'held', coalesce(sum(provider_net) filter (where released_at is null), 0),
        'released', coalesce(sum(provider_net) filter (where released_at is not null), 0),
        'platform_generated', coalesce(sum(platform_net), 0),
        'gross_billed', coalesce(sum(amount), 0),
        'avg_ticket', coalesce(round(avg(agreed_amount)), 0),
        'paid_jobs', count(*)
      )
      from public.payments where provider_id = v_uid and paid_at is not null
    );
    v_result := v_result || jsonb_build_object('payments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'paid_at', p.paid_at, 'amount', p.amount, 'agreed_amount', p.agreed_amount,
               'provider_net', p.provider_net, 'platform_net', p.platform_net, 'currency', p.currency,
               'released_at', p.released_at, 'escrow_status', p.escrow_status, 'service', rq.service_name,
               'client', cl.name
             ) order by p.paid_at desc)
        from (select * from public.payments where provider_id = v_uid and paid_at is not null order by paid_at desc limit 50) p
        left join public.requests rq on v_has_requests and rq.id = p.request_id
        left join public.profiles cl on cl.id = p.client_id
    ), '[]'::jsonb));
  end if;

  if v_uid is not null and v_has_withdrawals then
    v_stats := v_stats || (
      select jsonb_build_object(
        'withdrawn', coalesce(sum(amount) filter (where paid_at is not null), 0),
        'pending_withdrawals', coalesce(sum(amount) filter (where paid_at is null
                                  and lower(coalesce(status, '')) not in ('failed', 'cancelled', 'canceled', 'rejected')), 0)
      )
      from public.withdrawals where provider_id = v_uid
    );
    v_result := v_result || jsonb_build_object('withdrawals', coalesce((
      select jsonb_agg(to_jsonb(w) order by coalesce(w.requested_at, w.created_at) desc)
        from (select * from public.withdrawals where provider_id = v_uid order by coalesce(requested_at, created_at) desc limit 30) w
    ), '[]'::jsonb));
  end if;

  if v_stats ? 'released' then
    v_stats := v_stats || jsonb_build_object('available', greatest(0,
      (v_stats ->> 'released')::numeric - coalesce((v_stats ->> 'withdrawn')::numeric, 0)
      - coalesce((v_stats ->> 'pending_withdrawals')::numeric, 0)));
  end if;
  v_result := v_result || jsonb_build_object('stats', v_stats);

  -- ----- Notas internas -----
  v_result := v_result || jsonb_build_object('notes', coalesce((
    select jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'admin_name', n.admin_name,
                                        'created_at', n.created_at, 'entity', n.entity) order by n.created_at desc)
      from private.admin_notes n
     where (n.entity = 'application' and v_app is not null and n.entity_id = (v_app ->> 'id')::uuid)
        or (n.entity = 'user' and v_uid is not null and n.entity_id = v_uid)
  ), '[]'::jsonb));

  -- ----- Linha temporal -----
  if v_app is not null then
    v_timeline := v_timeline || jsonb_build_array(jsonb_build_object('kind', 'application', 'at', v_app ->> 'created_at',
      'title', 'Candidatou-se pelo site', 'detail', v_app ->> 'work_area'));
    if v_app ? 'reviewed_at' and v_app ->> 'reviewed_at' is not null then
      v_timeline := v_timeline || jsonb_build_array(jsonb_build_object('kind', 'review', 'at', v_app ->> 'reviewed_at',
        'title', 'Candidatura analisada', 'detail', v_app ->> 'status'));
    end if;
  end if;
  if v_account is not null then
    v_timeline := v_timeline || jsonb_build_array(jsonb_build_object('kind', 'account', 'at', v_account ->> 'created_at',
      'title', 'Conta criada na app', 'detail', null));
    if v_account ->> 'last_sign_in_at' is not null then
      v_timeline := v_timeline || jsonb_build_array(jsonb_build_object('kind', 'login', 'at', v_account ->> 'last_sign_in_at',
        'title', 'Último acesso à app', 'detail', null));
    end if;
  end if;
  if v_stats ->> 'first_job_at' is not null then
    v_timeline := v_timeline || jsonb_build_array(jsonb_build_object('kind', 'job', 'at', v_stats ->> 'first_job_at',
      'title', 'Primeiro pedido recebido', 'detail', null));
  end if;
  v_timeline := v_timeline || coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'admin', 'at', a.created_at, 'title', a.admin_name, 'detail', a.action,
                                        'details', a.details))
      from private.admin_audit a
     where a.target in (v_app ->> 'id', v_uid::text)
  ), '[]'::jsonb);

  v_result := v_result || jsonb_build_object('timeline', (
    select coalesce(jsonb_agg(e order by (e ->> 'at')::timestamptz desc), '[]'::jsonb)
      from jsonb_array_elements(v_timeline) e
     where e ->> 'at' is not null
  ));

  return v_result;
end;
$$;

-- ===========================================================================
-- 4. Notas
-- ===========================================================================
create or replace function public.admin_add_note(p_token text, p_entity text, p_entity_id uuid, p_body text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_note private.admin_notes;
begin
  if p_entity not in ('application', 'user') then raise exception 'invalid_entity'; end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then raise exception 'empty_note'; end if;
  insert into private.admin_notes (entity, entity_id, body, admin_id, admin_name)
  values (p_entity, p_entity_id, left(trim(p_body), 2000), v_admin.id, v_admin.name)
  returning * into v_note;
  return jsonb_build_object('id', v_note.id, 'body', v_note.body, 'admin_name', v_note.admin_name,
                            'created_at', v_note.created_at, 'entity', v_note.entity);
end;
$$;

create or replace function public.admin_delete_note(p_token text, p_id bigint)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  delete from private.admin_notes where id = p_id;
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- ===========================================================================
-- 5. Estado da candidatura: regista também quando foi analisada
-- ===========================================================================
create or replace function public.admin_set_application_status(p_token text, p_id uuid, p_status text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid_status';
  end if;
  update public.provider_applications set status = p_status where id = p_id;
  if not found then raise exception 'not_found'; end if;

  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'provider_applications' and column_name = 'reviewed_at') then
    execute 'update public.provider_applications set reviewed_at = case when $2 = ''pending'' then null else now() end where id = $1'
      using p_id, p_status;
  end if;

  perform private.audit(v_admin, 'application.status', p_id::text, jsonb_build_object('status', p_status));
end;
$$;

-- ===========================================================================
-- Permissões
-- ===========================================================================
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('admin_professional_profile', 'admin_add_note', 'admin_delete_note', 'admin_set_application_status')
  loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;

  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.proname in ('phone_key', 'match_professional_account')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;
