import { useEffect, useState } from 'react';

/** Devolve `value` só depois de `ms` sem alterações (para pesquisas no servidor). */
export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
