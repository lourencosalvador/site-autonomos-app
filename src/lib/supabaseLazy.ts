/**
 * Acesso ao cliente Supabase sem o incluir no carregamento inicial do site:
 * o módulo só é descarregado na primeira vez que é preciso (analytics, catálogo, formulários).
 */
export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export const getSupabase = () => import('./supabase').then((m) => m.supabase);
