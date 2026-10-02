import { useEffect, useState } from 'react';
import { SERVICES, type Service } from '../data';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseLazy';

/**
 * Catálogo de serviços gerido no painel de admin (`site_services`).
 * Mostra logo a última versão guardada no browser (ou a lista fixa de `data.ts`)
 * e atualiza assim que o Supabase responde. Se o Supabase falhar, fica a lista local.
 */

const CACHE_KEY = 'autonomous:services:v1';

type ServiceRow = {
  id: string;
  title: string;
  description: string;
  price: string | null;
  image_url: string;
  keywords: string;
};

function fromRow(row: ServiceRow): Service {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price ?? undefined,
    image: row.image_url,
    category: row.title,
    keywords: row.keywords,
  };
}

function readCache(): Service[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const list = raw ? (JSON.parse(raw) as Service[]) : null;
    return Array.isArray(list) && list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

let current: Service[] = readCache() ?? SERVICES;
let loading: Promise<void> | null = null;
const listeners = new Set<(list: Service[]) => void>();

function load() {
  if (loading || !isSupabaseConfigured) return;
  loading = (async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('site_services')
      .select('id, title, description, price, image_url, keywords')
      .order('sort_order', { ascending: true });
    if (error || !data || data.length === 0) return;
    current = (data as ServiceRow[]).map(fromRow);
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(current));
    } catch {
      // sem storage: fica só em memória
    }
    listeners.forEach((notify) => notify(current));
  })().catch(() => undefined);
}

export function useServices(): Service[] {
  const [services, setServices] = useState<Service[]>(current);

  useEffect(() => {
    listeners.add(setServices);
    setServices(current);
    load();
    return () => {
      listeners.delete(setServices);
    };
  }, []);

  return services;
}

/** Nomes das categorias, pela ordem do catálogo. */
export function useCategories(): string[] {
  return useServices().map((s) => s.category);
}
