/*
# Auto-provisioning de contas (cliente + prestador) com chave de acesso por SMS

Objetivo
  Quando alguém adere pelo site, a conta deve ficar criada no Supabase (auth.users
  + profiles) para que na app seja "só fazer login". A pessoa recebe por SMS uma
  CHAVE DE ACESSO que funciona como password inicial (alterável depois na app).

  - CLIENTE  → provisionado imediatamente ao inserir em `client_signups`.
  - PRESTADOR → provisionado só quando o admin muda `provider_applications.status`
               para 'approved'.

Como funciona
  Estes triggers NÃO criam a conta diretamente (criar auth.users + enviar SMS exige
  a Admin API e o Twilio, que vivem fora do Postgres). Em vez disso, disparam de
  forma assíncrona (pg_net) a Edge Function `provision-account`, que faz o trabalho
  pesado com a service-role key. Assim o INSERT/UPDATE do site responde na hora e o
  provisionamento acontece em background.

Segurança
  - A Edge Function é chamada com um segredo partilhado (`x-provision-secret`) que
    vive em `private.provision_config` (schema não exposto na API pública).
  - O browser nunca chama a função nem cria contas — só insere nas tabelas públicas.

Pós-deploy (obrigatório — ver supabase/functions/README.md)
  1. Fazer deploy da função:  supabase functions deploy provision-account --no-verify-jwt
  2. Definir os secrets da função (service role + Twilio + PROVISION_SECRET).
  3. Preencher a config abaixo com o URL da função e o mesmo PROVISION_SECRET:
       insert into private.provision_config (id, function_url, provision_secret)
       values (1,
         'https://<PROJECT_REF>.functions.supabase.co/provision-account',
         '<PROVISION_SECRET>')
       on conflict (id) do update
         set function_url = excluded.function_url,
             provision_secret = excluded.provision_secret;
*/

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Config privada (URL da função + segredo). Schema `private` não é exposto na API.
-- ---------------------------------------------------------------------------
create schema if not exists private;

create table if not exists private.provision_config (
  id int primary key default 1,
  function_url text not null,
  provision_secret text not null,
  constraint provision_config_singleton check (id = 1)
);

-- ---------------------------------------------------------------------------
-- Enfileira uma chamada à Edge Function (assíncrono, não bloqueia a transação).
-- ---------------------------------------------------------------------------
create or replace function private.enqueue_account_provision(
  p_source text,
  p_role   text,
  p_name   text,
  p_phone  text,
  p_email  text,
  p_ref    uuid
) returns void
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  cfg private.provision_config;
begin
  select * into cfg from private.provision_config where id = 1;

  if cfg.function_url is null then
    raise warning '[provision] private.provision_config vazio — a saltar provisionamento de %', p_phone;
    return;
  end if;

  perform net.http_post(
    url     := cfg.function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-provision-secret', cfg.provision_secret
    ),
    body    := jsonb_build_object(
      'source', p_source,
      'role',   p_role,
      'name',   p_name,
      'phone',  p_phone,
      'email',  p_email,
      'ref',    p_ref
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- CLIENTE: provisiona imediatamente após o signup.
-- ---------------------------------------------------------------------------
create or replace function private.on_client_signup()
returns trigger
language plpgsql
security definer
set search_path = private, public, extensions
as $$
begin
  perform private.enqueue_account_provision(
    'client_signup', 'client', new.nome, new.telefone, new.email, new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_client_signup_provision on client_signups;
create trigger trg_client_signup_provision
  after insert on client_signups
  for each row execute function private.on_client_signup();

-- ---------------------------------------------------------------------------
-- PRESTADOR: provisiona quando o admin aprova (status -> 'approved').
-- ---------------------------------------------------------------------------
create or replace function private.on_provider_approved()
returns trigger
language plpgsql
security definer
set search_path = private, public, extensions
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    perform private.enqueue_account_provision(
      'provider_application', 'professional', new.name, new.phone, new.email, new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_provider_approved_provision on provider_applications;
create trigger trg_provider_approved_provision
  after update on provider_applications
  for each row execute function private.on_provider_approved();
