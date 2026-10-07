import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * When the Supabase env vars are not set we still create a client against a
 * harmless placeholder URL so the app boots. Guard real calls with
 * `isSupabaseConfigured` before hitting the network.
 *
 * A sessão do utilizador (cliente/prestador) é persistida no browser. O painel de
 * admin não usa `supabase.auth` — autentica-se por token próprio nas funções RPC —
 * por isso as duas coisas coexistem sem conflito. `detectSessionInUrl` fica desligado
 * porque o site usa routing por hash (#/...), que colidiria com a deteção de tokens no URL.
 */
export const supabase = createClient(
  isSupabaseConfigured ? (url as string) : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? (anonKey as string) : 'public-anon-placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'autonomous-auth',
    },
  },
);

export type ProfileRole = 'client' | 'professional';

export type ProfileRow = {
  id: string;
  role: ProfileRole | null;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  work_area?: string | null;
  bio?: string | null;
  specialty?: string | null;
  province?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  approval_status?: 'approved' | 'pending' | 'rejected' | null;
  approval_note?: string | null;
  created_at?: string;
  updated_at?: string;
};
