import { supabase } from './supabase';

export type CatalogItem = {
  id: string;
  image_url: string;
  caption: string | null;
  highlight_title: string | null;
  post_type: string;
  created_at: string;
};

export async function myCatalog(): Promise<CatalogItem[]> {
  const { data, error } = await supabase.rpc('my_catalog');
  if (error) throw error;
  return (data as CatalogItem[] | null) ?? [];
}

export async function addCatalogItem(imageUrl: string, caption?: string): Promise<CatalogItem> {
  const { data, error } = await supabase.rpc('add_catalog_item', { p_image_url: imageUrl, p_caption: caption ?? null });
  if (error) throw error;
  return data as CatalogItem;
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_catalog_item', { p_id: id });
  if (error) throw error;
}

/** Carrega uma imagem para o catálogo (bucket público site-media, pasta do próprio prestador). */
export async function uploadCatalogImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Formato inválido (use JPG, PNG ou WebP).');
  if (file.size > 5 * 1024 * 1024) throw new Error('Imagem demasiado grande (máx. 5 MB).');
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Sessão expirada.');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `catalog/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('site-media').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (error) throw new Error('Não foi possível carregar a imagem.');
  return supabase.storage.from('site-media').getPublicUrl(path).data.publicUrl;
}
