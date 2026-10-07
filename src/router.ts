import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'services' }
  | { name: 'become-pro' }
  | { name: 'request' }
  | { name: 'about' }
  | { name: 'contact' }
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'account'; section: string }
  | { name: 'admin'; section: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const clean = hash.split('?')[0];
  if (clean === '/admin' || clean.startsWith('/admin/')) {
    return { name: 'admin', section: clean.slice('/admin/'.length) };
  }
  if (clean === '/conta' || clean.startsWith('/conta/')) {
    return { name: 'account', section: clean.slice('/conta/'.length) };
  }
  switch (clean) {
    case '/':
    case '':
      return { name: 'home' };
    case '/services':
      return { name: 'services' };
    case '/ser-profissional':
      return { name: 'become-pro' };
    case '/solicitar-servico':
      return { name: 'request' };
    case '/sobre':
      return { name: 'about' };
    case '/contato':
      return { name: 'contact' };
    case '/entrar':
      return { name: 'login' };
    case '/criar-conta':
      return { name: 'register' };
    default:
      return { name: 'home' };
  }
}

/** Lê um parâmetro do hash (ex.: #/entrar?next=/conta). */
export function hashParam(key: string): string | null {
  const q = window.location.hash.split('?')[1];
  return q ? new URLSearchParams(q).get(key) : null;
}

export function navigate(path: string) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function useNavigate() {
  return useCallback((path: string) => navigate(path), []);
}
