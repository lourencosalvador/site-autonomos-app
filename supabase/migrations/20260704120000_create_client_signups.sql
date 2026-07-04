/*
# Create table for early-access client signups

1. Purpose
   Before the AUTONOMOUS mobile app launches, visitors can pre-register as
   clients ("rede de clientes"). When the app ships they simply log in with the
   same contact. This is a public, no-auth waitlist form, so the anon-key
   frontend must be able to INSERT.

2. New Table
   - `client_signups`
     - id (uuid, pk)
     - nome (text, not null) — client name
     - telefone (text, not null) — phone / WhatsApp
     - email (text, nullable) — optional email
     - cidade (text, nullable) — city
     - origem (text, default 'landing') — where the signup came from
     - status (text, default 'novo') — internal status
     - created_at (timestamptz, default now())

3. Security
   - RLS enabled.
   - Public INSERT only (TO anon, authenticated) — anyone can join the waitlist.
   - No SELECT/UPDATE/DELETE for anon, to avoid exposing collected contacts.
   - A partial unique index on lower(email) keeps duplicate emails out while
     still allowing many rows without an email.
*/

CREATE TABLE IF NOT EXISTS client_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  cidade text,
  origem text NOT NULL DEFAULT 'landing',
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS client_signups_email_unique
  ON client_signups (lower(email))
  WHERE email IS NOT NULL;

ALTER TABLE client_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_client_signups" ON client_signups;
CREATE POLICY "anon_insert_client_signups"
  ON client_signups FOR INSERT
  TO anon, authenticated WITH CHECK (true);
