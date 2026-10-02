import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { clearSession, readSession, saveSession, type AdminSession } from './session';

/* ------------------------------------------------------------------ */
/* Sessão                                                              */
/* ------------------------------------------------------------------ */

let session: AdminSession | null = readSession();
const expiredListeners = new Set<() => void>();

export const getSession = () => session;

export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

function expire() {
  session = null;
  clearSession();
  expiredListeners.forEach((l) => l());
}

/* ------------------------------------------------------------------ */
/* Erros                                                               */
/* ------------------------------------------------------------------ */

const MESSAGES: Record<string, string> = {
  not_found: 'O registo já não existe.',
  invalid_status: 'Estado inválido.',
  invalid_role: 'Tipo de conta inválido.',
  invalid_name: 'Indique um nome com pelo menos 2 caracteres.',
  invalid_title: 'Indique um título com pelo menos 2 caracteres.',
  cannot_disable_self: 'Não pode desativar a sua própria conta.',
};

export class AdminError extends Error {}

function toMessage(raw: string) {
  if (raw.includes('Could not find the function') || raw.includes('does not exist')) {
    return 'O painel ainda não está configurado no Supabase. Corra a migração admin_dashboard no SQL Editor.';
  }
  const code = Object.keys(MESSAGES).find((k) => raw.includes(k));
  if (code) return MESSAGES[code];
  if (raw.includes('Failed to fetch') || raw.includes('NetworkError')) {
    return 'Sem ligação ao servidor. Verifique a internet e tente novamente.';
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

/* ------------------------------------------------------------------ */
/* Chamadas                                                            */
/* ------------------------------------------------------------------ */

export type LoginResult =
  | { ok: true; session: AdminSession }
  | { ok: false; error: 'invalid_key'; attemptsLeft: number }
  | { ok: false; error: 'locked'; retryAfter: number }
  | { ok: false; error: 'unavailable'; message: string };

export async function login(key: string): Promise<LoginResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'unavailable', message: 'O Supabase não está configurado neste ambiente.' };
  }
  const { data, error } = await supabase.rpc('admin_login', { p_key: key });
  if (error) return { ok: false, error: 'unavailable', message: toMessage(error.message) };

  const r = data as {
    ok: boolean; error?: string; token?: string; expires_at?: string;
    admin?: { id: string; name: string }; attempts_left?: number; retry_after?: number;
  };
  if (r.ok && r.token && r.expires_at && r.admin) {
    session = { token: r.token, expiresAt: r.expires_at, admin: r.admin };
    saveSession(session);
    return { ok: true, session };
  }
  if (r.error === 'locked') return { ok: false, error: 'locked', retryAfter: r.retry_after ?? 900 };
  return { ok: false, error: 'invalid_key', attemptsLeft: r.attempts_left ?? 0 };
}

export async function logout() {
  const token = session?.token;
  expire();
  if (token) await supabase.rpc('admin_logout', { p_token: token });
}

/** Chama uma função `admin_*` com o token da sessão. */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!session) {
    expire();
    throw new AdminError('Sessão terminada.');
  }
  const { data, error } = await supabase.rpc(fn, { p_token: session.token, ...args });
  if (error) {
    if (error.message.includes('invalid_session')) {
      expire();
      throw new AdminError('A sessão expirou. Entre novamente.');
    }
    throw new AdminError(toMessage(error.message));
  }
  return data as T;
}

/** Carrega imagem para o bucket `site-media` usando um ticket temporário. */
export async function uploadServiceImage(file: Blob, baseName: string): Promise<string> {
  const ticket = await rpc<string>('admin_upload_ticket');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${ticket}/${Date.now()}-${baseName || 'servico'}.${ext}`;
  const { error } = await supabase.storage.from('site-media').upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new AdminError('Não foi possível carregar a imagem. Tente outra (JPG, PNG ou WebP, até 5 MB).');
  return supabase.storage.from('site-media').getPublicUrl(path).data.publicUrl;
}

/* ------------------------------------------------------------------ */
/* Hook de dados                                                       */
/* ------------------------------------------------------------------ */

type QueryState<T> = { data: T | null; error: string | null; loading: boolean; updatedAt: Date | null };

/**
 * Executa `fn` quando as dependências mudam (e a cada `refreshMs`, se indicado).
 * Mantém os dados anteriores enquanto recarrega, para a interface não "piscar".
 */
export function useAdminQuery<T>(fn: () => Promise<T>, deps: unknown[], refreshMs?: number) {
  const [state, setState] = useState<QueryState<T>>({ data: null, error: null, loading: true, updatedAt: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ data, error: null, loading: false, updatedAt: new Date() });
    } catch (e) {
      if (id === seq.current) {
        setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Erro inesperado.' }));
      }
    }
  }, []);

  useEffect(() => {
    void reload();
    if (!refreshMs) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reload();
    }, refreshMs);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload };
}
