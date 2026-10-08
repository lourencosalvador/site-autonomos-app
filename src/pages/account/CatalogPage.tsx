import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Wrench } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { TextInput } from '../../components/Field';
import { Button } from '../../components/Button';
import { navigate } from '../../router';
import { type CatalogItem, myCatalog, addCatalogItem, deleteCatalogItem, uploadCatalogImage } from '../../lib/catalog';

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
      success('Trabalho adicionado ao catálogo');
      await load();
    } catch (e) {
      toastError('Não foi possível adicionar', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (id: string) => {
    try { await deleteCatalogItem(id); await load(); } catch { /* ignore */ }
  };

  return (
    <section className="bg-cloud-50 pb-28 pt-28 lg:pt-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">O meu catálogo</h1>
        <p className="mt-1 text-ink-500">Mostre os seus trabalhos. Boas fotos ajudam a ganhar mais clientes.</p>

        {/* Adicionar */}
        <div className="mt-5 rounded-3xl border border-cloud-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-semibold text-brand-dark">Legenda (opcional)</label>
              <TextInput value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex.: Instalação de canalização nova" disabled={busy} />
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button onClick={() => fileRef.current?.click()} size="md" disabled={busy} className="shrink-0">
              {busy ? <><Loader2 size={16} className="animate-spin" /> A carregar…</> : <><ImagePlus size={16} /> Adicionar foto</>}
            </Button>
          </div>
        </div>

        {/* Grelha */}
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-ink-300" /></div>
        ) : items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-cloud-200 bg-white/60 px-5 py-12 text-center">
            <Wrench className="mb-2 size-8 text-ink-300" />
            <p className="font-semibold text-ink-700">O seu catálogo está vazio</p>
            <p className="mt-1 text-sm text-ink-500">Adicione fotos dos seus melhores trabalhos.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((it) => (
              <div key={it.id} className="group relative overflow-hidden rounded-2xl border border-cloud-200 bg-white shadow-soft">
                <div className="aspect-square overflow-hidden bg-cloud-100">
                  <img src={it.image_url} alt={it.caption ?? ''} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                </div>
                {it.caption && <p className="truncate px-3 py-2 text-sm text-ink-700">{it.caption}</p>}
                <button
                  onClick={() => remove(it.id)}
                  aria-label="Remover"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 opacity-0 shadow-soft backdrop-blur transition-opacity hover:bg-white group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
