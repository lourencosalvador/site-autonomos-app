import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Images, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { TextInput } from '../../components/Field';
import { navigate } from '../../router';
import { type CatalogItem, myCatalog, addCatalogItem, deleteCatalogItem, uploadCatalogImage } from '../../lib/catalog';
import { Btn, Card, EmptyState, PageHeader, Spinner } from '../../components/app/ui';

export function CatalogPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try { setItems(await myCatalog()); } catch { setItems([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!user) return null;
  if (user.role !== 'professional') { navigate('/conta'); return null; }

  const onFile = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const url = await uploadCatalogImage(file);
      await addCatalogItem(url, caption);
      setCaption('');
      success('Foto adicionada ao catálogo');
      await load();
    } catch (e) {
      toastError('Não foi possível adicionar', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (id: string) => {
    try { await deleteCatalogItem(id); await load(); } catch {}
  };

  return (
    <>
      <PageHeader title="Catálogo" description="Mostre os seus trabalhos. Boas fotos ajudam os clientes a confiar em si." />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="caption" className="mb-1.5 block text-[15px] font-medium text-ink-900">Legenda <span className="font-normal text-ink-400">(opcional)</span></label>
            <TextInput id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex.: Instalação de canalização nova" disabled={busy} />
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Btn onClick={() => fileRef.current?.click()} loading={busy}>
            {busy ? 'A carregar…' : <><ImagePlus size={18} /> Adicionar foto</>}
          </Btn>
        </div>
        <p className="mt-3 text-sm text-ink-400">JPG, PNG ou WebP, até 5 MB.</p>
      </Card>

      {items === null ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : items.length === 0 ? (
        <Card className="mt-6"><EmptyState icon={Images} title="O catálogo está vazio" description="Adicione fotos dos seus melhores trabalhos." /></Card>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((it) => (
            <figure key={it.id} className="group relative overflow-hidden rounded-2xl border border-line bg-white">
              <div className="aspect-square overflow-hidden bg-cloud-100">
                <img src={it.image_url} alt={it.caption ?? ''} className="h-full w-full object-cover" loading="lazy" />
              </div>
              {it.caption && <figcaption className="truncate px-3 py-2.5 text-[15px] text-ink-700">{it.caption}</figcaption>}
              <button
                onClick={() => remove(it.id)}
                aria-label="Remover foto"
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow-sm transition-opacity hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
