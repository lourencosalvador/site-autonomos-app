import { supabase } from './supabase';
import { formatAoPhone } from './phone';

export type MovementState = 'transferred' | 'due' | 'awaiting_payment';

export type Movement = {
  id: string;
  category: string;
  gross_minor: number;
  fee_minor: number;
  amount_minor: number;
  state: MovementState;
  kind: 'available' | 'pending';
  at: string;
  payout_at: string | null;
  payout_reference: string | null;
  client_name: string | null;
};

export type Wallet = {
  transferred_minor: number;
  due_minor: number;
  upcoming_minor: number;
  gross_minor: number;
  fees_minor: number;
  jobs_done: number;
  available_minor: number;
  pending_minor: number;
  movements: Movement[];
};

export async function providerWallet(): Promise<Wallet> {
  const { data, error } = await supabase.rpc('provider_wallet');
  if (error) throw error;
  return data as Wallet;
}

export type ProfileInput = {
  name: string;
  phone?: string | null;
  workAreas?: string[] | null;
  specialty?: string | null;
  bio?: string | null;
  province?: string | null;
  companyId?: string | null;
  iban?: string | null;
  ibanHolder?: string | null;
  experienceYears?: number | null;
};

export function profileErrorMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e ?? '');
  if (m.includes('INVALID_PHONE')) return 'Número inválido. Use 9 dígitos, a começar por 9.';
  if (m.includes('PHONE_REQUIRED')) return 'O telefone é obrigatório para profissionais.';
  if (m.includes('AREAS_REQUIRED')) return 'Escolha pelo menos uma área de atuação.';
  if (m.includes('TOO_MANY_AREAS')) return 'Pode escolher no máximo 3 áreas.';
  if (m.includes('INVALID_COMPANY')) return 'Escolha uma empresa parceira da lista.';
  if (m.includes('INVALID_IBAN')) return 'IBAN inválido. Deve ter 21 dígitos (AO06 opcional).';
  if (m.includes('INVALID_EXPERIENCE')) return 'Anos de experiência inválidos.';
  if (m.includes('ALREADY_PROFESSIONAL')) return 'A sua conta já tem perfil profissional.';
  if (m.includes('INVALID_NAME')) return 'Indique o seu nome.';
  return 'Tente novamente dentro de instantes.';
}

export async function updateMyProfile(input: ProfileInput): Promise<void> {
  const { error } = await supabase.rpc('update_my_profile', {
    p_name: input.name,
    p_phone: input.phone ? formatAoPhone(input.phone) ?? input.phone : null,
    p_work_areas: input.workAreas ?? null,
    p_specialty: input.specialty ?? null,
    p_bio: input.bio ?? null,
    p_province: input.province ?? null,
    p_company_id: input.companyId ?? null,
    p_iban: input.iban ?? null,
    p_iban_holder: input.ibanHolder ?? null,
    p_experience_years: input.experienceYears ?? null,
  });
  if (error) throw error;
}

export async function activateProfessional(input: {
  workAreas: string[]; phone: string; specialty?: string | null; experienceYears?: number | null;
  bio?: string | null; companyId?: string | null; province?: string | null; idDocumentUrl?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('activate_professional', {
    p_work_areas: input.workAreas,
    p_phone: input.phone,
    p_specialty: input.specialty ?? null,
    p_experience_years: input.experienceYears ?? null,
    p_bio: input.bio ?? null,
    p_company_id: input.companyId ?? null,
    p_province: input.province ?? null,
    p_id_document_url: input.idDocumentUrl ?? null,
  });
  if (error) throw error;
}

export async function rateProvider(broadcastId: string, rating: number, comment?: string): Promise<void> {
  const { error } = await supabase.rpc('rate_provider', { p_broadcast: broadcastId, p_rating: rating, p_comment: comment ?? null });
  if (error) throw error;
}

export async function rateClient(broadcastId: string, rating: number, comment?: string): Promise<void> {
  const { error } = await supabase.rpc('rate_client', { p_broadcast: broadcastId, p_rating: rating, p_comment: comment ?? null });
  if (error) throw error;
}

export type ProviderReviews = {
  average: number;
  count: number;
  items: { rating: number; comment: string | null; created_at: string; client_name: string | null; client_avatar_url?: string | null }[];
};

export async function providerReviews(): Promise<ProviderReviews> {
  const { data, error } = await supabase.rpc('provider_reviews');
  if (error) throw error;
  return data as ProviderReviews;
}
