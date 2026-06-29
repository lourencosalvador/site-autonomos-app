import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'services' }
  | { name: 'become-pro' }
  | { name: 'request' }
  | { name: 'about' }
  | { name: 'contact' };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const clean = hash.split('?')[0];
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
    default:
      return { name: 'home' };
  }
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
