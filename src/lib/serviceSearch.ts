import type { Service } from '../data';

export const POPULAR_SERVICES = ['Eletricidade', 'Canalização', 'Ar condicionado', 'Limpeza', 'Energia solar', 'Pintura'];

export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function searchServices(services: Service[], query: string): Service[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return services;
  return services.filter((s) => {
    const haystack = normalize(`${s.title} ${s.description} ${s.keywords ?? ''}`);
    return terms.every((t) => haystack.includes(t));
  });
}
