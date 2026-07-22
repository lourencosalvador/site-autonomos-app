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
 * NOTA: o Supabase foi desligado deste projeto — o pedido não é persistido
 * em backend. O ecrã de sucesso é sempre mostrado. Para reativar a
 * persistência, ligar novamente a uma API/base de dados aqui.
 */
export async function submitServiceRequest(input: ServiceRequestInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  console.info('[serviceRequest] Supabase desligado — pedido não persistido:', input.category);
}
