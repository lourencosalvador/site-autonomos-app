import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Camera, ChevronLeft, ChevronRight, ImagePlus, LayoutGrid, Loader2, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import type { CatalogItem } from '../../lib/catalog';
import type { Review } from '../../lib/profile';
import { TextInput } from '../Field';
import { Avatar, Btn, Card, EmptyState, cx, timeAgo } from './ui';

export function ProfileHeader({ name, email, subtitle, avatarUrl, onBack, actions, onAvatar, uploading }: {
  name: string;
  email?: string | null;
  subtitle?: string | null;
  avatarUrl?: string | null;
  onBack?: () => void;
  actions?: ReactNode;
  onAvatar?: (file: File) => void;
  uploading?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="overflow-hidden rounded-2xl bg-brand-cyan">
      <div className="px-5 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
        <div className="flex min-h-10 items-center justify-between gap-2">
          {onBack ? (
            <button onClick={onBack} aria-label="Voltar" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-xl text-brand-dark transition-colors hover:bg-white/30">
              <ChevronLeft size={24} />
            </button>
          ) : <span />}
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </div>
        <div className="mt-2 flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <div className="rounded-full ring-4 ring-white/70">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-brand-dark sm:h-24 sm:w-24">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">{initials(name)}</span>}
              </div>
            </div>
            {onAvatar && (
              <>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatar(f); e.target.value = ''; }} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Alterar foto"
                  className="absolute -bottom-0.5 -right-0.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-dark text-white transition-colors hover:bg-brand-dark2 disabled:opacity-70">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                </button>
              </>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">{name}</h1>
            {email && <p className="truncate text-[15px] text-brand-dark/70">{email}</p>}
            {subtitle && <p className="mt-0.5 truncate text-[15px] font-medium text-brand-dark/85">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeaderIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-dark transition-colors hover:bg-white/35">
      {children}
    </button>
  );
}

export function ProfileTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-full bg-cloud-200/70 p-1" role="tablist">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button key={t.value} role="tab" aria-selected={active} onClick={() => onChange(t.value)}
            className={cx('h-10 rounded-full px-5 text-[15px] font-semibold transition-colors sm:px-6',
              active ? 'bg-brand-cyan text-brand-dark' : 'text-ink-500 hover:text-ink-900')}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function StarsButton({ average, count, onClick }: { average: number; count: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-cloud-100 disabled:hover:bg-transparent">
      <StarRow value={average} size={18} />
      <span className="whitespace-nowrap text-[15px] text-ink-500">
        {count ? <><strong className="font-semibold text-ink-900">{Number(average).toFixed(1)}</strong> · {count} avaliaç{count === 1 ? 'ão' : 'ões'}</> : 'Sem avaliações'}
      </span>
    </button>
  );
}

export function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} className={s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-cloud-200 text-cloud-300'} />
      ))}
    </span>
  );
}

export function ReviewsView({ average, count, items }: { average: number; count: number; items: Review[] }) {
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: items.filter((r) => r.rating === n).length }));
  if (count === 0) {
    return <Card><EmptyState icon={Star} title="Ainda sem avaliações" description="As avaliações aparecem depois de serviços concluídos." /></Card>;
  }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="h-fit p-5 sm:p-6">
        <p className="text-sm font-medium text-ink-500">Média</p>
        <p className="mt-1 font-display text-5xl font-semibold tracking-tight text-ink-900">{Number(average).toFixed(1)}</p>
        <div className="mt-2"><StarRow value={average} size={20} /></div>
        <p className="mt-2 text-[15px] text-ink-500">{count} avaliaç{count === 1 ? 'ão' : 'ões'}</p>
        <div className="mt-5 space-y-2">
          {dist.map(({ n, c }) => (
            <div key={n} className="flex items-center gap-3 text-sm text-ink-500">
              <span className="w-3 tabular-nums">{n}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-cloud-200">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${items.length ? (c / items.length) * 100 : 0}%` }} />
              </div>
              <span className="w-6 text-right tabular-nums">{c}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="divide-y divide-line lg:col-span-2">
        {items.map((r, i) => (
          <div key={i} className="flex gap-3 p-5 sm:p-6">
            <Avatar name={r.client_name || 'Cliente'} src={r.client_avatar_url} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-base font-semibold text-ink-900">{r.client_name || 'Cliente'}</p>
                <span className="text-sm text-ink-400">{timeAgo(r.created_at)}</span>
              </div>
              <div className="mt-1"><StarRow value={r.rating} size={15} /></div>
              {r.comment && <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{r.comment}</p>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function Modal({ open, onClose, children, className, dark }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; dark?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={cx('fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4', dark ? 'bg-ink-950/85' : 'bg-ink-950/45')} onClick={onClose}>
      <div className={cx('max-h-[92dvh] w-full overflow-y-auto', dark ? '' : 'rounded-t-3xl bg-white sm:rounded-2xl', className)} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function Portfolio({ items, editable, onUpload, onUpdate, onDelete }: {
  items: CatalogItem[];
  editable?: boolean;
  onUpload?: (file: File, caption: string, album: string) => Promise<void>;
  onUpdate?: (id: string, caption: string | null, album: string | null) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [album, setAlbum] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ file: File; preview: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const albums = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    for (const it of items) if (it.highlight_title && !map.has(it.highlight_title)) map.set(it.highlight_title, it);
    return [...map.entries()].map(([title, cover]) => ({ title, cover: cover.image_url, count: items.filter((i) => i.highlight_title === title).length }));
  }, [items]);
  const list = album ? items.filter((i) => i.highlight_title === album) : items;

  useEffect(() => { if (album && !albums.some((a) => a.title === album)) setAlbum(null); }, [albums, album]);

  const pick = () => fileRef.current?.click();
  const onFile = (f: File | undefined) => { if (f) setDraft({ file: f, preview: URL.createObjectURL(f) }); };
  const closeDraft = () => { if (draft) URL.revokeObjectURL(draft.preview); setDraft(null); };

  return (
    <div>
      {editable && <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />}

      {(albums.length > 0 || editable) && items.length > 0 && (
        <div className="-mx-1 mb-5 flex gap-4 overflow-x-auto px-1 pb-1">
          <AlbumCircle label="Todos" active={album === null} onClick={() => setAlbum(null)}>
            <span className="flex h-full w-full items-center justify-center bg-cloud-100 text-ink-500"><LayoutGrid size={22} /></span>
          </AlbumCircle>
          {albums.map((a) => (
            <AlbumCircle key={a.title} label={a.title} active={album === a.title} onClick={() => setAlbum(a.title)}>
              <img src={a.cover} alt="" className="h-full w-full object-cover" />
            </AlbumCircle>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={ImagePlus}
            title={editable ? 'O seu portfólio está vazio' : 'Sem trabalhos publicados'}
            description={editable ? 'Publique fotos dos seus melhores trabalhos. Organize-as em álbuns para os clientes encontrarem o que procuram.' : 'Este profissional ainda não publicou trabalhos.'}
            action={editable ? <Btn onClick={pick}><Plus size={18} /> Adicionar foto</Btn> : undefined}
          />
        </Card>
      ) : (
        <>
          {editable && (
            <div className="mb-3 hidden items-center justify-between md:flex">
              <p className="text-[15px] text-ink-500">{list.length} foto{list.length === 1 ? '' : 's'}{album ? ` em ${album}` : ''}</p>
              <Btn size="md" onClick={pick}><Plus size={18} /> Adicionar foto</Btn>
            </div>
          )}
          <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl sm:gap-2 md:grid-cols-4 lg:grid-cols-5">
            {list.map((it, i) => (
              <button key={it.id} onClick={() => setViewing(i)} className="group relative aspect-square overflow-hidden bg-cloud-100 sm:rounded-xl">
                <img src={it.image_url} alt={it.caption ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                {it.caption && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden truncate bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-left text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 md:block">
                    {it.caption}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {editable && items.length > 0 && (
        <button onClick={pick} aria-label="Adicionar foto"
          className="fixed bottom-[6.75rem] left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-brand-cyan text-brand-dark shadow-[0_10px_28px_-8px_rgba(3,71,94,0.45)] transition-colors hover:bg-brand-cyan2 md:hidden">
          <Plus size={26} />
        </button>
      )}

      <Lightbox
        items={list}
        index={viewing}
        onIndex={setViewing}
        editable={editable}
        albums={albums.map((a) => a.title)}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />

      {draft && onUpload && (
        <AddPhoto draft={draft} albums={albums.map((a) => a.title)} defaultAlbum={album ?? ''} onClose={closeDraft}
          onSubmit={async (caption, alb) => { await onUpload(draft.file, caption, alb); closeDraft(); }} />
      )}
    </div>
  );
}

function AlbumCircle({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 sm:w-[88px]">
      <span className={cx('rounded-full p-[3px] ring-2 transition-colors', active ? 'ring-brand-cyan2' : 'ring-line')}>
        <span className="block h-16 w-16 overflow-hidden rounded-full sm:h-[76px] sm:w-[76px]">{children}</span>
      </span>
      <span className={cx('w-full truncate text-center text-sm', active ? 'font-semibold text-ink-900' : 'text-ink-500')}>{label}</span>
    </button>
  );
}

function AlbumInput({ value, onChange, albums }: { value: string; onChange: (v: string) => void; albums: string[] }) {
  return (
    <div className="space-y-2">
      <TextInput value={value} onChange={(e) => onChange(e.target.value.slice(0, 30))} placeholder="Ex.: Cozinhas, Instalações, Reparações" />
      {albums.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {albums.map((a) => (
            <button key={a} type="button" onClick={() => onChange(a)}
              className={cx('rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors', value === a ? 'border-brand-dark bg-brand-dark text-white' : 'border-line text-ink-700 hover:bg-cloud-100')}>
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddPhoto({ draft, albums, defaultAlbum, onClose, onSubmit }: {
  draft: { file: File; preview: string };
  albums: string[];
  defaultAlbum: string;
  onClose: () => void;
  onSubmit: (caption: string, album: string) => Promise<void>;
}) {
  const [caption, setCaption] = useState('');
  const [album, setAlbum] = useState(defaultAlbum);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try { await onSubmit(caption.trim(), album.trim()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível publicar.'); setBusy(false); }
  };
  return (
    <Modal open onClose={busy ? () => {} : onClose} className="max-w-lg">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold text-ink-900">Nova foto</h3>
        <button onClick={onClose} disabled={busy} aria-label="Fechar" className="rounded-lg p-2 text-ink-400 hover:bg-cloud-100"><X size={20} /></button>
      </div>
      <div className="space-y-5 p-5">
        <div className="overflow-hidden rounded-xl bg-cloud-100">
          <img src={draft.preview} alt="" className="max-h-[42vh] w-full object-contain" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[15px] font-medium text-ink-900">Legenda <span className="font-normal text-ink-400">(opcional)</span></label>
          <TextInput value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex.: Instalação de canalização nova" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[15px] font-medium text-ink-900">Álbum <span className="font-normal text-ink-400">(opcional)</span></label>
          <AlbumInput value={album} onChange={setAlbum} albums={albums} />
        </div>
        {error && <p className="text-[15px] font-medium text-red-600">{error}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-line p-5">
        <Btn variant="outline" onClick={onClose} disabled={busy}>Cancelar</Btn>
        <Btn onClick={submit} loading={busy}>{busy ? 'A publicar…' : 'Publicar'}</Btn>
      </div>
    </Modal>
  );
}

function Lightbox({ items, index, onIndex, editable, albums, onUpdate, onDelete }: {
  items: CatalogItem[];
  index: number | null;
  onIndex: (i: number | null) => void;
  editable?: boolean;
  albums: string[];
  onUpdate?: (id: string, caption: string | null, album: string | null) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [caption, setCaption] = useState('');
  const [album, setAlbum] = useState('');
  const [busy, setBusy] = useState(false);
  const item = index !== null ? items[index] : undefined;

  useEffect(() => { setEditing(false); setConfirmDelete(false); }, [index]);
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      if (e.key === 'ArrowRight') onIndex(Math.min(items.length - 1, index + 1));
      if (e.key === 'ArrowLeft') onIndex(Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, editing, onIndex]);

  if (!item || index === null) return null;
  const close = () => onIndex(null);

  return (
    <Modal open onClose={close} dark className="max-w-4xl">
      <div className="relative flex flex-col items-center px-3 pb-4 pt-14 sm:px-0">
        <button onClick={close} aria-label="Fechar" className="absolute right-3 top-3 rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white sm:right-0"><X size={24} /></button>
        <div className="relative w-full">
          <img src={item.image_url} alt={item.caption ?? ''} className="mx-auto max-h-[68dvh] rounded-xl object-contain" />
          {index > 0 && (
            <button onClick={() => onIndex(index - 1)} aria-label="Anterior" className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"><ChevronLeft size={22} /></button>
          )}
          {index < items.length - 1 && (
            <button onClick={() => onIndex(index + 1)} aria-label="Seguinte" className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"><ChevronRight size={22} /></button>
          )}
        </div>

        <div className="mt-4 w-full max-w-xl rounded-2xl bg-white p-4 sm:p-5">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[15px] font-medium text-ink-900">Legenda</label>
                <TextInput value={caption} onChange={(e) => setCaption(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[15px] font-medium text-ink-900">Álbum</label>
                <AlbumInput value={album} onChange={setAlbum} albums={albums} />
              </div>
              <div className="flex gap-2">
                <Btn size="md" loading={busy} onClick={async () => {
                  if (!onUpdate) return;
                  setBusy(true);
                  try { await onUpdate(item.id, caption.trim() || null, album.trim() || null); setEditing(false); } finally { setBusy(false); }
                }}>Guardar</Btn>
                <Btn size="md" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Btn>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink-900">{item.caption || 'Sem legenda'}</p>
                <p className="text-sm text-ink-500">{[item.highlight_title, timeAgo(item.created_at)].filter(Boolean).join(' · ')}</p>
              </div>
              {editable && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <Btn size="sm" variant="danger" loading={busy} onClick={async () => {
                      if (!onDelete) return;
                      setBusy(true);
                      try { await onDelete(item.id); close(); } finally { setBusy(false); }
                    }}>Apagar</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Não</Btn>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Btn size="sm" variant="outline" onClick={() => { setCaption(item.caption ?? ''); setAlbum(item.highlight_title ?? ''); setEditing(true); }}><Pencil size={15} /> Editar</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Apagar foto" className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></Btn>
                  </div>
                )
              )}
            </div>
          )}
        </div>
        <p className="mt-3 text-sm text-white/60">{index + 1} de {items.length}</p>
      </div>
    </Modal>
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}
