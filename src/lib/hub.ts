import { supabase } from './supabase';

export type Movement = {
  id: string;
  category: string;
  amount_minor: number;
  kind: 'available' | 'pending' | 'other';
  at: string;
  client_name: string | null;
};

export type Wallet = {
  available_minor: number;
  pending_minor: number;
  jobs_done: number;
  movements: Movement[];
};

export async function providerWallet(): Promise<Wallet> {
  const { data, error } = await supabase.rpc('provider_wallet');
  if (error) throw error;
  return data as Wallet;
}

export async function updateMyProfile(input: {
  name: string; phone?: string | null; workArea?: string | null;
  specialty?: string | null; bio?: string | null; province?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('update_my_profile', {
    p_name: input.name,
    p_phone: input.phone ?? null,
    p_work_area: input.workArea ?? null,
    p_specialty: input.specialty ?? null,
    p_bio: input.bio ?? null,
    p_province: input.province ?? null,
  });
  if (error) throw error;
}

export async function rateProvider(broadcastId: string, rating: number, comment?: string): Promise<void> {
  const { error } = await supabase.rpc('rate_provider', { p_broadcast: broadcastId, p_rating: rating, p_comment: comment ?? null });
  if (error) throw error;
}

export type ProviderReviews = {
  average: number;
  count: number;
  items: { rating: number; comment: string | null; created_at: string; client_name: string | null }[];
};

export async function providerReviews(): Promise<ProviderReviews> {
  const { data, error } = await supabase.rpc('provider_reviews');
  if (error) throw error;
  return data as ProviderReviews;
}
