import { useState } from 'react';
import { BadgeCheck, Check, FlaskConical, RefreshCw, Trash2, X } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { Card, Badge, Skeleton } from '../ui/card';
import { Button } from '../ui/button';
import { EmptyState, ErrorBanner, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { timeAgo } from '../lib/utils';

type AdminPro = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  work_area: string | null;
  specialty: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

const APPROVAL: Record<AdminPro['approval_status'], { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Por aprovar', tone: 'warning' },
  approved: { label: 'Aprovado', tone: 'success' },
  rejected: { label: 'Rejeitado', tone: 'danger' },
};

type AdminBroadcast = {
  id: string;
  category: string;
  status: 'open' | 'accepted' | 'expired' | 'cancelled' | 'completed';
  created_at: string;
  expires_at: string;
  seconds_left: number;
  client_name: string | null;
  provider_name: string | null;
};

const STATUS: Record<AdminBroadcast['status'], { label: string; tone: 'brand' | 'success' | 'warning' | 'neutral' | 'danger' }> = {
  open: { label: 'Aberto', tone: 'brand' },
  accepted: { label: 'Aceite', tone: 'success' },
  expired: { label: 'Expirado', tone: 'warning' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  completed: { label: 'Concluído', tone: 'success' },
};

export function TestPage() {
  const q = useAdminQuery(() => rpc<AdminBroadcast[]>('admin_list_broadcasts', { p_limit: 200 }), [], 10_000);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const rows = q.data ?? [];

  const clearAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await rpc<number>('admin_clear_broadcasts');
      setConfirmClear(false);
      q.reload();
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = async (id: string) => {
    setBusy(true);
    try {
      await rpc('admin_delete_broadcast', { p_id: id });
      q.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Teste da app web"
        description="Aprovar prestadores e gerir os pedidos de teste, sem ir ao Supabase."
      />

      <ProfessionalsCard />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900"><FlaskConical className="size-4 text-zinc-400" /> Limpar pedidos de teste</p>
            <p className="mt-0.5 text-[13px] text-zinc-500">Apaga todos os pedidos de serviço. Útil para testar o timeout e o broadcast do zero.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={q.reload} disabled={q.loading}>
              <RefreshCw className={q.loading ? 'animate-spin' : ''} /> Atualizar
            </Button>
            {confirmClear ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)} disabled={busy}>Cancelar</Button>
                <Button variant="destructive" size="sm" onClick={clearAll} disabled={busy}>Confirmar — apagar {rows.length}</Button>
              </>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setConfirmClear(true)} disabled={rows.length === 0}>
                <Trash2 /> Apagar todos
              </Button>
            )}
          </div>
        </div>
      </Card>

      {q.error && <ErrorBanner message={q.error} onRetry={q.reload} />}

      <Card>
        <div className="border-b border-zinc-100 p-4">
          <p className="text-[13px] text-zinc-500">{rows.length} pedido(s) · atualiza a cada 10 segundos</p>
        </div>
        {q.loading && !q.data ? (
          <div className="space-y-2 p-4"><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={FlaskConical} title="Sem pedidos" description="Cria um pedido na app (como cliente) para o veres aqui." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Categoria</TH>
                <TH>Cliente</TH>
                <TH>Prestador</TH>
                <TH>Estado</TH>
                <TH>Criado</TH>
                <TH className="text-right">Ação</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((b) => (
                <TR key={b.id}>
                  <TD className="font-medium text-zinc-900">{b.category}</TD>
                  <TD>{b.client_name ?? '—'}</TD>
                  <TD>{b.provider_name ?? '—'}</TD>
                  <TD>
                    <Badge tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Badge>
                    {b.status === 'open' && <span className="ml-2 text-[11px] text-zinc-400">{b.seconds_left}s</span>}
                  </TD>
                  <TD className="text-zinc-500">{timeAgo(b.created_at)}</TD>
                  <TD className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteOne(b.id)} disabled={busy} aria-label="Apagar pedido">
                      <Trash2 className="text-red-500" />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}

/* ---------------- Prestadores (aprovação) ---------------- */

function ProfessionalsCard() {
  const q = useAdminQuery(() => rpc<AdminPro[]>('admin_list_professionals', { p_limit: 200 }), [], 15_000);
  const [busy, setBusy] = useState<string | null>(null);
  const rows = q.data ?? [];
  const pending = rows.filter((p) => p.approval_status === 'pending').length;

  const setStatus = async (id: string, status: 'approved' | 'rejected') => {
    setBusy(id);
    try {
      await rpc('admin_set_professional_approval', { p_id: id, p_status: status });
      q.reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between border-b border-zinc-100 p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900"><BadgeCheck className="size-4 text-zinc-400" /> Prestadores</p>
          <p className="mt-0.5 text-[13px] text-zinc-500">
            {pending > 0 ? `${pending} por aprovar` : 'Sem prestadores por aprovar'} · só aprovados recebem pedidos.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={q.reload} disabled={q.loading}>
          <RefreshCw className={q.loading ? 'animate-spin' : ''} /> Atualizar
        </Button>
      </div>

      {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={q.reload} /></div>}

      {q.loading && !q.data ? (
        <div className="space-y-2 p-4"><Skeleton className="h-9" /><Skeleton className="h-9" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="Sem prestadores" description="Os prestadores que se registarem aparecem aqui para aprovação." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Área</TH>
              <TH>Contacto</TH>
              <TH>Estado</TH>
              <TH className="text-right">Ação</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium text-zinc-900">{p.name ?? '—'}</TD>
                <TD>{p.work_area ?? '—'}</TD>
                <TD className="text-zinc-500">{p.email ?? p.phone ?? '—'}</TD>
                <TD><Badge tone={APPROVAL[p.approval_status].tone}>{APPROVAL[p.approval_status].label}</Badge></TD>
                <TD className="text-right">
                  <div className="inline-flex gap-1.5">
                    {p.approval_status !== 'approved' && (
                      <Button variant="secondary" size="sm" onClick={() => setStatus(p.id, 'approved')} disabled={busy === p.id}>
                        <Check /> Aprovar
                      </Button>
                    )}
                    {p.approval_status !== 'rejected' && (
                      <Button variant="ghost" size="sm" onClick={() => setStatus(p.id, 'rejected')} disabled={busy === p.id} aria-label="Rejeitar">
                        <X className="text-red-500" />
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
