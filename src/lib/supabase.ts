import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * When the Supabase env vars are not set we still create a client against a
 * harmless placeholder URL so the app boots. Guard real calls with
 * `isSupabaseConfigured` before hitting the network.
 */
export const supabase = createClient(
  isSupabaseConfigured ? (url as string) : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? (anonKey as string) : 'public-anon-placeholder-key',
  { auth: { persistSession: false } }
);
