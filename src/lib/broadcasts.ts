import { supabase } from './supabase';

export type BroadcastStatus = 'open' | 'accepted' | 'expired' | 'cancelled' | 'completed' | 'no_providers';

export type BroadcastPerson = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  phone: string | null;
  work_area?: string | null;
  work_areas?: string[] | null;
  specialty?: string | null;
  company_name?: string | null;
};

export type QuoteStatus = 'pending' | 'onsite' | 'sent' | 'accepted' | 'rejected';
export type VisitStatus = 'requested' | 'scheduled' | 'done';
export type PaymentStatus = 'unpaid' | 'submitted' | 'paid' | 'rejected';

export type QuoteItemKey = 'mao_de_obra' | 'deslocacao' | 'materiais' | 'equipamentos' | 'outros';
export type QuoteItem = { key: QuoteItemKey; label: string; amount_minor: number | null };

export const QUOTE_ITEMS: { key: QuoteItemKey; label: string; hint: string }[] = [
  { key: 'mao_de_obra', label: 'Mão de obra', hint: 'O trabalho do profissional' },
  { key: 'deslocacao', label: 'Deslocação', hint: 'Ida e volta ao local' },
  { key: 'materiais', label: 'Materiais', hint: 'Peças e consumíveis' },
  { key: 'equipamentos', label: 'Equipamentos', hint: 'Aluguer ou uso de máquinas' },
  { key: 'outros', label: 'Outras despesas', hint: 'Licenças, transporte de entulho, …' },
];

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
  province?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  status: BroadcastStatus;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
  seconds_left?: number;

  price_minor?: number;
  payment_status?: PaymentStatus;
  held_minor?: number | null;
  provider_done_at?: string | null;
  client_confirmed_at?: string | null;
  escrow_released?: boolean;
  quote_status?: QuoteStatus;
  quote_minor?: number | null;
  quote_note?: string | null;
  quote_items?: QuoteItem[];
  quote_sent_at?: string | null;
  client_fee_minor?: number | null;
  provider_fee_minor?: number | null;
  provider_net_minor?: number | null;
  visit_status?: VisitStatus | null;
  visit_slots?: string[];
  visit_at?: string | null;
  visit_note?: string | null;
  proof_url?: string | null;
  proof_reference?: string | null;
  proof_submitted_at?: string | null;
  payment_rejected_reason?: string | null;
  payout_status?: 'pending' | 'paid';
  payout_at?: string | null;
  client_rated?: boolean;
  provider_rated?: boolean;
  unread?: number;
  client?: BroadcastPerson | null;
  provider?: BroadcastPerson | null;
};

export type NewBroadcast = {
  category: string;
  description: string;
  serviceDate?: string | null;
  serviceTime?: string | null;
  address?: string | null;
  province?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
};

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export function createBroadcast(input: NewBroadcast): Promise<Broadcast> {
  return call('create_broadcast', {
    p_category: input.category,
    p_description: input.description,
    p_service_date: input.serviceDate ?? null,
    p_service_time: input.serviceTime ?? null,
    p_city: input.municipality ?? null,
    p_address: input.address ?? null,
    p_province: input.province ?? null,
    p_municipality: input.municipality ?? null,
    p_neighborhood: input.neighborhood ?? null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
  });
}

export async function acceptBroadcast(id: string): Promise<Broadcast | null> {
  return (await call<Broadcast | null>('accept_broadcast', { p_id: id })) ?? null;
}

export async function getBroadcast(id: string): Promise<Broadcast | null> {
  return (await call<Broadcast | null>('get_broadcast', { p_id: id })) ?? null;
}

export async function cancelBroadcast(id: string): Promise<Broadcast | null> {
  const row = await call<Broadcast | null>('cancel_broadcast', { p_id: id });
  if (!row?.id) throw new Error('CANCEL_CLOSED');
  return row;
}

export const providerMarkDone = (id: string) => call<Broadcast>('provider_mark_done', { p_id: id });
export const confirmService = (id: string) => call<Broadcast>('client_confirm_service', { p_id: id });

export const requestVisit = (id: string, slots: string[], note?: string) =>
  call<Broadcast>('provider_request_visit', { p_id: id, p_slots: slots, p_note: note ?? null });
export const cancelVisit = (id: string) => call<Broadcast>('provider_cancel_visit', { p_id: id });
export const scheduleVisit = (id: string, slot: string) => call<Broadcast>('client_schedule_visit', { p_id: id, p_slot: slot });
export const requestOtherDates = (id: string, note?: string) => call<Broadcast>('client_request_other_dates', { p_id: id, p_note: note ?? null });
export const markVisitDone = (id: string) => call<Broadcast>('provider_mark_visit_done', { p_id: id });

export const sendQuote = (id: string, amountMinor: number, note: string, items: QuoteItem[]) =>
  call<Broadcast>('provider_send_quote', { p_id: id, p_amount_minor: amountMinor, p_note: note || null, p_items: items });
export const respondQuote = (id: string, accept: boolean) => call<Broadcast>('client_respond_quote', { p_id: id, p_accept: accept });

export const submitPayment = (id: string, proofUrl: string, reference?: string) =>
  call<Broadcast>('client_submit_payment', { p_id: id, p_proof_url: proofUrl, p_reference: reference ?? null });

export async function uploadPaymentProof(file: File): Promise<string> {
  const okType = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type);
  if (!okType) throw new Error('Formato inválido. Use PDF, JPG, PNG ou WebP.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Ficheiro demasiado grande (máx. 10 MB).');
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Sessão expirada.');
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Não foi possível carregar o comprovativo.');
  return supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;
}

export async function listOpenBroadcasts(): Promise<Broadcast[]> {
  return (await call<Broadcast[] | null>('list_open_broadcasts', {})) ?? [];
}

export async function myBroadcasts(): Promise<Broadcast[]> {
  return (await call<Broadcast[] | null>('my_broadcasts', {})) ?? [];
}

export function locationLine(b: Pick<Broadcast, 'neighborhood' | 'municipality' | 'province' | 'city'>): string {
  const parts = [b.neighborhood, b.municipality || b.city, b.province].filter(Boolean) as string[];
  return [...new Set(parts)].join(', ');
}

export function mapsUrl(b: Pick<Broadcast, 'lat' | 'lng'>): string | null {
  return b.lat != null && b.lng != null ? `https://www.google.com/maps?q=${b.lat},${b.lng}` : null;
}

export function subscribeBroadcasts(filter: { id?: string }, onChange: () => void): () => void {
  const channel = supabase
    .channel(['sb', filter.id ?? 'all', Math.random().toString(36).slice(2, 8)].join(':'))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_broadcasts',
        ...(filter.id ? { filter: `id=eq.${filter.id}` } : {}),
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
