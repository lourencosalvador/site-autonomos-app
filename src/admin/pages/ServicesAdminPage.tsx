import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, MoreHorizontal, Pencil, Plus, Trash2, Wrench, EyeOff, Eye } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { SearchInput } from '../components/SearchInput';
import { ConfirmDialog } from '../components/blocks';
import { Badge, Card, Skeleton } from '../ui/card';
import { Button } from '../ui/button';
import { FieldHint, Input, Label, Textarea } from '../ui/input';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { EmptyState, ErrorBanner, Switch, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, uploadServiceImage, useAdminQuery } from '../lib/api';
import { useAction } from '../lib/useAction';
import type { SiteService } from '../lib/types';
import { cn, formatDate } from '../lib/utils';

type Draft = { id?: string; title: string; description: string; price: string; keywords: string; image_url: string; active: boolean };
const EMPTY: Draft = { title: '', description: '', price: '', keywords: '', image_url: '', active: true };

export function ServicesAdminPage() {
  const run = useAction();
  const q = useAdminQuery(() => rpc<SiteService[]>('admin_list_services'), []);
  const [list, setList] = useState<SiteService[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<SiteService | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) setList(q.data);
  }, [q.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((s) => `${s.title} ${s.description} ${s.keywords}`.toLowerCase().includes(term));
  }, [list, search]);

  const visible = list.filter((s) => s.active).length;

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    try {
      await run(() => rpc('admin_reorder_services', { p_ids: next.map((s) => s.id) }));
    } catch {
      setList(list);
    }
  };

  const toggle = async (s: SiteService) => {
    setBusy(s.id);
    setList((l) => l.map((x) => (x.id === s.id ? { ...x, active: !s.active } : x)));
    try {
      await run(
        () => rpc('admin_save_service', { p_service: { ...s, active: !s.active } }),
        s.active ? `“${s.title}” deixou de aparecer no site.` : `“${s.title}” já aparece no site.`,
      );
    } catch {
      setList((l) => l.map((x) => (x.id === s.id ? { ...x, active: s.active } : x)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Serviços"
        description={`Catálogo mostrado no site. ${visible} de ${list.length} visíveis.`}
        actions={<Button onClick={() => setEditing({ ...EMPTY })}><Plus /> Novo serviço</Button>}
      />

      <div className="mb-4 flex justify-end">
        <SearchInput value={search} onChange={setSearch} placeholder="Filtrar serviços…" />
      </div>

      <Card>
        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
        {!q.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={search ? 'Nenhum serviço encontrado' : 'Ainda não há serviços'}
            action={!search && <Button onClick={() => setEditing({ ...EMPTY })}><Plus /> Novo serviço</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                {!search && <TH className="w-16"><span className="sr-only">Ordem</span></TH>}
                <TH>Serviço</TH>
                <TH>Preço</TH>
                <TH>Atualizado</TH>
                <TH>No site</TH>
                <TH className="w-10"><span className="sr-only">Ações</span></TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((s) => {
                const index = list.findIndex((x) => x.id === s.id);
                return (
                  <TR key={s.id} className={cn('hover:bg-zinc-50/70', !s.active && 'bg-zinc-50/60')}>
                    {!search && (
                      <TD className="py-2">
                        <div className="flex flex-col">
                          <button type="button" aria-label="Subir" disabled={index === 0} onClick={() => void move(index, -1)} className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30">
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button type="button" aria-label="Descer" disabled={index === list.length - 1} onClick={() => void move(index, 1)} className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30">
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>
                      </TD>
                    )}
                    <TD>
                      <button type="button" onClick={() => setEditing(toDraft(s))} className="flex items-center gap-3 text-left">
                        <div className="h-11 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                          {s.image_url && <img src={s.image_url} alt="" className={cn('size-full object-cover', !s.active && 'opacity-50')} loading="lazy" />}
                        </div>
                        <div className="min-w-0">
                          <p className={cn('font-medium', s.active ? 'text-zinc-950' : 'text-zinc-500')}>{s.title}</p>
                          <p className="max-w-[360px] truncate text-xs text-zinc-500">{s.description}</p>
                        </div>
                      </button>
                    </TD>
                    <TD className="whitespace-nowrap">{s.price ?? <span className="text-zinc-400">Sob orçamento</span>}</TD>
                    <TD className="whitespace-nowrap text-zinc-500">{formatDate(s.updated_at)}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Switch checked={s.active} disabled={busy === s.id} onCheckedChange={() => void toggle(s)} aria-label={s.active ? 'Ocultar do site' : 'Mostrar no site'} />
                        {!s.active && <Badge tone="neutral">Oculto</Badge>}
                      </div>
                    </TD>
                    <TD>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${s.title}`}><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => setEditing(toDraft(s))}><Pencil /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => void toggle(s)}>
                            {s.active ? <><EyeOff /> Ocultar do site</> : <><Eye /> Mostrar no site</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setDeleting(s)}><Trash2 /> Remover</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <ServiceSheet
        draft={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void q.reload();
        }}
      />

      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          destructive
          title={`Remover “${deleting.title}”?`}
          description="O serviço sai do site e da lista de categorias dos formulários. Se só quiser escondê-lo por agora, use “Ocultar do site”."
          confirmLabel="Remover"
          onConfirm={async () => {
            await run(() => rpc('admin_delete_service', { p_id: deleting.id }), 'Serviço removido.');
            void q.reload();
          }}
        />
      )}
    </>
  );
}

function toDraft(s: SiteService): Draft {
  return { id: s.id, title: s.title, description: s.description, price: s.price ?? '', keywords: s.keywords, image_url: s.image_url, active: s.active };
}

function ServiceSheet({ draft, onClose, onSaved }: { draft: Draft | null; onClose: () => void; onSaved: () => void }) {
  const run = useAction();
  const [form, setForm] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (draft) setForm(draft);
  }, [draft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !form.id;

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      await run(() => Promise.reject(new Error('Use uma imagem JPG, PNG ou WebP.'))).catch(() => undefined);
      return;
    }
    setUploading(true);
    try {
      const blob = await resizeImage(file, 1200);
      const slug = form.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const url = await run(() => uploadServiceImage(blob, slug));
      set('image_url', url);
    } catch {
      // erro já mostrado
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await run(
        () => rpc('admin_save_service', { p_service: { ...form, price: form.price.trim() || null } }),
        isNew ? 'Serviço criado.' : 'Alterações guardadas.',
      );
      onSaved();
    } catch {
      // erro já mostrado
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && !saving && onClose()}>
      <SheetContent className="sm:max-w-lg">
        <div className="border-b border-zinc-100 px-6 py-5 pr-12">
          <DialogTitle>{isNew ? 'Novo serviço' : 'Editar serviço'}</DialogTitle>
          <DialogDescription className="mt-1">
            {isNew ? 'Fica disponível no site e nos formulários logo que guardar.' : 'As alterações aparecem no site em poucos segundos.'}
          </DialogDescription>
        </div>

        <form
          id="service-form"
          className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label>Imagem</Label>
            <div className="group relative aspect-[3/2] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 text-zinc-400">
                  <ImagePlus className="size-6" />
                  <span className="text-[13px]">Sem imagem</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <Loader2 className="size-5 animate-spin text-zinc-600" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <ImagePlus /> {form.image_url ? 'Trocar imagem' : 'Carregar imagem'}
              </Button>
              {form.image_url && (
                <Button variant="ghost" size="sm" onClick={() => set('image_url', '')}>Remover</Button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            <FieldHint>Horizontal, de preferência 3:2. É redimensionada automaticamente.</FieldHint>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-title">Nome do serviço</Label>
            <Input id="s-title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={80} required placeholder="Ex: Mudanças e Transportes" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="s-desc">Descrição</Label>
              <span className="text-xs tabular-nums text-zinc-400">{form.description.length}/300</span>
            </div>
            <Textarea id="s-desc" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={300} rows={3} placeholder="Uma frase sobre o que inclui." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-price">Preço inicial</Label>
            <Input id="s-price" value={form.price} onChange={(e) => set('price', e.target.value)} maxLength={40} placeholder="Ex: 15.000 Kz" />
            <FieldHint>Aparece como “A partir de”. Vazio mostra “Sob orçamento”.</FieldHint>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-keywords">Palavras de pesquisa</Label>
            <Textarea id="s-keywords" value={form.keywords} onChange={(e) => set('keywords', e.target.value)} maxLength={500} rows={2} placeholder="Ex: mudança transporte carrinha frete" />
            <FieldHint>Sinónimos que as pessoas escrevem na pesquisa do site, separados por espaços.</FieldHint>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3">
            <span>
              <span className="block text-[13px] font-medium text-zinc-900">Visível no site</span>
              <span className="block text-xs text-zinc-500">Quando desligado, fica guardado mas não aparece.</span>
            </span>
            <Switch checked={form.active} onCheckedChange={(v) => set('active', v)} />
          </label>
        </form>

        <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="service-form" disabled={saving || uploading || form.title.trim().length < 2}>
            {saving && <Loader2 className="animate-spin" />}
            {isNew ? 'Criar serviço' : 'Guardar'}
          </Button>
        </div>
      </SheetContent>
    </Dialog>
  );
}

/** Reduz a imagem no browser (máx. `maxWidth` px) antes de a enviar. */
async function resizeImage(file: File, maxWidth: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      el.src = url;
    });
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    return blob ?? file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
