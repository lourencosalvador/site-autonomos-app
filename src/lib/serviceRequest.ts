export type ServiceRequestInput = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  category: string; // categoria (já selecionada)
  service: string; // serviço específico pretendido
  description: string; // descrição detalhada
  desiredDate?: string; // 'YYYY-MM-DD'
  timePreference?: string; // horário preferencial (label)
  attachments: File[]; // imagens/documentos (opcional)
};

/**
 * Regista um pedido de serviço.
 *
 * NOTA: o Supabase foi desligado deste projeto — não há backend para
 * registar o pedido, por isso a submissão falha (mostra erro) em vez de
 * fingir sucesso. Para reativar, ligar novamente a uma API/base de dados aqui.
 */
export async function submitServiceRequest(input: ServiceRequestInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  console.warn('[serviceRequest] Supabase desligado — submissão indisponível:', input.category);
  throw new Error('Submissão indisponível: o backend foi desligado.');
}
