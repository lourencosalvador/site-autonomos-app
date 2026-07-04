# Provisionamento de contas (`provision-account`)

Quando alguém adere pelo site, a conta é criada no Supabase (auth.users + `profiles`)
e a pessoa recebe por **SMS** uma **chave de acesso** que serve de password inicial
(alterável depois na app). Na app é só fazer login.

- **Cliente** → provisionado no momento em que insere em `client_signups`.
- **Prestador** → provisionado quando o admin muda `provider_applications.status`
  para `approved`.

## Fluxo

```
Site (browser)
  └─ insert client_signups / provider_applications   (anon key, RLS insert-only)
        │
        ▼  trigger na BD (pg_net, assíncrono)
  Edge Function  provision-account   (service role)
        ├─ gera chave de acesso (= password)
        ├─ auth.admin.createUser({ phone, password })
        ├─ upsert profiles (role, phone, approval_status)
        └─ Twilio SMS com a chave
```

O browser **nunca** chama a função nem cria contas — só insere nas tabelas. A função
só aceita chamadas com o cabeçalho `x-provision-secret` correto.

## Deploy (uma vez)

```bash
# 1. Aplicar a migração (cria triggers + private.provision_config)
supabase db push

# 2. Deploy da função (sem verificação de JWT — usa o nosso segredo)
supabase functions deploy provision-account --no-verify-jwt

# 3. Definir os secrets da função
supabase secrets set PROVISION_SECRET="<segredo-forte-aleatorio>"
supabase secrets set TWILIO_ACCOUNT_SID="AC..."
supabase secrets set TWILIO_AUTH_TOKEN="..."
# UM remetente:
supabase secrets set TWILIO_FROM="+1..."          # nº Twilio, OU
# supabase secrets set TWILIO_MESSAGING_SERVICE_SID="MG..."
# (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente)

# 4. Ligar os triggers à função: preencher a config com o MESMO PROVISION_SECRET
#    (correr no SQL editor do Supabase)
```

```sql
insert into private.provision_config (id, function_url, provision_secret)
values (
  1,
  'https://<PROJECT_REF>.functions.supabase.co/provision-account',
  '<mesmo PROVISION_SECRET do passo 3>'
)
on conflict (id) do update
  set function_url = excluded.function_url,
      provision_secret = excluded.provision_secret;
```

> ⚠️ Sem o passo 4 (config vazia), os triggers apenas registam um `warning` e não
> provisionam — o site continua a funcionar, apenas não cria contas/SMS.

## Aprovar um prestador (admin)

No Supabase Studio (Table editor → `provider_applications`) ou por SQL:

```sql
update provider_applications
   set status = 'approved', reviewed_at = now()
 where id = '<id-da-candidatura>';
```

O trigger dispara e a chave segue por SMS para o número do prestador.

## Notas

- **Idempotência:** se já existir um `profiles.phone` igual, a função devolve
  `exists` e não cria nada — seguro contra disparos repetidos.
- **Telefone** é normalizado para E.164 (assume `+244` sem indicativo).
- **Twilio sem remetente configurado** → o SMS é *simulado* (log) e a conta é
  criada na mesma; basta depois definir `TWILIO_FROM`/`TWILIO_MESSAGING_SERVICE_SID`.
- A chave nunca é devolvida ao browser nem guardada em claro — só o hash da
  password fica no Supabase Auth.
