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

Sem estas variáveis a app continua a funcionar (mostra o ecrã de sucesso à mesma), mas os dados não são guardados.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (`dist/`) |
| `npm run preview` | Pré-visualizar o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos |
