export type ClientSignupInput = {
  name: string;
  phone: string;
  email?: string;
  city?: string;
};

export type ClientSignupResult = {
  /** Whether the row was actually written to a backend. */
  persisted: boolean;
  /** True when the contact was already on the waitlist. */
  duplicate: boolean;
};

/**
 * Adiciona um visitante à lista de early-access de clientes.
 *
 * NOTA: o Supabase foi desligado deste projeto — não há backend para
 * persistir a inscrição, por isso a submissão falha (mostra erro) em vez de
 * fingir sucesso. Para reativar, ligar novamente a uma API/base de dados aqui.
 */
export async function submitClientSignup(input: ClientSignupInput): Promise<ClientSignupResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.warn('[clientSignup] Supabase desligado — submissão indisponível:', input.name);
  throw new Error('Submissão indisponível: o backend foi desligado.');
}
