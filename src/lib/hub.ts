import { supabase } from './supabase';
import { formatAoPhone } from './phone';

export type WithdrawalStatus = 'pending' | 'paid' | 'rejected' | 'cancelled';

export type Withdrawal = {
  id: string;
  provider_id: string;
  amount_minor: number;
  iban: string;
  iban_holder: string;
  status: WithdrawalStatus;
  reference: string | null;
  rejected_reason: string | null;
  created_at: string;
  processed_at: string | null;
};

/** Extrato: serviços (crédito do líquido) e saques (débito). */
export type Movement =
  | { id: string; type: 'service'; label: string; gross_minor: number; fee_minor: number; amount_minor: number;
      state: 'credited' | 'awaiting_payment'; at: string | null; client_name: string | null }
  | { id: string; type: 'withdrawal'; label: string; amount_minor: number; state: WithdrawalStatus; at: string | null;
      reference: string | null; rejected_reason: string | null; iban: string | null };

export type Wallet = {
  available_minor: number;
  credited_minor: number;
  pending_withdrawal_minor: number;
  withdrawn_minor: number;
  upcoming_minor: number;
  gross_minor: number;
  fees_minor: number;
  jobs_done: number;
  pending_withdrawal: Withdrawal | null;
  movements: Movement[];
};

/** Valor mínimo de um saque (100 Kz). */
export const MIN_WITHDRAWAL_MINOR = 10000;

export async function providerWallet(): Promise<Wallet> {
  const { data, error } = await supabase.rpc('provider_wallet');
  if (error) throw error;
  return data as Wallet;
}

export async function requestWithdrawal(amountMinor: number, iban: string, holder: string): Promise<Withdrawal> {
  const { data, error } = await supabase.rpc('request_broadcast_withdrawal', {
    p_amount_minor: amountMinor, p_iban: iban, p_iban_holder: holder,
  });
  if (error) throw error;
  return data as Withdrawal;
}

export async function cancelWithdrawal(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_broadcast_withdrawal', { p_id: id });
  if (error) throw error;
}

export function withdrawalErrorMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e ?? '');
  if (m.includes('INSUFFICIENT_BALANCE')) return 'O valor é superior ao seu saldo disponível.';
  if (m.includes('WITHDRAWAL_PENDING')) return 'Já tem um saque em processamento. Aguarde a transferência.';
  if (m.includes('INVALID_IBAN')) return 'IBAN inválido. Deve ter 21 dígitos (AO06 opcional).';
  if (m.includes('HOLDER_REQUIRED')) return 'Indique o titular da conta.';
  if (m.includes('INVALID_AMOUNT')) return 'O valor mínimo de saque é 100 Kz.';
  if (m.includes('NOT_APPROVED')) return 'A carteira fica ativa depois da aprovação do perfil.';
  if (m.includes('WITHDRAWAL_CLOSED')) return 'Este saque já foi processado.';
  return 'Tente novamente dentro de instantes.';
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
