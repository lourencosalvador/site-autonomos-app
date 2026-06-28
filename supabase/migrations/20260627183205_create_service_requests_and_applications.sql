/*
# Create tables for service requests and professional applications

1. Purpose
   AUTONOMOUS is a no-auth public website. Visitors submit two kinds of forms:
   - "Solicitar Serviço" (service requests from customers)
   - "Ser Profissional" (applications from professionals wanting to join the network)
   Both forms are public (no sign-in), so the anon-key frontend must be able to INSERT.

2. New Tables
   - `service_requests`
     - id (uuid, pk)
     - nome (text, not null) — customer name
     - telefone (text, not null) — phone
     - email (text, nullable) — optional email
     - cidade (text, not null) — city
     - endereco (text, nullable) — address
     - categoria (text, not null) — service category
     - descricao (text, not null) — service description
     - urgencia (text, not null) — urgency level
     - data_pretendida (date, nullable) — preferred date
     - status (text, default 'novo') — internal status
     - created_at (timestamptz, default now())
   - `professional_applications`
     - id (uuid, pk)
     - nome (text, not null)
     - telefone (text, not null)
     - email (text, nullable)
     - cidade (text, not null)
     - area (text, not null) — area of work
     - especialidade (text, not null) — specialty
     - anos_experiencia (text, not null) — years of experience
     - descricao (text, not null)
     - termos_aceites (boolean, not null, default false)
     - status (text, default 'pendente')
     - created_at (timestamptz, default now())

3. Security
   - RLS enabled on both tables.
   - Public INSERT only (TO anon, authenticated) — anyone can submit a form.
   - No SELECT/UPDATE/DELETE for anon — only internal/admin access would read these,
     and since there is no admin auth in this app, we keep them insert-only for the
     public role to avoid exposing submitted personal data.

4. Notes
   - No user_id / auth.users linkage — this is a single-tenant public site.
   - File uploads (photo, BI) are validated client-side; storage buckets are not
     created here to keep scope focused on form data persistence.
*/

CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  cidade text NOT NULL,
  endereco text,
  categoria text NOT NULL,
  descricao text NOT NULL,
  urgencia text NOT NULL,
  data_pretendida date,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_service_requests" ON service_requests;
CREATE POLICY "anon_insert_service_requests"
  ON service_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS professional_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  cidade text NOT NULL,
  area text NOT NULL,
  especialidade text NOT NULL,
  anos_experiencia text NOT NULL,
  descricao text NOT NULL,
  termos_aceites boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE professional_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_professional_applications" ON professional_applications;
CREATE POLICY "anon_insert_professional_applications"
  ON professional_applications FOR INSERT
  TO anon, authenticated WITH CHECK (true);
