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
 * NOTA: o Supabase foi desligado deste projeto — a candidatura (e os
 * ficheiros foto/BI) não são persistidos em backend. O ecrã de sucesso é
 * sempre mostrado. Para reativar a persistência, ligar novamente a uma
 * API/base de dados aqui.
 */
export async function submitProviderApplication(input: ProviderApplicationInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  console.info('[providerApplication] Supabase desligado — candidatura não persistida:', input.name);
}
