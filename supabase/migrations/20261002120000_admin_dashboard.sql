/*
# Painel de administração (super admin) + analytics do site + catálogo de serviços

Correr UMA vez no Supabase → SQL Editor (é idempotente: pode voltar a correr sem estragar nada).
No fim, a última instrução devolve a CHAVE DE ACESSO do primeiro administrador.
Guarde-a — não volta a ser mostrada (só fica guardado o hash).

O que cria
  1. `service_requests` + bucket `request-attachments` (pedidos do site), se ainda não existirem.
  2. `site_events`   — visitas e ações no site (insert público, leitura só pelo painel).
  3. `site_services` — catálogo de serviços do site (leitura pública, escrita só pelo painel).
  4. Bucket `site-media` — imagens dos serviços (upload só com "ticket" emitido pelo painel).
  5. Schema `private` — administradores, sessões, tentativas de login e registo de auditoria.
     Não é exposto pela API.
  6. Funções `public.admin_*` — tudo o que o painel faz. Cada uma valida o token de sessão.

Segurança
  - A chave (8 caracteres) nunca é comparada no browser: guarda-se só o hash bcrypt.
  - Máximo de 5 tentativas falhadas por IP a cada 15 minutos.
  - O login devolve um token aleatório de 256 bits (guardado só como sha256) válido 12 h.
  - As funções correm como `security definer` com `search_path` vazio.
*/

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- ===========================================================================
-- 1. Pedidos de serviço do site (mesmo esquema de 20260704180000)
-- ===========================================================================
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text,
  endereco text not null,
  categoria text not null,
  servico text not null,
  descricao text not null,
  data_desejada date,
  horario_preferencial text,
  anexos jsonb not null default '[]'::jsonb,
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.service_requests enable row level security;

drop policy if exists "anon_insert_service_requests" on public.service_requests;
create policy "anon_insert_service_requests"
  on public.service_requests for insert
  to anon, authenticated with check (true);

insert into storage.buckets (id, name, public)
values ('request-attachments', 'request-attachments', true)
on conflict (id) do nothing;

drop policy if exists "anon_upload_request_attachments" on storage.objects;
create policy "anon_upload_request_attachments"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'request-attachments');

drop policy if exists "public_read_request_attachments" on storage.objects;
create policy "public_read_request_attachments"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'request-attachments');

-- ===========================================================================
-- 2. Analytics do site
-- ===========================================================================
create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  type text not null check (type in (
    'page_view', 'search', 'service_click', 'request_submitted', 'application_submitted', 'contact_click'
  )),
  path text check (char_length(path) <= 200),
  label text check (char_length(label) <= 200),
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  session_id text check (char_length(session_id) <= 64),
  referrer text check (char_length(referrer) <= 300),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);

create index if not exists site_events_created_at_idx on public.site_events (created_at desc);
create index if not exists site_events_type_created_at_idx on public.site_events (type, created_at desc);

alter table public.site_events enable row level security;

drop policy if exists "public_insert_site_events" on public.site_events;
create policy "public_insert_site_events"
  on public.site_events for insert
  to anon, authenticated with check (true);

-- O browser só pode escrever estas colunas (created_at e id ficam sempre do servidor).
revoke all on public.site_events from anon, authenticated;
grant insert (type, path, label, visitor_id, session_id, referrer, device)
  on public.site_events to anon, authenticated;

-- ===========================================================================
-- 3. Catálogo de serviços
-- ===========================================================================
create table if not exists public.site_services (
  id text primary key check (id ~ '^[a-z0-9-]{2,80}$'),
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  price text check (char_length(price) <= 40),
  image_url text not null default '' check (char_length(image_url) <= 500),
  keywords text not null default '' check (char_length(keywords) <= 500),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_services enable row level security;

drop policy if exists "public_read_active_site_services" on public.site_services;
create policy "public_read_active_site_services"
  on public.site_services for select
  to anon, authenticated using (active);

revoke insert, update, delete on public.site_services from anon, authenticated;

-- Catálogo inicial (o mesmo que estava fixo no site). Não substitui serviços já existentes.
insert into public.site_services (id, title, description, price, image_url, keywords, sort_order) values
  ('eletricidade', 'Eletricidade', 'Instalações elétricas, quadros, tomadas, iluminação e reparação de avarias.', '12.000 Kz', '/servicos/eletricidade.jpg', 'eletricista luz curto-circuito disjuntor quadro elétrico tomada interruptor lâmpada', 1),
  ('geradores', 'Geradores', 'Instalação, manutenção e reparação de geradores a gasóleo e a gasolina.', null, '/servicos/geradores.jpg', 'gerador gasóleo gasolina motor energia corte de luz', 2),
  ('drywall-construcao-seco', 'Drywall e Construção a Seco', 'Paredes, tetos falsos e divisórias em pladur, rápidas e sem obras pesadas.', null, '/servicos/drywall-construcao-seco.jpg', 'pladur gesso cartonado teto falso divisória parede', 3),
  ('pintura-estuque', 'Pintura e Estuque', 'Pintura interior e exterior, estuque e acabamentos com qualidade profissional.', '25.000 Kz', '/servicos/pintura-estuque.jpg', 'pintor tinta parede massa reboco acabamento fachada', 4),
  ('pedreira-alvenaria', 'Pedreira e Alvenaria', 'Construção e reparação de paredes, muros, reboco e pequenas obras.', '30.000 Kz', '/servicos/pedreira-alvenaria.jpg', 'pedreiro obra construção civil muro bloco tijolo cimento reboco', 5),
  ('ladrilho-revestimentos', 'Ladrilho e Revestimentos', 'Assentamento de mosaico, azulejo, porcelanato e revestimentos de parede.', null, '/servicos/ladrilho-revestimentos.jpg', 'ladrilhador mosaico azulejo porcelanato cerâmica pavimento piso', 6),
  ('canalizacao', 'Canalização', 'Reparação de fugas, desentupimentos e instalação de sistemas de água.', '15.000 Kz', '/servicos/canalizacao.jpg', 'canalizador fuga água torneira cano tubo entupimento sanita autoclismo', 7),
  ('caixilharia-aluminio', 'Caixilharia e Alumínio', 'Janelas, portas e montras em alumínio e vidro, feitas à medida.', null, '/servicos/caixilharia-aluminio.jpg', 'janela porta alumínio vidro vidraçaria montra estore caixilho', 8),
  ('frio-climatizacao', 'Frio e Climatização (AVAC)', 'Instalação e manutenção de ar condicionado, câmaras frigoríficas e refrigeração.', '20.000 Kz', '/servicos/frio-climatizacao.jpg', 'ar condicionado ac split refrigeração frio arca câmara frigorífica gás', 9),
  ('serralharia', 'Serralharia', 'Portões, grades, estruturas metálicas e trabalhos de soldadura.', '20.000 Kz', '/servicos/serralharia.jpg', 'serralheiro soldadura solda ferro metal grade portão estrutura', 10),
  ('carpintaria-moveis', 'Carpintaria e Móveis Planejados', 'Móveis por medida, roupeiros, cozinhas e reparação de estruturas em madeira.', '18.000 Kz', '/servicos/carpintaria-moveis.jpg', 'carpinteiro marceneiro marcenaria madeira móvel roupeiro armário cozinha porta montagem', 11),
  ('seguranca-eletronica', 'Segurança Eletrónica (CCTV)', 'Câmaras de vigilância, alarmes, vídeo-porteiros e controlo de acessos.', '35.000 Kz', '/servicos/seguranca-eletronica.jpg', 'câmara camera vigilância alarme cctv intercomunicador vídeo-porteiro segurança', 12),
  ('piscinas', 'Piscinas', 'Limpeza, tratamento de água, manutenção e reparação de piscinas.', null, '/servicos/piscinas.jpg', 'piscina cloro bomba filtro limpeza tratamento água', 13),
  ('placas-3d-molduras', 'Placas 3D e Molduras', 'Painéis decorativos 3D, sancas, molduras e acabamentos em gesso.', null, '/servicos/placas-3d-molduras.jpg', 'placa 3d painel decorativo sanca moldura gesso teto decoração', 14),
  ('telhados-coberturas', 'Telhados e Coberturas', 'Montagem e reparação de telhados, chapas, telhas e coberturas.', null, '/servicos/telhados-coberturas.jpg', 'telhado telha chapa zinco cobertura infiltração goteira', 15),
  ('impermeabilizacao', 'Impermeabilização', 'Impermeabilização de lajes, terraços, casas de banho e tanques de água.', null, '/servicos/impermeabilizacao.jpg', 'infiltração humidade laje terraço manta tela tanque goteira', 16),
  ('calhas-drenagem', 'Calhas e Drenagem Pluvial', 'Instalação e limpeza de caleiras, tubos de queda e drenagem de águas da chuva.', null, '/servicos/calhas-drenagem.jpg', 'calha caleira chuva tubo de queda drenagem pluvial escoamento', 17),
  ('fossas-esgotos', 'Fossas Sépticas e Esgotos', 'Construção, limpeza e desentupimento de fossas e redes de esgoto.', null, '/servicos/fossas-esgotos.jpg', 'fossa séptica esgoto sucção desentupimento caixa de visita', 18),
  ('energia-solar', 'Energia Solar', 'Instalação e manutenção de painéis solares, inversores e baterias.', null, '/servicos/energia-solar.jpg', 'painel solar fotovoltaico inversor bateria energia renovável', 19),
  ('reparacao-eletrodomesticos', 'Reparação de Eletrodomésticos', 'Arcas, geleiras, máquinas de lavar, fogões, micro-ondas e muito mais.', null, '/servicos/reparacao-eletrodomesticos.jpg', 'geleira frigorífico arca máquina de lavar fogão micro-ondas televisão avaria', 20),
  ('reparacao-bombas-agua', 'Reparação de Bombas de Água', 'Instalação, manutenção e reparação de bombas de água e hidropressores.', null, '/servicos/reparacao-bombas-agua.jpg', 'bomba de água hidropressor motor pressão tanque cisterna', 21),
  ('controlo-pragas', 'Controlo de Pragas', 'Desinfestação contra baratas, ratos, mosquitos, térmitas e outras pragas.', null, '/servicos/controlo-pragas.jpg', 'desinfestação fumigação baratas ratos mosquitos formigas térmitas salalé insetos', 22),
  ('limpeza-residencial', 'Limpeza Residencial', 'Limpeza profunda de casas, apartamentos e escritórios.', '12.000 Kz', '/servicos/limpeza-residencial.jpg', 'limpeza casa apartamento escritório faxina lavagem pós-obra', 23),
  ('jardinagem', 'Jardinagem', 'Manutenção de jardins, relva, podas e paisagismo.', '15.000 Kz', '/servicos/jardinagem.jpg', 'jardineiro jardim relva poda plantas árvores paisagismo rega', 24),
  ('portoes-automaticos', 'Manutenção de Portões Automáticos', 'Instalação, automatização e reparação de motores de portões.', null, '/servicos/portoes-automaticos.jpg', 'portão automático motor comando garagem automatismo', 25),
  ('chamines-exaustao', 'Chaminés e Exaustão', 'Instalação e limpeza de exaustores, chaminés e condutas de extração.', null, '/servicos/chamines-exaustao.jpg', 'chaminé exaustor extração fumos conduta cozinha', 26),
  ('equipamentos-cozinha', 'Manutenção de Equipamentos de Cozinha', 'Fogões industriais, fornos, fritadeiras e equipamentos de restauração.', null, '/servicos/equipamentos-cozinha.jpg', 'fogão industrial forno fritadeira cozinha industrial restaurante equipamento', 27)
on conflict (id) do nothing;

-- ===========================================================================
-- 4. Imagens dos serviços
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ===========================================================================
-- 5. Administração (schema privado)
-- ===========================================================================
create table if not exists private.admins (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  key_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  last_login_at timestamptz
);

create table if not exists private.admin_sessions (
  token_hash text primary key,
  admin_id uuid not null references private.admins (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ip text,
  user_agent text
);

create table if not exists private.admin_login_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_login_attempts_ip_idx on private.admin_login_attempts (ip, created_at desc);

create table if not exists private.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid,
  admin_name text,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_at_idx on private.admin_audit (created_at desc);

create table if not exists private.upload_tickets (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references private.admins (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes'
);

-- ---------------------------------------------------------------------------
-- Funções auxiliares (privadas)
-- ---------------------------------------------------------------------------
create or replace function private.request_header(p_name text)
returns text
language plpgsql stable
set search_path = ''
as $$
declare
  v_headers json;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;
  return v_headers ->> p_name;
end;
$$;

create or replace function private.client_ip()
returns text
language sql stable
set search_path = ''
as $$
  select coalesce(
    nullif(trim(private.request_header('cf-connecting-ip')), ''),
    nullif(trim(private.request_header('x-real-ip')), ''),
    nullif(trim(split_part(coalesce(private.request_header('x-forwarded-for'), ''), ',', 1)), ''),
    'local'
  );
$$;

create or replace function private.hash_token(p_token text)
returns text
language sql immutable
set search_path = ''
as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- Chave de 8 caracteres sem símbolos ambíguos (sem 0/O, 1/I). 32 símbolos → sem enviesamento.
create or replace function private.random_key()
returns text
language plpgsql volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_key text := '';
begin
  for i in 0..7 loop
    v_key := v_key || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return v_key;
end;
$$;

create or replace function private.hash_key(p_key text)
returns text
language sql volatile
set search_path = ''
as $$
  select extensions.crypt(p_key, extensions.gen_salt('bf', 10));
$$;

create or replace function private.require_admin(p_token text)
returns private.admins
language plpgsql
set search_path = ''
as $$
declare
  v_admin private.admins;
  v_hash text := private.hash_token(p_token);
begin
  select a.* into v_admin
    from private.admin_sessions s
    join private.admins a on a.id = s.admin_id
   where s.token_hash = v_hash
     and s.expires_at > now()
     and a.active;

  if v_admin.id is null then
    raise exception 'invalid_session' using errcode = '28000';
  end if;

  update private.admin_sessions set last_seen_at = now() where token_hash = v_hash;
  return v_admin;
end;
$$;

create or replace function private.audit(p_admin private.admins, p_action text, p_target text, p_details jsonb default '{}'::jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into private.admin_audit (admin_id, admin_name, action, target, details)
  values (p_admin.id, p_admin.name, p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function private.slugify(p_text text)
returns text
language sql immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p_text, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- Usado pela policy do bucket site-media (corre como anon, por isso é security definer).
create or replace function public.site_media_ticket_ok(p_folder text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.upload_tickets t
     where t.id::text = p_folder and t.expires_at > now()
  );
$$;

drop policy if exists "site_media_insert_with_ticket" on storage.objects;
create policy "site_media_insert_with_ticket"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'site-media' and public.site_media_ticket_ok((storage.foldername(name))[1]));

-- ===========================================================================
-- 6. API do painel
-- ===========================================================================

-- ---------- Sessão ----------
create or replace function public.admin_login(p_key text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_ip text := private.client_ip();
  v_key text := upper(regexp_replace(coalesce(p_key, ''), '[^A-Za-z0-9]', '', 'g'));
  v_failures int;
  v_oldest timestamptz;
  v_admin private.admins;
  v_token text;
  v_expires timestamptz := now() + interval '12 hours';
begin
  delete from private.admin_login_attempts where created_at < now() - interval '1 day';

  select count(*), min(created_at) into v_failures, v_oldest
    from private.admin_login_attempts
   where ip = v_ip and not success and created_at > now() - interval '15 minutes';

  if v_failures >= 5 then
    return jsonb_build_object(
      'ok', false, 'error', 'locked',
      'retry_after', ceil(extract(epoch from (v_oldest + interval '15 minutes' - now())))
    );
  end if;

  if char_length(v_key) = 8 then
    select * into v_admin
      from private.admins
     where active and key_hash = extensions.crypt(v_key, key_hash)
     limit 1;
  end if;

  if v_admin.id is null then
    insert into private.admin_login_attempts (ip, success) values (v_ip, false);
    return jsonb_build_object('ok', false, 'error', 'invalid_key', 'attempts_left', greatest(0, 4 - v_failures));
  end if;

  insert into private.admin_login_attempts (ip, success) values (v_ip, true);
  delete from private.admin_sessions where expires_at < now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.admin_sessions (token_hash, admin_id, expires_at, ip, user_agent)
  values (private.hash_token(v_token), v_admin.id, v_expires, v_ip, left(private.request_header('user-agent'), 300));

  update private.admins set last_login_at = now() where id = v_admin.id;
  perform private.audit(v_admin, 'login', null, jsonb_build_object('ip', v_ip));

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'expires_at', v_expires,
    'admin', jsonb_build_object('id', v_admin.id, 'name', v_admin.name)
  );
end;
$$;

create or replace function public.admin_session(p_token text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  return jsonb_build_object(
    'admin', jsonb_build_object('id', v_admin.id, 'name', v_admin.name),
    'expires_at', (select expires_at from private.admin_sessions where token_hash = private.hash_token(p_token))
  );
end;
$$;

create or replace function public.admin_logout(p_token text)
returns void
language sql security definer
set search_path = ''
as $$
  delete from private.admin_sessions where token_hash = private.hash_token(p_token);
$$;

-- ---------- Visão geral ----------
create or replace function public.admin_overview(p_token text, p_days int default 30)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from timestamptz := now() - make_interval(days => v_days);
  v_prev timestamptz := now() - make_interval(days => v_days * 2);
  v_from_day date := ((now() - make_interval(days => v_days - 1)) at time zone 'Africa/Luanda')::date;
  v_today date := (now() at time zone 'Africa/Luanda')::date;
  v_result jsonb := jsonb_build_object('days', v_days, 'generated_at', now());
  v_users jsonb := '{}'::jsonb;
  v_signups jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
begin
  -- Tráfego
  v_result := v_result || jsonb_build_object('traffic', (
    select jsonb_build_object(
      'visitors',      count(distinct visitor_id) filter (where created_at >= v_from),
      'visitors_prev', count(distinct visitor_id) filter (where created_at <  v_from),
      'views',         count(*) filter (where created_at >= v_from),
      'views_prev',    count(*) filter (where created_at <  v_from),
      'sessions',      count(distinct session_id) filter (where created_at >= v_from),
      'sessions_prev', count(distinct session_id) filter (where created_at <  v_from)
    )
    from public.site_events
    where type = 'page_view' and created_at >= v_prev
  ));

  v_result := v_result || jsonb_build_object(
    'top_pages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'views', views, 'visitors', visitors) order by views desc)
      from (
        select coalesce(path, '/') as path, count(*) as views, count(distinct visitor_id) as visitors
          from public.site_events
         where type = 'page_view' and created_at >= v_from
         group by 1 order by 2 desc limit 8
      ) t), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', device, 'visitors', visitors) order by visitors desc)
      from (
        select coalesce(device, 'desktop') as device, count(distinct visitor_id) as visitors
          from public.site_events
         where type = 'page_view' and created_at >= v_from
         group by 1
      ) t), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'visitors', visitors) order by visitors desc)
      from (
        select coalesce(nullif(substring(referrer from '^https?://(?:www\.)?([^/:]+)'), ''), 'Direto') as source,
               count(distinct visitor_id) as visitors
          from public.site_events
         where type = 'page_view' and created_at >= v_from
         group by 1 order by 2 desc limit 6
      ) t), '[]'::jsonb),
    'searches', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc)
      from (
        select lower(label) as label, count(*) as n
          from public.site_events
         where type = 'search' and created_at >= v_from and label is not null
         group by 1 order by 2 desc limit 8
      ) t), '[]'::jsonb),
    'service_clicks', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc)
      from (
        select label, count(*) as n
          from public.site_events
         where type = 'service_click' and created_at >= v_from and label is not null
         group by 1 order by 2 desc limit 8
      ) t), '[]'::jsonb)
  );

  -- Pedidos e candidaturas do site
  v_result := v_result || jsonb_build_object('site_requests', (
    select jsonb_build_object(
      'period', count(*) filter (where created_at >= v_from),
      'prev',   count(*) filter (where created_at >= v_prev and created_at < v_from),
      'open',   count(*) filter (where status = 'novo'),
      'total',  count(*)
    ) from public.service_requests
  ));

  if to_regclass('public.provider_applications') is not null then
    v_result := v_result || jsonb_build_object('applications', (
      select jsonb_build_object(
        'period',  count(*) filter (where created_at >= v_from),
        'prev',    count(*) filter (where created_at >= v_prev and created_at < v_from),
        'pending', count(*) filter (where status = 'pending'),
        'total',   count(*)
      ) from public.provider_applications
    ));
  end if;

  -- Utilizadores da app (profiles + auth.users)
  if to_regclass('public.profiles') is not null then
    select jsonb_build_object(
      'total',        count(*),
      'clients',      count(*) filter (where coalesce(p.role, 'client') = 'client'),
      'professionals',count(*) filter (where p.role = 'professional'),
      'new',          count(*) filter (where u.created_at >= v_from),
      'new_prev',     count(*) filter (where u.created_at >= v_prev and u.created_at < v_from),
      'new_clients',  count(*) filter (where u.created_at >= v_from and coalesce(p.role, 'client') = 'client'),
      'new_professionals', count(*) filter (where u.created_at >= v_from and p.role = 'professional'),
      'suspended',    count(*) filter (where u.banned_until > now())
    ) into v_users
    from public.profiles p
    join auth.users u on u.id = p.id;

    select coalesce(jsonb_agg(jsonb_build_object('date', d, 'clients', c, 'professionals', pr)), '[]'::jsonb)
      into v_signups
      from (
        select (u.created_at at time zone 'Africa/Luanda')::date as d,
               count(*) filter (where coalesce(p.role, 'client') = 'client') as c,
               count(*) filter (where p.role = 'professional') as pr
          from public.profiles p
          join auth.users u on u.id = p.id
         where u.created_at >= v_from
         group by 1
      ) t;
  end if;
  v_result := v_result || jsonb_build_object('users', v_users);

  -- Série diária (visitantes, visualizações, registos)
  v_result := v_result || jsonb_build_object('series', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'date', day,
      'visitors', coalesce(v.visitors, 0),
      'views', coalesce(v.views, 0),
      'clients', coalesce((s ->> 'clients')::int, 0),
      'professionals', coalesce((s ->> 'professionals')::int, 0)
    ) order by day), '[]'::jsonb)
    from generate_series(v_from_day::timestamp, v_today::timestamp, interval '1 day') as g(day_ts)
    cross join lateral (select g.day_ts::date as day) dd
    left join (
      select (created_at at time zone 'Africa/Luanda')::date as d,
             count(distinct visitor_id) as visitors, count(*) as views
        from public.site_events
       where type = 'page_view' and created_at >= v_from_day::timestamp at time zone 'Africa/Luanda'
       group by 1
    ) v on v.d = dd.day
    left join lateral (
      select x as s from jsonb_array_elements(v_signups) x where (x ->> 'date')::date = dd.day limit 1
    ) su on true
  ));

  -- Pedidos dentro da app
  if to_regclass('public.requests') is not null then
    v_result := v_result || jsonb_build_object('app_requests', (
      select jsonb_build_object(
        'period',    count(*) filter (where created_at >= v_from),
        'prev',      count(*) filter (where created_at >= v_prev and created_at < v_from),
        'pending',   count(*) filter (where created_at >= v_from and status = 'pending'),
        'accepted',  count(*) filter (where created_at >= v_from and status = 'accepted'),
        'completed', count(*) filter (where created_at >= v_from and status = 'completed'),
        'cancelled', count(*) filter (where created_at >= v_from and status in ('cancelled', 'rejected'))
      ) from public.requests
    ));
  end if;

  if to_regclass('public.reviews') is not null then
    v_result := v_result || jsonb_build_object('reviews', (
      select jsonb_build_object('count', count(*), 'average', round(avg(rating)::numeric, 2))
        from public.reviews
    ));
  end if;

  -- Atividade recente
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_recent from (
    select jsonb_build_object('kind', 'site_request', 'at', created_at, 'title', nome, 'detail', categoria) as x
      from public.service_requests order by created_at desc limit 8
  ) t;

  if to_regclass('public.provider_applications') is not null then
    v_recent := v_recent || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'application', 'at', created_at,
                                          'title', to_jsonb(a) ->> 'name', 'detail', to_jsonb(a) ->> 'work_area'))
        from (select * from public.provider_applications order by created_at desc limit 8) a
    ), '[]'::jsonb);
  end if;

  if to_regclass('public.profiles') is not null then
    v_recent := v_recent || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'signup', 'at', created_at, 'title', name, 'detail', role))
        from (
          select u.created_at, p.name, coalesce(p.role, 'client') as role
            from public.profiles p join auth.users u on u.id = p.id
           order by u.created_at desc limit 8
        ) s
    ), '[]'::jsonb);
  end if;

  v_recent := v_recent || coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'admin', 'at', created_at, 'title', admin_name, 'detail', action, 'target', target))
      from (select * from private.admin_audit where action <> 'login' order by created_at desc limit 8) l
  ), '[]'::jsonb);

  v_result := v_result || jsonb_build_object('recent', (
    select coalesce(jsonb_agg(e order by (e ->> 'at')::timestamptz desc), '[]'::jsonb)
      from (
        select e from jsonb_array_elements(v_recent) e
         order by (e ->> 'at')::timestamptz desc limit 12
      ) r
  ));

  return v_result;
end;
$$;

-- ---------- Atividade ----------
create or replace function public.admin_events(p_token text, p_type text default null, p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_lim int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_off int := greatest(coalesce(p_offset, 0), 0);
begin
  return jsonb_build_object(
    'total', (select count(*) from public.site_events where p_type is null or type = p_type),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
        from (
          select id, type, path, label, visitor_id, device, referrer, created_at
            from public.site_events
           where p_type is null or type = p_type
           order by created_at desc
           limit v_lim offset v_off
        ) e
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_audit_log(p_token text, p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_lim int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_off int := greatest(coalesce(p_offset, 0), 0);
begin
  return jsonb_build_object(
    'total', (select count(*) from private.admin_audit),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
        from (select * from private.admin_audit order by created_at desc limit v_lim offset v_off) a
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------- Pedidos do site ----------
create or replace function public.admin_list_site_requests(
  p_token text, p_status text default null, p_search text default null, p_limit int default 25, p_offset int default 0
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_lim int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_off int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  return (
    with f as (
      select r.* from public.service_requests r
       where (p_status is null or r.status = p_status)
         and (v_q is null or position(v_q in lower(r.nome || ' ' || r.telefone || ' ' || coalesce(r.email, '') || ' ' || r.categoria || ' ' || r.servico)) > 0)
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc)
                          from (select * from f order by created_at desc limit v_lim offset v_off) x), '[]'::jsonb),
      'counts', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.service_requests group by status) c), '{}'::jsonb)
    )
  );
end;
$$;

create or replace function public.admin_update_site_request(p_token text, p_id uuid, p_status text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  if p_status not in ('novo', 'em_contacto', 'agendado', 'concluido', 'cancelado') then
    raise exception 'invalid_status';
  end if;
  update public.service_requests set status = p_status where id = p_id;
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'site_request.status', p_id::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_delete_site_request(p_token text, p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_name text;
begin
  delete from public.service_requests where id = p_id returning nome into v_name;
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'site_request.delete', p_id::text, jsonb_build_object('nome', v_name));
end;
$$;

-- ---------- Candidaturas de profissionais ----------
create or replace function public.admin_list_applications(
  p_token text, p_status text default null, p_search text default null, p_limit int default 25, p_offset int default 0
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_lim int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_off int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  if to_regclass('public.provider_applications') is null then
    return jsonb_build_object('total', 0, 'rows', '[]'::jsonb, 'counts', '{}'::jsonb);
  end if;

  return (
    with f as (
      select to_jsonb(a) as j, a.created_at, a.status
        from public.provider_applications a
       where (p_status is null or a.status = p_status)
    ), g as (
      select * from f
       where v_q is null or position(v_q in lower(
         coalesce(j ->> 'name', '') || ' ' || coalesce(j ->> 'phone', '') || ' ' ||
         coalesce(j ->> 'email', '') || ' ' || coalesce(j ->> 'work_area', '') || ' ' || coalesce(j ->> 'city', '')
       )) > 0
    )
    select jsonb_build_object(
      'total', (select count(*) from g),
      'rows', coalesce((select jsonb_agg(x.j order by x.created_at desc)
                          from (select * from g order by created_at desc limit v_lim offset v_off) x), '[]'::jsonb),
      'counts', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.provider_applications group by status) c), '{}'::jsonb)
    )
  );
end;
$$;

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
  perform private.audit(v_admin, 'application.status', p_id::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_delete_application(p_token text, p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  delete from public.provider_applications where id = p_id;
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'application.delete', p_id::text);
end;
$$;

-- ---------- Utilizadores da app ----------
create or replace function public.admin_list_users(
  p_token text, p_role text default null, p_status text default null, p_search text default null,
  p_limit int default 25, p_offset int default 0
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_lim int := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_off int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  return (
    with base as (
      select to_jsonb(p) || jsonb_build_object(
               'email', u.email,
               'auth_phone', u.phone,
               'created_at', u.created_at,
               'last_sign_in_at', u.last_sign_in_at,
               'banned_until', u.banned_until,
               'suspended', coalesce(u.banned_until > now(), false),
               'role', coalesce(p.role, 'client')
             ) as j,
             u.created_at,
             coalesce(p.role, 'client') as role,
             coalesce(u.banned_until > now(), false) as suspended,
             lower(coalesce(p.name, '') || ' ' || coalesce(u.email, '') || ' ' || coalesce(p.phone, '') || ' ' || coalesce(u.phone, '')) as haystack
        from public.profiles p
        join auth.users u on u.id = p.id
    ), f as (
      select * from base
       where (p_role is null or role = p_role)
         and (p_status is null or (p_status = 'suspended') = suspended)
         and (v_q is null or position(v_q in haystack) > 0)
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'rows', coalesce((select jsonb_agg(x.j order by x.created_at desc)
                          from (select * from f order by created_at desc limit v_lim offset v_off) x), '[]'::jsonb),
      'counts', (select jsonb_build_object(
                   'all', count(*),
                   'client', count(*) filter (where role = 'client'),
                   'professional', count(*) filter (where role = 'professional'),
                   'suspended', count(*) filter (where suspended)
                 ) from base)
    )
  );
end;
$$;

create or replace function public.admin_user_detail(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_user jsonb;
  v_stats jsonb := '{}'::jsonb;
begin
  select to_jsonb(p) || jsonb_build_object(
           'email', u.email, 'auth_phone', u.phone, 'created_at', u.created_at,
           'last_sign_in_at', u.last_sign_in_at, 'banned_until', u.banned_until,
           'suspended', coalesce(u.banned_until > now(), false), 'role', coalesce(p.role, 'client'),
           'active_sessions', (select count(*) from auth.sessions s where s.user_id = u.id)
         )
    into v_user
    from public.profiles p join auth.users u on u.id = p.id
   where p.id = p_id;

  if v_user is null then raise exception 'not_found'; end if;

  if to_regclass('public.requests') is not null then
    v_stats := v_stats || jsonb_build_object(
      'requests_as_client', (select count(*) from public.requests where client_id = p_id),
      'requests_as_provider', (select count(*) from public.requests where provider_id = p_id),
      'completed', (select count(*) from public.requests where (client_id = p_id or provider_id = p_id) and status = 'completed'),
      'recent', coalesce((
        select jsonb_agg(jsonb_build_object('id', id, 'service', service_name, 'status', status, 'created_at', created_at,
                                            'as', case when client_id = p_id then 'client' else 'provider' end)
                         order by created_at desc)
          from (select * from public.requests where client_id = p_id or provider_id = p_id order by created_at desc limit 6) r
      ), '[]'::jsonb)
    );
  end if;

  if to_regclass('public.reviews') is not null then
    v_stats := v_stats || jsonb_build_object(
      'reviews', (select jsonb_build_object('count', count(*), 'average', round(avg(rating)::numeric, 2))
                    from public.reviews where provider_id = p_id)
    );
  end if;

  return jsonb_build_object('user', v_user, 'stats', v_stats);
end;
$$;

create or replace function public.admin_update_user(p_token text, p_id uuid, p_name text, p_phone text, p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  if p_role not in ('client', 'professional') then raise exception 'invalid_role'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'invalid_name'; end if;

  update public.profiles
     set name = trim(p_name), phone = nullif(trim(coalesce(p_phone, '')), ''), role = p_role
   where id = p_id;
  if not found then raise exception 'not_found'; end if;

  perform private.audit(v_admin, 'user.update', p_id::text, jsonb_build_object('name', trim(p_name), 'role', p_role));
end;
$$;

-- Suspende o acesso: o Supabase Auth recusa logins e renovações enquanto banned_until > now().
create or replace function public.admin_suspend_user(p_token text, p_id uuid, p_days int default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_until timestamptz := case when p_days is null then now() + interval '100 years'
                              else now() + make_interval(days => greatest(p_days, 1)) end;
begin
  update auth.users set banned_until = v_until where id = p_id;
  if not found then raise exception 'not_found'; end if;
  delete from auth.sessions where user_id = p_id;
  delete from auth.refresh_tokens where user_id = p_id::text;
  perform private.audit(v_admin, 'user.suspend', p_id::text, jsonb_build_object('days', p_days, 'until', v_until));
end;
$$;

create or replace function public.admin_unsuspend_user(p_token text, p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  update auth.users set banned_until = null where id = p_id;
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'user.unsuspend', p_id::text);
end;
$$;

create or replace function public.admin_revoke_user_sessions(p_token text, p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  delete from auth.sessions where user_id = p_id;
  delete from auth.refresh_tokens where user_id = p_id::text;
  perform private.audit(v_admin, 'user.sessions_revoked', p_id::text);
end;
$$;

create or replace function public.admin_delete_user(p_token text, p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_name text;
begin
  select name into v_name from public.profiles where id = p_id;
  delete from public.profiles where id = p_id;
  delete from auth.users where id = p_id;
  if not found and v_name is null then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'user.delete', p_id::text, jsonb_build_object('name', v_name));
end;
$$;

-- ---------- Serviços do site ----------
create or replace function public.admin_list_services(p_token text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  return coalesce((select jsonb_agg(to_jsonb(s) order by s.sort_order, s.title) from public.site_services s), '[]'::jsonb);
end;
$$;

create or replace function public.admin_save_service(p_token text, p_service jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_id text := nullif(trim(coalesce(p_service ->> 'id', '')), '');
  v_title text := trim(coalesce(p_service ->> 'title', ''));
  v_base text;
  v_n int := 1;
  v_row public.site_services;
begin
  if char_length(v_title) < 2 then raise exception 'invalid_title'; end if;

  if v_id is null then
    v_base := left(nullif(private.slugify(v_title), ''), 70);
    if v_base is null then raise exception 'invalid_title'; end if;
    v_id := v_base;
    while exists (select 1 from public.site_services where id = v_id) loop
      v_n := v_n + 1;
      v_id := v_base || '-' || v_n;
    end loop;

    insert into public.site_services (id, title, description, price, image_url, keywords, active, sort_order)
    values (
      v_id, v_title,
      trim(coalesce(p_service ->> 'description', '')),
      nullif(trim(coalesce(p_service ->> 'price', '')), ''),
      trim(coalesce(p_service ->> 'image_url', '')),
      trim(coalesce(p_service ->> 'keywords', '')),
      coalesce((p_service ->> 'active')::boolean, true),
      coalesce((select max(sort_order) from public.site_services), 0) + 1
    )
    returning * into v_row;
    perform private.audit(v_admin, 'service.create', v_id, jsonb_build_object('title', v_title));
  else
    update public.site_services
       set title = v_title,
           description = trim(coalesce(p_service ->> 'description', '')),
           price = nullif(trim(coalesce(p_service ->> 'price', '')), ''),
           image_url = trim(coalesce(p_service ->> 'image_url', '')),
           keywords = trim(coalesce(p_service ->> 'keywords', '')),
           active = coalesce((p_service ->> 'active')::boolean, active),
           updated_at = now()
     where id = v_id
    returning * into v_row;
    if v_row.id is null then raise exception 'not_found'; end if;
    perform private.audit(v_admin, 'service.update', v_id, jsonb_build_object('title', v_title));
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_delete_service(p_token text, p_id text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_title text;
begin
  delete from public.site_services where id = p_id returning title into v_title;
  if not found then raise exception 'not_found'; end if;
  perform private.audit(v_admin, 'service.delete', p_id, jsonb_build_object('title', v_title));
end;
$$;

create or replace function public.admin_reorder_services(p_token text, p_ids text[])
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  update public.site_services s
     set sort_order = o.pos, updated_at = now()
    from unnest(p_ids) with ordinality as o(id, pos)
   where s.id = o.id;
  perform private.audit(v_admin, 'service.reorder', null);
end;
$$;

-- Devolve uma pasta temporária (15 min) onde o browser pode carregar imagens para site-media.
create or replace function public.admin_upload_ticket(p_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_id uuid;
begin
  delete from private.upload_tickets where expires_at < now();
  insert into private.upload_tickets (admin_id) values (v_admin.id) returning id into v_id;
  return v_id;
end;
$$;

-- ---------- Administradores ----------
create or replace function public.admin_list_admins(p_token text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'name', a.name, 'active', a.active, 'created_at', a.created_at,
      'last_login_at', a.last_login_at, 'is_me', a.id = v_admin.id,
      'sessions', (select count(*) from private.admin_sessions s where s.admin_id = a.id and s.expires_at > now())
    ) order by a.created_at)
    from private.admins a
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_create_admin(p_token text, p_name text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_key text := private.random_key();
  v_id uuid;
begin
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'invalid_name'; end if;
  insert into private.admins (name, key_hash, created_by)
  values (trim(p_name), private.hash_key(v_key), v_admin.id)
  returning id into v_id;
  perform private.audit(v_admin, 'admin.create', v_id::text, jsonb_build_object('name', trim(p_name)));
  return jsonb_build_object('id', v_id, 'name', trim(p_name), 'key', v_key);
end;
$$;

create or replace function public.admin_reset_admin_key(p_token text, p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
  v_key text := private.random_key();
begin
  update private.admins set key_hash = private.hash_key(v_key) where id = p_id;
  if not found then raise exception 'not_found'; end if;
  -- Termina as sessões dessa conta (menos a sessão atual, se for a própria).
  delete from private.admin_sessions
   where admin_id = p_id and token_hash <> private.hash_token(p_token);
  perform private.audit(v_admin, 'admin.reset_key', p_id::text);
  return jsonb_build_object('key', v_key);
end;
$$;

create or replace function public.admin_set_admin_active(p_token text, p_id uuid, p_active boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  if p_id = v_admin.id and not p_active then raise exception 'cannot_disable_self'; end if;
  update private.admins set active = p_active where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if not p_active then
    delete from private.admin_sessions where admin_id = p_id;
  end if;
  perform private.audit(v_admin, case when p_active then 'admin.enable' else 'admin.disable' end, p_id::text);
end;
$$;

create or replace function public.admin_end_other_sessions(p_token text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_admin private.admins := private.require_admin(p_token);
begin
  delete from private.admin_sessions
   where admin_id = v_admin.id and token_hash <> private.hash_token(p_token);
  perform private.audit(v_admin, 'admin.end_other_sessions', null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões: só as funções admin_* ficam acessíveis pela API (e todas exigem token).
-- ---------------------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and (p.proname like 'admin\_%' or p.proname = 'site_media_ticket_ok')
  loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;

  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private'
       and p.proname in ('request_header', 'client_ip', 'hash_token', 'random_key', 'hash_key',
                         'require_admin', 'audit', 'slugify', 'bootstrap_admin')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Primeiro administrador. Só cria se ainda não existir nenhum.
-- ---------------------------------------------------------------------------
create or replace function private.bootstrap_admin(p_name text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_key text;
begin
  if exists (select 1 from private.admins) then
    return 'Já existe um administrador. Crie novas chaves em Definições, no painel.';
  end if;
  v_key := private.random_key();
  insert into private.admins (name, key_hash) values (p_name, private.hash_key(v_key));
  return v_key;
end;
$$;

revoke all on function private.bootstrap_admin(text) from public, anon, authenticated;

select private.bootstrap_admin('Super Admin') as chave_de_acesso;
