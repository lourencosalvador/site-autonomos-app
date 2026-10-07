import { useEffect, useState } from 'react';
import {
  Ban, Eye, LogOut, MoreHorizontal, Pencil, ShieldCheck, Star, Trash2, UserCircle, Users,
} from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { SearchInput } from '../components/SearchInput';
import { Avatar, ConfirmDialog, DetailRow } from '../components/blocks';
import { ProfessionalProfileSheet } from '../components/ProfessionalProfile';
import { Badge, Card, Skeleton, StatusDot } from '../ui/card';
import { Button } from '../ui/button';
import { Input, Label, Select } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, SheetContent } from '../ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { EmptyState, ErrorBanner, Pagination, Segmented, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { useDebounced } from '../lib/hooks';
import { APP_REQUEST_STATUS, ROLE_LABELS } from '../lib/labels';
import { useAction } from '../lib/useAction';
import type { AppUser, Page, UserDetail } from '../lib/types';
import { formatDate, formatDateTime, formatNumber, timeAgo } from '../lib/utils';

const PAGE_SIZE = 20;
type Tab = 'all' | 'client' | 'professional' | 'suspended';

const SUSPEND_OPTIONS: { label: string; days: number | null }[] = [
  { label: '24 horas', days: 1 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: 'Indefinidamente', days: null },
];

type PendingAction =
  | { kind: 'suspend'; user: AppUser; days: number | null; label: string }
  | { kind: 'unsuspend' | 'sessions' | 'delete'; user: AppUser };

export function UsersPage() {
  const run = useAction();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [action, setAction] = useState<PendingAction | null>(null);
  const debounced = useDebounced(search);

  const q = useAdminQuery(
    () => rpc<Page<AppUser>>('admin_list_users', {
      p_role: tab === 'client' || tab === 'professional' ? tab : null,
      p_status: tab === 'suspended' ? 'suspended' : null,
      p_search: debounced || null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    }),
    [tab, debounced, page],
  );
  const counts = q.data?.counts ?? {};
  const [version, setVersion] = useState(0);
  const changed = () => {
    void q.reload();
    setVersion((v) => v + 1);
  };

  const confirmCopy = action && confirmText(action);

  return (
    <>
      <PageHeader title="Utilizadores" description="Contas de clientes e profissionais da app AUTONOMOUS." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={tab}
          onChange={(v) => { setTab(v); setPage(0); }}
          options={[
            { value: 'all', label: 'Todos', count: counts.all ?? 0 },
            { value: 'client', label: 'Clientes', count: counts.client ?? 0 },
            { value: 'professional', label: 'Profissionais', count: counts.professional ?? 0 },
            { value: 'suspended', label: 'Suspensos', count: counts.suspended ?? 0 },
          ]}
        />
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Pesquisar nome, email, telefone…" />
      </div>

      <Card>
        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
        {!q.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : q.data.rows.length === 0 ? (
          <EmptyState icon={Users} title={debounced ? 'Nenhum utilizador encontrado' : 'Sem utilizadores'} description={debounced ? 'Experimente outro termo de pesquisa.' : undefined} />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Utilizador</TH>
                  <TH>Tipo</TH>
                  <TH>Telefone</TH>
                  <TH>Registo</TH>
                  <TH>Último acesso</TH>
                  <TH>Estado</TH>
                  <TH className="w-10"><span className="sr-only">Ações</span></TH>
                </TR>
              </THead>
              <TBody>
                {q.data.rows.map((u) => (
                  <TR key={u.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => setDetailId(u.id)}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.avatar_url} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-950">{u.name || 'Sem nome'}</p>
                          <p className="truncate text-xs text-zinc-500">{u.email ?? '—'}</p>
                        </div>
                      </div>
                    </TD>
                    <TD><Badge tone={u.role === 'professional' ? 'brand' : 'neutral'}>{ROLE_LABELS[u.role]}</Badge></TD>
                    <TD className="whitespace-nowrap">{u.phone || u.auth_phone || '—'}</TD>
                    <TD className="whitespace-nowrap">{formatDate(u.created_at)}</TD>
                    <TD className="whitespace-nowrap text-zinc-500">{u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : 'Nunca'}</TD>
                    <TD>
                      {u.suspended
                        ? <StatusDot tone="danger">Suspenso</StatusDot>
                        : <StatusDot tone="success">Ativo</StatusDot>}
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <UserMenu user={u} onView={() => setDetailId(u.id)} onProfile={u.role === 'professional' ? () => setProfileId(u.id) : undefined} onEdit={() => setEditing(u)} onAction={setAction} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <UserSheet
        userId={detailId}
        version={version}
        onClose={() => setDetailId(null)}
        onProfile={(u) => { setDetailId(null); setProfileId(u.id); }}
        onEdit={setEditing}
        onAction={setAction}
      />

      <ProfessionalProfileSheet
        target={profileId ? { userId: profileId } : null}
        onClose={() => setProfileId(null)}
        onStatusChange={changed}
      />

      <EditUserDialog
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); changed(); }}
      />

      {action && confirmCopy && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setAction(null)}
          destructive={action.kind === 'delete' || action.kind === 'suspend'}
          requireText={action.kind === 'delete' ? 'REMOVER' : undefined}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirm}
          onConfirm={async () => {
            const id = action.user.id;
            if (action.kind === 'suspend') {
              await run(() => rpc('admin_suspend_user', { p_id: id, p_days: action.days }), 'Acesso suspenso.');
            } else if (action.kind === 'unsuspend') {
              await run(() => rpc('admin_unsuspend_user', { p_id: id }), 'Acesso reativado.');
            } else if (action.kind === 'sessions') {
              await run(() => rpc('admin_revoke_user_sessions', { p_id: id }), 'Sessões terminadas.');
            } else {
              await run(() => rpc('admin_delete_user', { p_id: id }), 'Conta removida.');
              setDetailId(null);
            }
            changed();
          }}
        />
      )}
    </>
  );
}

function confirmText(a: PendingAction): { title: string; description: React.ReactNode; confirm: string } {
  const name = <b className="text-zinc-900">{a.user.name || a.user.email || 'este utilizador'}</b>;
  switch (a.kind) {
    case 'suspend':
      return {
        title: 'Suspender acesso',
        description: <>{name} deixa de conseguir entrar na app ({a.label.toLowerCase()}) e as sessões abertas são terminadas. Pode reativar a qualquer momento.</>,
        confirm: 'Suspender',
      };
    case 'unsuspend':
      return { title: 'Reativar acesso', description: <>{name} volta a poder entrar na app.</>, confirm: 'Reativar' };
    case 'sessions':
      return {
        title: 'Terminar sessões',
        description: <>{name} é desligado de todos os dispositivos e terá de entrar novamente.</>,
        confirm: 'Terminar sessões',
      };
    default:
      return {
        title: 'Remover conta',
        description: <>A conta de {name} é apagada definitivamente, incluindo o perfil e os pedidos associados. Esta ação não pode ser desfeita.</>,
        confirm: 'Remover conta',
      };
  }
}

function UserMenu({ user, onView, onProfile, onEdit, onAction }: {
  user: AppUser;
  onView: () => void;
  onProfile?: () => void;
  onEdit: () => void;
  onAction: (a: PendingAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${user.name ?? 'utilizador'}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {onProfile && <DropdownMenuItem onSelect={onProfile}><UserCircle /> Perfil profissional</DropdownMenuItem>}
        <DropdownMenuItem onSelect={onView}><Eye /> Ver detalhes</DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}><Pencil /> Editar</DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.suspended ? (
          <DropdownMenuItem onSelect={() => onAction({ kind: 'unsuspend', user })}><ShieldCheck /> Reativar acesso</DropdownMenuItem>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><Ban className="size-4 text-zinc-500" /> Suspender acesso</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {SUSPEND_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.label} onSelect={() => onAction({ kind: 'suspend', user, days: o.days, label: o.label })}>
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuItem onSelect={() => onAction({ kind: 'sessions', user })}><LogOut /> Terminar sessões</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onAction({ kind: 'delete', user })}><Trash2 /> Remover conta</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserSheet({ userId, version, onClose, onProfile, onEdit, onAction }: {
  userId: string | null;
  version: number;
  onClose: () => void;
  onProfile: (u: AppUser) => void;
  onEdit: (u: AppUser) => void;
  onAction: (a: PendingAction) => void;
}) {
  const q = useAdminQuery(
    () => (userId ? rpc<UserDetail>('admin_user_detail', { p_id: userId }) : Promise.resolve(null)),
    [userId, version],
  );
  const detail = q.data && q.data.user.id === userId ? q.data : null;
  const u = detail?.user;
  const s = detail?.stats;

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg" aria-describedby={undefined}>
        {!u ? (
          <div className="space-y-3 p-6">
            <DialogTitle className="sr-only">A carregar</DialogTitle>
            {q.error ? <ErrorBanner message={q.error} /> : <><Skeleton className="h-12 w-48" /><Skeleton className="h-24" /><Skeleton className="h-40" /></>}
          </div>
        ) : (
          <>
            <div className="border-b border-zinc-100 px-6 py-5 pr-12">
              <div className="flex items-center gap-3">
                <Avatar name={u.name} src={u.avatar_url} className="size-12 text-sm" />
                <div className="min-w-0">
                  <DialogTitle className="truncate">{u.name || 'Sem nome'}</DialogTitle>
                  <p className="truncate text-[13px] text-zinc-500">{u.email}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={u.role === 'professional' ? 'brand' : 'neutral'}>{ROLE_LABELS[u.role]}</Badge>
                {u.suspended
                  ? <Badge tone="danger">Suspenso até {formatDate(u.banned_until)}</Badge>
                  : <Badge tone="success">Ativo</Badge>}
                {!!u.active_sessions && <Badge tone="outline">{u.active_sessions} {u.active_sessions === 1 ? 'sessão aberta' : 'sessões abertas'}</Badge>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {s && (s.requests_as_client !== undefined || s.reviews) && (
                <div className="grid grid-cols-3 gap-2">
                  <Stat label={u.role === 'professional' ? 'Pedidos recebidos' : 'Pedidos feitos'} value={u.role === 'professional' ? s.requests_as_provider : s.requests_as_client} />
                  <Stat label="Concluídos" value={s.completed} />
                  {u.role === 'professional' && s.reviews ? (
                    <div className="rounded-lg border border-zinc-100 px-3 py-2.5">
                      <p className="flex items-center gap-1 text-lg font-semibold tabular-nums">
                        {s.reviews.average ? Number(s.reviews.average).toLocaleString('pt-PT') : '—'}
                        {s.reviews.average && <Star className="size-3.5 fill-brand-cyan2 text-brand-cyan2" />}
                      </p>
                      <p className="text-xs text-zinc-500">{formatNumber(s.reviews.count)} avaliações</p>
                    </div>
                  ) : (
                    <Stat label="Como profissional" value={s.requests_as_provider} />
                  )}
                </div>
              )}

              <dl className="mt-4 divide-y divide-zinc-100">
                <DetailRow label="Telefone">{u.phone || u.auth_phone || '—'}</DetailRow>
                {u.work_area && <DetailRow label="Área">{u.work_area}</DetailRow>}
                <DetailRow label="Registo">{formatDateTime(u.created_at)}</DetailRow>
                <DetailRow label="Último acesso">{u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : 'Nunca entrou'}</DetailRow>
                <DetailRow label="ID"><span className="font-mono text-xs text-zinc-500">{u.id}</span></DetailRow>
              </dl>

              {!!s?.recent?.length && (
                <div className="mt-5">
                  <p className="text-[13px] font-medium text-zinc-900">Pedidos recentes</p>
                  <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
                    {s.recent.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                        <div className="min-w-0">
                          <p className="truncate text-zinc-900">{r.service}</p>
                          <p className="text-xs text-zinc-500">{r.as === 'client' ? 'Como cliente' : 'Como profissional'} · {formatDate(r.created_at)}</p>
                        </div>
                        <Badge tone="outline">{APP_REQUEST_STATUS[r.status] ?? r.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-6 py-4">
              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onAction({ kind: 'delete', user: u })}>
                <Trash2 /> Remover
              </Button>
              <div className="flex gap-2">
                {u.role === 'professional' && <Button variant="outline" size="sm" onClick={() => onProfile(u)}><UserCircle /> Perfil</Button>}
                {u.suspended ? (
                  <Button variant="outline" size="sm" onClick={() => onAction({ kind: 'unsuspend', user: u })}><ShieldCheck /> Reativar</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => onAction({ kind: 'suspend', user: u, days: 7, label: '7 dias' })}><Ban /> Suspender 7 dias</Button>
                )}
                <Button size="sm" onClick={() => onEdit(u)}><Pencil /> Editar</Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-zinc-100 px-3 py-2.5">
      <p className="text-lg font-semibold tabular-nums">{value === undefined ? '—' : formatNumber(value)}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function EditUserDialog({ user, onClose, onSaved }: { user: AppUser | null; onClose: () => void; onSaved: () => void }) {
  const run = useAction();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AppUser['role']>('client');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setPhone(user.phone ?? '');
      setRole(user.role);
    }
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await run(() => rpc('admin_update_user', { p_id: user.id, p_name: name, p_phone: phone, p_role: role }), 'Utilizador atualizado.');
      onSaved();
    } catch {
      // erro já mostrado
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar utilizador</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Nome</Label>
            <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-phone">Telefone</Label>
            <Input id="u-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+244 9XX XXX XXX" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-role">Tipo de conta</Label>
            <Select id="u-role" value={role} onChange={(e) => setRole(e.target.value as AppUser['role'])}>
              <option value="client">Cliente</option>
              <option value="professional">Profissional</option>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || name.trim().length < 2}>{saving ? 'A guardar…' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
