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
