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

## Estado do provisionamento e re-emissão da chave

Cada adesão guarda `provision_status` (+ `provisioned_at`, `auth_user_id`):

| valor         | significado                                             |
|---------------|---------------------------------------------------------|
| `pending`     | ainda não processado                                    |
| `sms_sent`    | conta criada **e** SMS entregue ✅                       |
| `sms_failed`  | conta criada mas **SMS não entregue** (re-emitir) ⚠️    |
| `exists`      | já havia conta para este telefone                       |
| `error`       | falha a criar a conta                                   |

> A conta é criada mesmo que o SMS falhe — mas sem a chave a pessoa não consegue
> entrar. Por isso, quando o SMS falha, o registo fica `sms_failed` para reenvio.

**Ver quem ficou sem SMS:**
```sql
select id, name, phone, provision_status
  from provider_applications where provision_status = 'sms_failed';
select id, nome, telefone, provision_status
  from client_signups where provision_status = 'sms_failed';
```

**Re-emitir a chave** (gera uma NOVA chave, repõe a password e reenvia o SMS):
```sql
update provider_applications set provision_status = 'reissue' where id = '<id>';
update client_signups        set provision_status = 'reissue' where id = '<id>';
```
O trigger dispara a função em modo `reissue`; no fim o `provision_status` volta a
`sms_sent` (ou `sms_failed` se ainda não houver remetente Twilio).

## Notas

- **Idempotência:** se já existir um `profiles.phone` igual, a função devolve
  `exists` e não cria nada — seguro contra disparos repetidos.
- **Telefone** é normalizado para E.164 (assume `+244` sem indicativo).
- **Twilio sem remetente configurado** → o SMS é *simulado* (log) e a conta é
  criada na mesma; basta depois definir `TWILIO_FROM`/`TWILIO_MESSAGING_SERVICE_SID`.
- A chave nunca é devolvida ao browser nem guardada em claro — só o hash da
  password fica no Supabase Auth.

---

# Pagamentos AppyPay (`appypay-charge`, `appypay-webhook`, `appypay-admin`)

Pagamento por **Referência** (ATM, Multicaixa Express, Internet Banking) e por **Multicaixa Express** (GPO,
aprovação no telemóvel) através da [AppyPay](https://appypay.stoplight.io/docs/appypay-payment-gateway/).

## Fluxo

```
App (cliente com sessão)
  └─ POST appypay-charge { request_id, method }      ← valor calculado no servidor (requests.client_total)
        ├─ pay_prepare_charge  (SQL: valida pedido, cria payment_charges)
        ├─ AppyPay POST /v2.0/charges
        │     REF → devolve logo entidade + referência + validade
        │     GPO → 202, o cliente aprova na app Multicaixa Express
        └─ pay_record_gateway  (SQL: guarda a resposta)

AppyPay ──► appypay-webhook?secret=…
        ├─ confirma SEMPRE o estado com GET /v2.0/charges/{id} (não confia no aviso)
        └─ pay_record_gateway → se pago: cria a linha em `payments` (escrow retido)
                                e marca o pedido como pago — o mesmo formato que a carteira lê.

Painel (#/admin → Pagamentos) ──► appypay-admin (x-admin-token)
        status · cobrança manual · verificar estado · reembolso (só GPO)
```

## Configurar (uma vez)

1. Correr no SQL Editor `supabase/migrations/20261002150000_payments_appypay.sql`
   (depois da migração do painel `20261002120000_admin_dashboard.sql`).
2. No [Web App da AppyPay](https://appypay.co.ao): criar as credenciais (Client ID / Secret) e as aplicações
   dos métodos **REF** e **GPO** — cada uma tem um identificador do tipo `REF_xxxxxxxx-…` / `GPO_xxxxxxxx-…`.
3. Definir os segredos das funções:

```bash
supabase secrets set APPYPAY_CLIENT_ID=... APPYPAY_CLIENT_SECRET=... \
  APPYPAY_METHOD_REF=REF_... APPYPAY_METHOD_GPO=GPO_... \
  APPYPAY_WEBHOOK_SECRET=$(openssl rand -hex 24)
# Ambiente de testes da AppyPay (opcional):
supabase secrets set APPYPAY_BASE_URL=https://gwy-api-tst.appypay.co.ao/v2.0
```

4. Publicar as funções:

```bash
supabase functions deploy appypay-charge
supabase functions deploy appypay-webhook --no-verify-jwt
supabase functions deploy appypay-admin --no-verify-jwt
```

5. Na AppyPay → Webhooks, configurar:
   `https://dbmitproxcogmtwfyhen.supabase.co/functions/v1/appypay-webhook?secret=<APPYPAY_WEBHOOK_SECRET>`

O painel mostra no topo de Pagamentos se a AppyPay está ligada e o que falta configurar.

## API para a app mobile

Todas as chamadas levam o JWT do utilizador (`Authorization: Bearer <access_token>`), como as restantes
chamadas ao Supabase. Com o supabase-js: `supabase.functions.invoke('appypay-charge', { body })`.

**Gerar referência**

```http
POST /functions/v1/appypay-charge
{ "request_id": "<uuid do pedido>", "method": "REF" }

200 { "charge": { "id": "…", "method": "REF", "status": "pending", "amount": 55000, "currency": "AOA",
                  "reference": { "entity": "00123", "number": "397107019", "due_at": "2026-10-05T23:59:00+01:00" } } }
```

Pedir de novo devolve a mesma referência enquanto for válida (`"reused": true`).

**Multicaixa Express**

```http
POST /functions/v1/appypay-charge
{ "request_id": "<uuid>", "method": "GPO", "phone": "923 456 789" }

200 { "charge": { "id": "…", "method": "GPO", "status": "pending", … } }
```

O cliente tem ~1 minuto para aprovar na app Multicaixa Express. A app acompanha o estado com
`GET /functions/v1/appypay-charge?id=<charge.id>` (ou lendo `payment_charges`, que o cliente pode ler — e
subscrever via Realtime). Estados: `pending` → `success` | `failed` | `expired`.

**Erros** (`{ "error": "<código>" }`): `invalid_method`, `invalid_phone`, `amount_not_set`, `already_paid`,
`request_closed`, `charge_in_progress` (já há um pedido Express ativo), `unsupported_currency`,
`forbidden`, `payments_unavailable` (AppyPay por configurar), `gateway_unavailable`.

## Compatibilidade com o backend / app

Quando um pagamento AppyPay é confirmado é criada a linha em `payments` com:
`status = 'succeeded'`, `escrow_status = 'held'`, `stripe_payment_intent_id = 'appypay_<transação>'`
e as taxas copiadas de `requests` (`agreed_amount`, `request_fee`, `service_fee`, `urgent_bonus`,
`provider_net`, `platform_net`). O pedido fica com `payment_status = 'succeeded'`.

Estes nomes de estado e a unidade dos valores (cêntimos) são editáveis no painel → Pagamentos →
Configuração, para coincidirem exatamente com o que a app e o backend (autonomos-server) usam.
A libertação do escrow ("Serviço concluído", FlexPay 30/70 nos serviços de vários dias) continua a ser feita
pelo backend: confirme que essa lógica trata também os pagamentos `appypay_…`.
