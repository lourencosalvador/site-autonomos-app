/*
# Safeguard + re-emissão da chave de acesso

Problema
  Criar a conta e enviar o SMS são passos independentes. Se o SMS falhar (ex.:
  Twilio ainda sem remetente), a conta fica criada mas a pessoa nunca recebe a
  chave (= password) — conta inacessível.

Solução
  1. Rastreio: cada adesão passa a guardar `provision_status`, `provisioned_at` e
     `auth_user_id`. A Edge Function escreve o resultado de volta no registo.
       provision_status ∈
         'pending'      -> ainda não processado
         'sms_sent'     -> conta criada + SMS entregue
         'sms_failed'   -> conta criada mas SMS NÃO entregue (precisa re-emitir)
         'exists'       -> já havia conta para este telefone
         'error'        -> falha a criar a conta
  2. Re-emissão: o admin põe `provision_status = 'reissue'` num registo; o trigger
     dispara a função em modo reissue, que GERA UMA NOVA CHAVE, repõe a password
     do utilizador e reenvia o SMS.

Encontrar falhas (admin):
  select id, name, phone, provision_status
    from provider_applications where provision_status = 'sms_failed';
  select id, nome, telefone, provision_status
    from client_signups where provision_status = 'sms_failed';

Re-emitir a chave (admin):
  update provider_applications set provision_status = 'reissue' where id = '<id>';
  update client_signups        set provision_status = 'reissue' where id = '<id>';
*/

-- ---------------------------------------------------------------------------
-- Colunas de rastreio
-- ---------------------------------------------------------------------------
alter table client_signups
  add column if not exists provision_status text not null default 'pending',
  add column if not exists provisioned_at timestamptz,
  add column if not exists auth_user_id uuid;

alter table provider_applications
  add column if not exists provision_status text not null default 'pending',
  add column if not exists provisioned_at timestamptz,
  add column if not exists auth_user_id uuid;

-- ---------------------------------------------------------------------------
-- enqueue: agora com modo ('provision' | 'reissue') e auth_user_id.
-- Substitui a versão de 6 args da migração anterior (as chamadas antigas de 6
-- args continuam válidas via defaults).
-- ---------------------------------------------------------------------------
drop function if exists private.enqueue_account_provision(text, text, text, text, text, uuid);

create function private.enqueue_account_provision(
  p_source       text,
  p_role         text,
  p_name         text,
  p_phone        text,
  p_email        text,
  p_ref          uuid,
  p_mode         text default 'provision',
  p_auth_user_id uuid default null
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
    raise warning '[provision] private.provision_config vazio — a saltar (% / %)', p_mode, p_phone;
    return;
  end if;

  perform net.http_post(
    url     := cfg.function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-provision-secret', cfg.provision_secret
    ),
    body    := jsonb_build_object(
      'source',     p_source,
      'role',       p_role,
      'name',       p_name,
      'phone',      p_phone,
      'email',      p_email,
      'ref',        p_ref,
      'mode',       p_mode,
      'authUserId', p_auth_user_id
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers de re-emissão (quando provision_status passa a 'reissue').
-- A própria função escreve 'sms_sent'/'sms_failed' de volta — nunca 'reissue' —
-- por isso não há ciclo.
-- ---------------------------------------------------------------------------
create or replace function private.on_client_reissue()
returns trigger
language plpgsql
security definer
set search_path = private, public, extensions
as $$
begin
  if new.provision_status = 'reissue' and old.provision_status is distinct from 'reissue' then
    perform private.enqueue_account_provision(
      'client_signup', 'client', new.nome, new.telefone, new.email, new.id,
      'reissue', new.auth_user_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_client_reissue on client_signups;
create trigger trg_client_reissue
  after update on client_signups
  for each row execute function private.on_client_reissue();

create or replace function private.on_provider_reissue()
returns trigger
language plpgsql
security definer
set search_path = private, public, extensions
as $$
begin
  if new.provision_status = 'reissue' and old.provision_status is distinct from 'reissue' then
    perform private.enqueue_account_provision(
      'provider_application', 'professional', new.name, new.phone, new.email, new.id,
      'reissue', new.auth_user_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_provider_reissue on provider_applications;
create trigger trg_provider_reissue
  after update on provider_applications
  for each row execute function private.on_provider_reissue();
