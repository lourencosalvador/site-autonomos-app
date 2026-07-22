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
 * NOTA: o Supabase foi desligado deste projeto. Este pedido é agora
 * best-effort no cliente (não persiste em nenhum backend) — a experiência
 * de boas-vindas é sempre mostrada. Para reativar a persistência, ligar
 * novamente a uma API/base de dados aqui.
 */
export async function submitClientSignup(input: ClientSignupInput): Promise<ClientSignupResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.info('[clientSignup] Supabase desligado — signup não persistido:', input.name);
  return { persisted: false, duplicate: false };
}
