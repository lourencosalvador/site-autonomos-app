/*
# Pedidos de serviço submetidos pelo site (Solicitar Serviço)

A página pública "Solicitar Serviço" grava aqui todas as informações que o
prestador precisa para entender a necessidade do cliente. Formulário público
(sem auth) → a anon-key só pode INSERT.

Tabela `service_requests`
  - nome, telefone (obrigatórios)
  - email (opcional)
  - endereco (obrigatório)
  - categoria (já selecionada), servico (serviço específico pretendido)
  - descricao (detalhada)
  - data_desejada (date, opcional), horario_preferencial (texto, opcional)
  - anexos (jsonb: array de URLs públicas de imagens/documentos)
  - status ('novo' por defeito), created_at

Anexos vão para o bucket público `request-attachments` (upload anon permitido).
*/

create table if not exists service_requests (
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

alter table service_requests enable row level security;

drop policy if exists "anon_insert_service_requests" on service_requests;
create policy "anon_insert_service_requests"
  on service_requests for insert
  to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Bucket público para os anexos + políticas de upload/leitura.
-- ---------------------------------------------------------------------------
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
