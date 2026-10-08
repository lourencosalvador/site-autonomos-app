import { supabase } from './supabase';

export type BroadcastStatus = 'open' | 'accepted' | 'expired' | 'cancelled' | 'completed' | 'no_providers';

export type BroadcastPerson = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  phone: string | null;
  work_area?: string | null;
  specialty?: string | null;
};

export type Broadcast = {
  id: string;
  client_id: string;
  provider_id: string | null;
  category: string;
  description: string;
  service_date: string | null;
  service_time: string | null;
  city: string | null;
  address: string | null;
  status: BroadcastStatus;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
  seconds_left?: number;
  // FlexPay
  price_minor?: number;
  payment_status?: 'unpaid' | 'paid';
  held_minor?: number | null;
  provider_done_at?: string | null;
  escrow_released?: boolean;
  client?: BroadcastPerson | null;
  provider?: BroadcastPerson | null;
};

export type NewBroadcast = {
  category: string;
  description: string;
  serviceDate?: string | null;
  serviceTime?: string | null;
  city?: string | null;
  address?: string | null;
};

/** Segundos até expirar, calculado a partir de expires_at (não depende do relógio do servidor após o 1.º fetch). */
export function secondsLeft(b: Pick<Broadcast, 'expires_at'>): number {
  const ms = new Date(b.expires_at).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

export async function createBroadcast(input: NewBroadcast): Promise<Broadcast> {
  const { data, error } = await supabase.rpc('create_broadcast', {
    p_category: input.category,
    p_description: input.description,
    p_service_date: input.serviceDate ?? null,
    p_service_time: input.serviceTime ?? null,
    p_city: input.city ?? null,
    p_address: input.address ?? null,
  });
  if (error) throw error;
  return data as Broadcast;
}

/** Aceita um pedido. Devolve a linha se ficou com ele, ou `null` se já foi tomado/expirou. */
export async function acceptBroadcast(id: string): Promise<Broadcast | null> {
  const { data, error } = await supabase.rpc('accept_broadcast', { p_id: id });
  if (error) throw error;
  return (data as Broadcast | null) ?? null;
}

export async function getBroadcast(id: string): Promise<Broadcast | null> {
  const { data, error } = await supabase.rpc('get_broadcast', { p_id: id });
  if (error) throw error;
  return (data as Broadcast | null) ?? null;
}

export async function expireBroadcast(id: string): Promise<Broadcast | null> {
  const { data, error } = await supabase.rpc('expire_broadcast', { p_id: id });
  if (error) throw error;
  return (data as Broadcast | null) ?? null;
}

export async function cancelBroadcast(id: string): Promise<Broadcast | null> {
  const { data, error } = await supabase.rpc('cancel_broadcast', { p_id: id });
  if (error) throw error;
  return (data as Broadcast | null) ?? null;
}

export async function completeBroadcast(id: string): Promise<Broadcast | null> {
  const { data, error } = await supabase.rpc('complete_broadcast', { p_id: id });
  if (error) throw error;
  return (data as Broadcast | null) ?? null;
}

/** Passo 1 da conclusão: o prestador marca o serviço como concluído. */
export async function providerMarkDone(id: string): Promise<Broadcast | null> {
  const { data, error } = await supabase.rpc('provider_mark_done', { p_id: id });
  if (error) throw error;
  return (data as Broadcast | null) ?? null;
}

/** Pedidos abertos da área do prestador (com dados do cliente e seconds_left). */
export async function listOpenBroadcasts(): Promise<Broadcast[]> {
  const { data, error } = await supabase.rpc('list_open_broadcasts');
  if (error) throw error;
  return (data as Broadcast[] | null) ?? [];
}

/** Histórico de pedidos do próprio utilizador (cliente ou prestador). */
export async function myBroadcasts(): Promise<Broadcast[]> {
  const { data, error } = await supabase.rpc('my_broadcasts');
  if (error) throw error;
  return (data as Broadcast[] | null) ?? [];
}

/**
 * Observa mudanças na tabela de pedidos e chama `onChange` quando algo muda.
 * Nota: por causa do RLS, um prestador deixa de "ver" um pedido assim que ele sai
 * do estado aberto — por isso o painel do prestador combina isto com um refetch
 * periódico. O cliente, que vê sempre a sua linha, recebe o aceite em tempo real.
 */
export function subscribeBroadcasts(
  filter: { id?: string; category?: string },
  onChange: () => void,
): () => void {
  const parts = ['sb'];
  if (filter.id) parts.push(filter.id);
  if (filter.category) parts.push(filter.category);
  const channel = supabase
    .channel(parts.join(':') + ':' + Math.random().toString(36).slice(2, 8))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_broadcasts',
        ...(filter.id ? { filter: `id=eq.${filter.id}` } : {}),
        ...(filter.category && !filter.id ? { filter: `category=eq.${filter.category}` } : {}),
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
