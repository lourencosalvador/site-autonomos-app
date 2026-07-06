import { supabase, isSupabaseConfigured } from './supabase';

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

const BUCKET = 'request-attachments';

/** Faz upload de um anexo para o bucket público e devolve a URL pública. */
async function uploadAttachment(folder: string, file: File, index: number): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${folder}/${index}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Regista um pedido de serviço em `service_requests`. Faz upload dos anexos
 * (se existirem) e insere a linha. A anon key só tem INSERT — sem `.select()`.
 */
export async function submitServiceRequest(input: ServiceRequestInput): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
    );
  }

  // 1) Uploads (em paralelo) — opcional.
  let anexos: string[] = [];
  if (input.attachments.length > 0) {
    const folder = crypto.randomUUID();
    anexos = await Promise.all(
      input.attachments.map((file, i) => uploadAttachment(folder, file, i)),
    );
  }

  // 2) Insere o pedido.
  const { error } = await supabase.from('service_requests').insert({
    nome: input.name.trim(),
    telefone: input.phone.trim(),
    email: input.email?.trim() || null,
    endereco: input.address.trim(),
    categoria: input.category,
    servico: input.service.trim(),
    descricao: input.description.trim(),
    data_desejada: input.desiredDate || null,
    horario_preferencial: input.timePreference || null,
    anexos,
    status: 'novo',
  });
  if (error) throw error;
}
