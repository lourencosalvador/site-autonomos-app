import { supabase } from './supabase';
import { uploadSiteImage, type CatalogItem } from './catalog';

export type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string | null;
  client_avatar_url?: string | null;
};

export type PublicProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  specialty: string | null;
  bio: string | null;
  province: string | null;
  company_name: string | null;
  work_areas: string[] | null;
  created_at: string | null;
  jobs_done: number;
  rating: { average: number; count: number };
  reviews: Review[];
  portfolio: CatalogItem[];
};

export async function providerPublicProfile(id: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc('provider_public_profile', { p_id: id });
  if (error) throw error;
  return (data as PublicProfile | null) ?? null;
}

export async function changeAvatar(file: File): Promise<string> {
  const url = await uploadSiteImage('avatars', file);
  const { error } = await supabase.rpc('set_my_avatar', { p_url: url });
  if (error) throw error;
  return url;
}

export async function uploadIdDocument(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) throw new Error('BI: use PDF, JPG ou PNG.');
  if (file.size > 8 * 1024 * 1024) throw new Error('BI: ficheiro demasiado grande (máx. 8 MB).');
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${crypto.randomUUID()}/bi.${ext}`;
  const { error } = await supabase.storage.from('applications').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Não foi possível carregar o BI.');
  return supabase.storage.from('applications').getPublicUrl(path).data.publicUrl;
}

export async function saveIdDocument(url: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  await supabase.from('profiles').update({ id_document_url: url }).eq('id', session.user.id);
}

export async function changePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('different from the old')) throw new Error('A nova palavra-passe tem de ser diferente da atual.');
    if (m.includes('at least')) throw new Error('A palavra-passe deve ter pelo menos 6 caracteres.');
    if (m.includes('reauthentication') || m.includes('recent')) throw new Error('Por segurança, termine sessão e volte a entrar antes de mudar a palavra-passe.');
    throw new Error('Não foi possível mudar a palavra-passe.');
  }
}
