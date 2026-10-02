# site-autonomos-app

**AUTONOMOUS** — a maior rede de profissionais independentes de Angola. Marketplace que liga clientes a profissionais qualificados (canalizadores, eletricistas, técnicos e muito mais) de forma rápida, simples e segura.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** (tema claro, animações de scroll)
- **Supabase** (formulários de pedido e candidatura)
- **lucide-react** (ícones)

## Começar

```bash
npm install
npm run dev
```

A app fica disponível em `http://localhost:5173`.

## Variáveis de ambiente

Os formulários (Solicitar Serviço / Ser Profissional) usam Supabase. Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Sem estas variáveis o site funciona, mas os formulários mostram um erro ao submeter (os dados não podem ser guardados).

Tabelas e buckets usados (ver `supabase/migrations/`):

| Formulário | Tabela | Bucket de ficheiros |
| --- | --- | --- |
| Solicitar Serviço | `service_requests` | `request-attachments` |
| Ser Profissional | `provider_applications` | `applications` |

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (`dist/`) |
| `npm run preview` | Pré-visualizar o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos |

## Painel de administração

Disponível em `/#/admin` (só para super admins). O código do painel só é descarregado por quem abre esse endereço.

**Configurar (uma vez):** no Supabase → SQL Editor, correr `supabase/migrations/20261002120000_admin_dashboard.sql`.
A última linha devolve a **chave de acesso** do primeiro administrador (8 caracteres). Guarde-a: não volta a ser mostrada.
Os restantes administradores e as novas chaves criam-se no próprio painel, em **Definições**.

O que o painel faz:

- **Visão geral** — visitantes, visualizações, origem do tráfego, dispositivos, pesquisas, serviços mais pedidos,
  utilizadores da app (clientes / profissionais), pedidos e avaliações, atividade recente.
- **Atividade** — todos os eventos do site e o registo de auditoria das ações dos administradores.
- **Pedidos do site** e **Candidaturas** — tratar, aprovar ou rejeitar.
- **Utilizadores** — editar, suspender o acesso (24 h, 7 dias, 30 dias ou indefinidamente), terminar sessões, remover.
- **Serviços** — criar, editar, ocultar, reordenar e remover os serviços mostrados no site (com upload de imagem).
- **Pagamentos** — total recebido, receita, escrow, saques e saldos dos prestadores; cobranças AppyPay
  (Referência e Multicaixa Express), cobranças manuais, verificação, reembolsos e exportação CSV.
  Configuração em `supabase/functions/README.md` (secção AppyPay).

Segurança: a chave é verificada no servidor (só se guarda o hash bcrypt), com bloqueio de 15 minutos após 5 tentativas
falhadas por IP. As sessões duram 12 horas e todas as ações exigem o token de sessão.

Analytics: o site regista visitas e ações de forma anónima em `site_events`. Em desenvolvimento (`npm run dev`) não
regista nada, a não ser com `VITE_ANALYTICS_DEV=1`.
