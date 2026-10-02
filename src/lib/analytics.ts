import { getSupabase, isSupabaseConfigured } from './supabaseLazy';

/**
 * Registo anónimo de visitas e ações do site em `site_events` (lido só pelo painel de admin).
 * Não guarda dados pessoais: o visitante é um id aleatório guardado no browser.
 * Em desenvolvimento não regista nada (a base de dados é a de produção), a não ser que
 * VITE_ANALYTICS_DEV=1.
 */

export type SiteEventType =
  | 'page_view'
  | 'search'
  | 'service_click'
  | 'request_submitted'
  | 'application_submitted'
  | 'contact_click';

const VISITOR_KEY = 'autonomous:visitor';
const SESSION_KEY = 'autonomous:session';
const REFERRER_SENT_KEY = 'autonomous:referrer-sent';

const enabled =
  isSupabaseConfigured && (!import.meta.env.DEV || import.meta.env.VITE_ANALYTICS_DEV === '1');

const memory: Record<string, string> = {};

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function stored(storage: 'local' | 'session', key: string) {
  try {
    const s = storage === 'local' ? window.localStorage : window.sessionStorage;
    let value = s.getItem(key);
    if (!value) {
      value = randomId();
      s.setItem(key, value);
    }
    return value;
  } catch {
    // Modo privado / storage bloqueado: id válido só nesta página.
    memory[key] ??= randomId();
    return memory[key];
  }
}

function device(): 'mobile' | 'tablet' | 'desktop' {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/** Só envia a origem externa no primeiro evento da sessão. */
function externalReferrer(): string | null {
  try {
    if (window.sessionStorage.getItem(REFERRER_SENT_KEY)) return null;
    window.sessionStorage.setItem(REFERRER_SENT_KEY, '1');
  } catch {
    return null;
  }
  const ref = document.referrer;
  if (!ref) return null;
  try {
    if (new URL(ref).host === window.location.host) return null;
  } catch {
    return null;
  }
  return ref.slice(0, 300);
}

function currentPath() {
  const path = window.location.hash.replace(/^#/, '').split('?')[0] || '/';
  return path.slice(0, 200);
}

export function track(type: SiteEventType, label?: string) {
  if (!enabled) return;
  const path = currentPath();
  if (path.startsWith('/admin')) return;

  const row = {
    type,
    path,
    label: label ? label.slice(0, 200) : null,
    visitor_id: stored('local', VISITOR_KEY),
    session_id: stored('session', SESSION_KEY),
    referrer: externalReferrer(),
    device: device(),
  };
  getSupabase()
    .then((supabase) => supabase.from('site_events').insert(row))
    .then(() => undefined, () => undefined);
}
