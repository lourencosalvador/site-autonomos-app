export type ProviderApplicationInput = {
  name: string;
  phone: string;
  email?: string;
  city: string;
  workArea: string; // Área de atuação
  specialty: string; // Especialidade
  experienceYears: number; // Anos de experiência
  description: string;
  photo: File; // Fotografia (obrigatória)
  idDocument: File; // Bilhete de Identidade (obrigatório)
};

/**
 * Envia uma candidatura de prestador.
 *
 * NOTA: o Supabase foi desligado deste projeto — não há backend para
 * registar a candidatura, por isso a submissão falha (mostra erro) em vez de
 * fingir sucesso. Para reativar, ligar novamente a uma API/base de dados aqui.
 */
export async function submitProviderApplication(input: ProviderApplicationInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  console.warn('[providerApplication] Supabase desligado — submissão indisponível:', input.name);
  throw new Error('Submissão indisponível: o backend foi desligado.');
}
