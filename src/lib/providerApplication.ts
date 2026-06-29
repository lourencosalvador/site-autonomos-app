import { supabase, isSupabaseConfigured } from './supabase';

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

/** Upload de um ficheiro (foto / BI) para o bucket público "applications". */
async function uploadToApplications(file: File, kind: 'photo' | 'bi') {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}/${kind}.${ext}`;
  const { error } = await supabase.storage.from('applications').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return supabase.storage.from('applications').getPublicUrl(path).data.publicUrl;
}

/**
 * Envia uma candidatura de prestador: faz upload da foto + BI e insere a linha
 * em `provider_applications`. A anon key só tem permissão de INSERT, por isso
 * não se usa `.select()`.
 */
export async function submitProviderApplication(input: ProviderApplicationInput) {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
    );
  }

  // 1) Uploads (foto + BI) em paralelo
  const [photoUrl, idUrl] = await Promise.all([
    uploadToApplications(input.photo, 'photo'),
    uploadToApplications(input.idDocument, 'bi'),
  ]);

  // 2) Insere a candidatura (sem .select() — anon só tem INSERT)
  const { error } = await supabase.from('provider_applications').insert({
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    city: input.city,
    work_area: input.workArea,
    specialty: input.specialty,
    experience_years: Number.isFinite(input.experienceYears) ? input.experienceYears : null,
    description: input.description,
    photo_url: photoUrl,
    id_document_url: idUrl,
    status: 'pending',
  });
  if (error) throw error;
}
