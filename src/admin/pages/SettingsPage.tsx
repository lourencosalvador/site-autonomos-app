import { useState } from 'react';
import { Check, Copy, KeyRound, Loader2, LogOut, MoreHorizontal, Plus, ShieldOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { Avatar, ConfirmDialog } from '../components/blocks';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '../ui/card';
import { Button } from '../ui/button';
import { Input, Label } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ErrorBanner, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { useAction } from '../lib/useAction';
import type { AdminSession } from '../lib/session';
import type { AdminAccount } from '../lib/types';
import { formatDate, formatDateTime, timeAgo } from '../lib/utils';

type Pending =
  | { kind: 'reset'; admin: AdminAccount }
  | { kind: 'toggle'; admin: AdminAccount }
  | { kind: 'others' };

export function SettingsPage({ session, onLogout }: { session: AdminSession; onLogout: () => void }) {
  const run = useAction();
  const q = useAdminQuery(() => rpc<AdminAccount[]>('admin_list_admins'), []);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ name: string; key: string; isNew: boolean } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  return (
    <>
      <PageHeader title="Definições" description="Quem tem acesso ao painel e a sua sessão." />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Administradores</CardTitle>
              <CardDescription className="mt-1">Cada pessoa tem a sua chave. Só é mostrada uma vez, quando é criada.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreating(true)}><Plus /> Adicionar</Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {q.error && <div className="px-5 pb-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
            {!q.data ? (
              <div className="space-y-2 px-5 pb-5">{[0, 1].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Nome</TH>
                    <TH>Estado</TH>
                    <TH>Último acesso</TH>
                    <TH>Criado</TH>
                    <TH className="w-10"><span className="sr-only">Ações</span></TH>
                  </TR>
                </THead>
                <TBody>
                  {q.data.map((a) => (
                    <TR key={a.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={a.name} className="bg-zinc-900 text-white" />
                          <div>
                            <p className="font-medium text-zinc-950">
                              {a.name} {a.is_me && <span className="font-normal text-zinc-400">(você)</span>}
                            </p>
                            <p className="text-xs text-zinc-500">{a.sessions} {a.sessions === 1 ? 'sessão ativa' : 'sessões ativas'}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>{a.active ? <Badge tone="success">Ativo</Badge> : <Badge tone="neutral">Desativado</Badge>}</TD>
                      <TD className="whitespace-nowrap text-zinc-500" title={formatDateTime(a.last_login_at)}>{a.last_login_at ? timeAgo(a.last_login_at) : 'Nunca'}</TD>
                      <TD className="whitespace-nowrap text-zinc-500">{formatDate(a.created_at)}</TD>
                      <TD>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${a.name}`}><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-52">
                            <DropdownMenuItem onSelect={() => setPending({ kind: 'reset', admin: a })}><KeyRound /> Gerar nova chave</DropdownMenuItem>
                            {!a.is_me && (
                              <DropdownMenuItem destructive={a.active} onSelect={() => setPending({ kind: 'toggle', admin: a })}>
                                {a.active ? <><ShieldOff /> Desativar acesso</> : <><ShieldCheck /> Reativar acesso</>}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>A sua sessão</CardTitle>
            <CardDescription>Termina automaticamente às {new Date(session.expiresAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setPending({ kind: 'others' })}>
              <ShieldOff /> Terminar sessões noutros dispositivos
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={onLogout}>
              <LogOut /> Sair do painel
            </Button>
            <p className="pt-3 text-xs leading-relaxed text-zinc-500">
              Por segurança, a chave nunca é guardada em texto: se alguém a perder, gere uma nova. Após 5 tentativas erradas, o acesso fica bloqueado 15 minutos nesse endereço IP.
            </p>
          </CardContent>
        </Card>
      </div>

      <CreateAdminDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(name, key) => {
          setCreating(false);
          setRevealed({ name, key, isNew: true });
          void q.reload();
        }}
      />

      <KeyRevealDialog value={revealed} onClose={() => setRevealed(null)} />

      {pending?.kind === 'reset' && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={`Gerar nova chave para ${pending.admin.name}?`}
          description={pending.admin.is_me
            ? 'A chave atual deixa de funcionar. As suas outras sessões são terminadas; esta continua aberta.'
            : 'A chave atual deixa de funcionar e as sessões abertas desta pessoa são terminadas.'}
          confirmLabel="Gerar chave"
          onConfirm={async () => {
            const r = await run(() => rpc<{ key: string }>('admin_reset_admin_key', { p_id: pending.admin.id }));
            setRevealed({ name: pending.admin.name, key: r.key, isNew: false });
            void q.reload();
          }}
        />
      )}
      {pending?.kind === 'toggle' && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          destructive={pending.admin.active}
          title={pending.admin.active ? `Desativar ${pending.admin.name}?` : `Reativar ${pending.admin.name}?`}
          description={pending.admin.active
            ? 'Perde o acesso ao painel de imediato. A conta fica guardada e pode ser reativada.'
            : 'Volta a poder entrar com a chave que tinha.'}
          confirmLabel={pending.admin.active ? 'Desativar' : 'Reativar'}
          onConfirm={async () => {
            await run(() => rpc('admin_set_admin_active', { p_id: pending.admin.id, p_active: !pending.admin.active }), 'Acesso atualizado.');
            void q.reload();
          }}
        />
      )}
      {pending?.kind === 'others' && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title="Terminar outras sessões?"
          description="Qualquer outro dispositivo com sessão aberta na sua conta é desligado. Esta sessão continua."
          confirmLabel="Terminar"
          onConfirm={async () => {
            await run(() => rpc('admin_end_other_sessions'), 'Outras sessões terminadas.');
            void q.reload();
          }}
        />
      )}
    </>
  );
}

function CreateAdminDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (name: string, key: string) => void }) {
  const run = useAction();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const r = await run(() => rpc<{ name: string; key: string }>('admin_create_admin', { p_name: name }));
      setName('');
      onCreated(r.name, r.key);
    } catch {
      // erro já mostrado
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar administrador</DialogTitle>
          <DialogDescription>É gerada uma chave de acesso de 8 caracteres para esta pessoa.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="a-name">Nome</Label>
            <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Lourenço Salvador" autoFocus maxLength={60} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || name.trim().length < 2}>
              {saving && <Loader2 className="animate-spin" />} Gerar chave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KeyRevealDialog({ value, onClose }: { value: { name: string; key: string; isNew: boolean } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const key = value?.key ?? '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={!!value} onOpenChange={(o) => { if (!o) { setCopied(false); onClose(); } }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{value?.isNew ? `Chave de ${value?.name}` : `Nova chave de ${value?.name}`}</DialogTitle>
          <DialogDescription>Entregue-a pessoalmente ou por um canal seguro.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <span className="font-mono text-2xl font-semibold tracking-[0.25em] text-zinc-950">
            {key.slice(0, 4)}<span className="text-zinc-300">-</span>{key.slice(4)}
          </span>
          <Button variant="outline" size="sm" onClick={() => void copy()}>
            {copied ? <><Check /> Copiada</> : <><Copy /> Copiar</>}
          </Button>
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Esta chave não volta a ser mostrada. Se se perder, gere uma nova.
        </p>
        <DialogFooter>
          <Button onClick={() => { setCopied(false); onClose(); }}>Já guardei a chave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
