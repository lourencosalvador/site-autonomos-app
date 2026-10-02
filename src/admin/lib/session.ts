export type AdminSession = {
  token: string;
  expiresAt: string;
  admin: { id: string; name: string };
};

const KEY = 'autonomous:admin-session';

export function readSession(): AdminSession | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    if (!session.token || new Date(session.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // sem storage: a sessão dura só enquanto a página estiver aberta
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignorar
  }
}
