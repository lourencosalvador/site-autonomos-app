import { useMemo, useState } from 'react';
import { BadgeCheck, Building2, Check, MessageCircle, Phone, RefreshCw, X } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { SearchInput } from '../components/SearchInput';
import { DetailRow } from '../components/blocks';
import { Badge, Card, Skeleton } from '../ui/card';
import { Button, buttonClass } from '../ui/button';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '../ui/dialog';
import { EmptyState, ErrorBanner, Segmented, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { useAction } from '../lib/useAction';
import { formatDateTime, phoneDigits, timeAgo } from '../lib/utils';

type Approval = 'pending' | 'approved' | 'rejected';

type Pro = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  work_areas: string[] | null;
  company_name: string | null;
  specialty: string | null;
  province: string | null;
  bio: string | null;
  approval_status: Approval;
  approval_reviewed_at: string | null;
  created_at: string;
  jobs_done: number;
};

const APPROVAL: Record<Approval, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Por aprovar', tone: 'warning' },
  approved: { label: 'Aprovado', tone: 'success' },
  rejected: { label: 'Rejeitado', tone: 'danger' },
};

export function ProfessionalsPage({ onChange }: { onChange?: () => void }) {
  const q = useAdminQuery(() => rpc<Pro[]>('admin_list_professionals', { p_limit: 500 }), [], 30_000);
  const run = useAction();
  const [filter, setFilter] = useState<Approval | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const counts = useMemo(() => ({
    pending: rows.filter((p) => p.approval_status === 'pending').length,
    approved: rows.filter((p) => p.approval_status === 'approved').length,
    rejected: rows.filter((p) => p.approval_status === 'rejected').length,
  }), [rows]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows
      .filter((p) => filter === 'all' || p.approval_status === filter)
      .filter((p) => !s || [p.name, p.email, p.phone, p.company_name, ...(p.work_areas ?? [])].some((v) => (v ?? '').toLowerCase().includes(s)));
  }, [rows, filter, search]);

  const setStatus = async (id: string, status: Approval) => {
    setBusy(id);
    try {
      await run(() => rpc('admin_set_professional_approval', { p_id: id, p_status: status }), status === 'approved' ? 'Prestador aprovado.' : status === 'rejected' ? 'Prestador rejeitado.' : 'Estado atualizado.');
      q.reload();
      onChange?.();
    } catch {} finally { setBusy(null); }
  };

  const open = rows.find((p) => p.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Prestadores"
        description="Profissionais registados na app. Só os aprovados têm acesso aos pedidos e à carteira."
        actions={<Button variant="outline" size="sm" onClick={q.reload} disabled={q.loading}><RefreshCw className={q.loading ? 'animate-spin' : ''} /> Atualizar</Button>}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'pending', label: 'Por aprovar', count: counts.pending },
              { value: 'approved', label: 'Aprovados', count: counts.approved },
              { value: 'rejected', label: 'Rejeitados', count: counts.rejected },
              { value: 'all', label: 'Todos', count: rows.length },
            ]}
          />
          <div className="lg:w-72"><SearchInput value={search} onChange={setSearch} placeholder="Nome, área, empresa…" /></div>
        </div>

        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={q.reload} /></div>}

        {q.loading && !q.data ? (
          <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : list.length === 0 ? (
          <EmptyState icon={BadgeCheck} title={filter === 'pending' ? 'Nenhum prestador por aprovar' : 'Sem prestadores'} description="Os profissionais que se registarem aparecem aqui." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Prestador</TH>
                <TH>Áreas de atuação</TH>
                <TH>Empresa</TH>
                <TH>Contacto</TH>
                <TH>Registo</TH>
                <TH>Estado</TH>
                <TH className="text-right">Ação</TH>
              </TR>
            </THead>
            <TBody>
              {list.map((p) => (
                <TR key={p.id} className="cursor-pointer hover:bg-zinc-50/80" onClick={() => setOpenId(p.id)}>
                  <TD>
                    <p className="font-medium text-zinc-900">{p.name ?? '—'}</p>
                    <p className="text-xs text-zinc-500">{p.email ?? '—'}</p>
                  </TD>
                  <TD>
                    <div className="flex max-w-[260px] flex-wrap gap-1">
                      {(p.work_areas ?? []).map((a) => <Badge key={a} tone="outline">{a}</Badge>)}
                      {!p.work_areas?.length && <span className="text-zinc-400">—</span>}
                    </div>
                  </TD>
                  <TD>
                    {p.company_name
                      ? <span className="inline-flex items-center gap-1 font-medium text-zinc-900"><Building2 className="size-3.5 text-amber-600" /> {p.company_name}</span>
                      : <span className="text-zinc-500">Individual</span>}
                  </TD>
                  <TD className="whitespace-nowrap text-zinc-600">{p.phone ?? '—'}</TD>
                  <TD className="whitespace-nowrap text-zinc-500">{timeAgo(p.created_at)}</TD>
                  <TD><Badge tone={APPROVAL[p.approval_status].tone}>{APPROVAL[p.approval_status].label}</Badge></TD>
                  <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                    <ApprovalActions p={p} busy={busy === p.id} onSet={setStatus} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="sm:max-w-lg">
          {open && (
            <>
              <div className="border-b border-zinc-100 px-6 py-5 pr-12">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{open.name ?? '—'}</DialogTitle>
                  <Badge tone={APPROVAL[open.approval_status].tone}>{APPROVAL[open.approval_status].label}</Badge>
                </div>
                <DialogDescription className="mt-1">Registado {formatDateTime(open.created_at)}</DialogDescription>
                {phoneDigits(open.phone) && (
                  <div className="mt-4 flex gap-2">
                    <a href={`tel:+${phoneDigits(open.phone)}`} className={buttonClass('default', 'sm')}><Phone /> Ligar</a>
                    <a href={`https://wa.me/${phoneDigits(open.phone)}`} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm')}><MessageCircle /> WhatsApp</a>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <dl className="divide-y divide-zinc-100">
                  <DetailRow label="Email">{open.email ?? '—'}</DetailRow>
                  <DetailRow label="Telefone">{open.phone ?? '—'}</DetailRow>
                  <DetailRow label="Tipo">{open.company_name ? `Empresa · ${open.company_name}` : 'Individual'}</DetailRow>
                  <DetailRow label="Áreas">{open.work_areas?.join(', ') || '—'}</DetailRow>
                  <DetailRow label="Especialidade">{open.specialty ?? '—'}</DetailRow>
                  <DetailRow label="Província">{open.province ?? '—'}</DetailRow>
                  <DetailRow label="Serviços concluídos">{open.jobs_done}</DetailRow>
                  {open.approval_reviewed_at && <DetailRow label="Revisto em">{formatDateTime(open.approval_reviewed_at)}</DetailRow>}
                </dl>
                {open.bio && <p className="mt-4 whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] leading-relaxed text-zinc-700">{open.bio}</p>}
              </div>
              <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">
                <ApprovalActions p={open} busy={busy === open.id} onSet={setStatus} />
              </div>
            </>
          )}
        </SheetContent>
      </Dialog>
    </>
  );
}

function ApprovalActions({ p, busy, onSet }: { p: Pro; busy: boolean; onSet: (id: string, s: Approval) => void }) {
  return (
    <div className="inline-flex gap-1.5">
      {p.approval_status !== 'approved' && (
        <Button size="sm" onClick={() => onSet(p.id, 'approved')} disabled={busy}><Check /> Aprovar</Button>
      )}
      {p.approval_status !== 'rejected' && (
        <Button size="sm" variant="outline" onClick={() => onSet(p.id, 'rejected')} disabled={busy}><X className="text-red-500" /> Rejeitar</Button>
      )}
    </div>
  );
}
