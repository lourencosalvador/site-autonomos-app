import { supabase, isSupabaseConfigured } from './supabase';

export type ClientSignupInput = {
  name: string;
  phone: string;
  email?: string;
  city?: string;
};

export type ClientSignupResult = {
  /** Whether the row was actually written to Supabase. */
  persisted: boolean;
  /** True when the contact was already on the waitlist (unique email). */
  duplicate: boolean;
};

/**
 * Adds a visitor to the early-access client waitlist (`client_signups`).
 *
 * This is a pre-launch marketing waitlist: the user experience (the welcome
 * message) must never be blocked by infrastructure. So we persist on a
 * best-effort basis — if Supabase is not configured or the insert fails we log
 * the problem and still resolve successfully, reporting `persisted: false` so
 * the caller can decide what to surface. A duplicate email is treated as a
 * success (they are already part of the network).
 */
export async function submitClientSignup(input: ClientSignupInput): Promise<ClientSignupResult> {
  if (!isSupabaseConfigured) {
    console.warn('[clientSignup] Supabase não configurado — signup não foi persistido.');
    return { persisted: false, duplicate: false };
  }

  const { error } = await supabase.from('client_signups').insert({
    nome: input.name.trim(),
    telefone: input.phone.trim(),
    email: input.email?.trim() || null,
    cidade: input.city?.trim() || null,
    origem: 'landing',
    status: 'novo',
  });

  if (error) {
    // 23505 = unique_violation → email already registered. Still a "win".
    if (error.code === '23505') {
      return { persisted: true, duplicate: true };
    }
    console.warn('[clientSignup] falha ao persistir signup:', error.message);
    return { persisted: false, duplicate: false };
  }

  return { persisted: true, duplicate: false };
}
