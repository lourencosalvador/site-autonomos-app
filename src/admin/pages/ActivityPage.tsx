import { useState } from 'react';
import { Activity, ScrollText } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { Card, Skeleton } from '../ui/card';
import { Badge } from '../ui/card';
import { Select } from '../ui/input';
import { EmptyState, ErrorBanner, Pagination, Segmented, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { actionLabel, auditDetail, EVENT_TYPES, pageLabel } from '../lib/labels';
import type { AuditEntry, Page, SiteEvent } from '../lib/types';
import { formatDateTime, timeAgo } from '../lib/utils';

const PAGE_SIZE = 25;
const DEVICE = { mobile: 'Telemóvel', tablet: 'Tablet', desktop: 'Computador' } as Record<string, string>;

export function ActivityPage() {
  const [tab, setTab] = useState<'site' | 'admin'>('site');
  return (
    <>
      <PageHeader title="Atividade" description="Cada visita e ação no site, e tudo o que os administradores fazem no painel." />
      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'site', label: 'Site' },
          { value: 'admin', label: 'Administradores' },
        ]}
      />
      {tab === 'site' ? <SiteEvents /> : <AuditLog />}
    </>
  );
}

function SiteEvents() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(0);
  const q = useAdminQuery(
    () => rpc<Page<SiteEvent>>('admin_events', { p_type: type || null, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }),
    [type, page],
    30_000,
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-4">
        <p className="text-[13px] text-zinc-500">Atualiza a cada 30 segundos.</p>
        <div className="w-48">
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(0);
            }}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos os eventos</option>
            {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </div>
      {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
      {!q.data ? (
        <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
      ) : q.data.rows.length === 0 ? (
        <EmptyState icon={Activity} title="Ainda sem eventos" description="As visitas e ações no site aparecem aqui assim que acontecerem." />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Evento</TH>
                <TH>Detalhe</TH>
                <TH>Página</TH>
                <TH>Visitante</TH>
                <TH>Dispositivo</TH>
                <TH className="text-right">Quando</TH>
              </TR>
            </THead>
            <TBody>
              {q.data.rows.map((e) => (
                <TR key={e.id} className="hover:bg-zinc-50/70">
                  <TD><Badge tone={e.type === 'page_view' ? 'neutral' : 'brand'}>{EVENT_TYPES[e.type] ?? e.type}</Badge></TD>
                  <TD className="max-w-[220px] truncate text-zinc-900">{e.label ?? (e.referrer ? `Vindo de ${hostOf(e.referrer)}` : '—')}</TD>
                  <TD>{pageLabel(e.path)}</TD>
                  <TD className="font-mono text-xs text-zinc-500">{e.visitor_id.slice(0, 8)}</TD>
                  <TD>{e.device ? DEVICE[e.device] ?? e.device : '—'}</TD>
                  <TD className="whitespace-nowrap text-right text-zinc-500" title={formatDateTime(e.created_at)}>{timeAgo(e.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
        </>
      )}
    </Card>
  );
}

function AuditLog() {
  const [page, setPage] = useState(0);
  const q = useAdminQuery(() => rpc<Page<AuditEntry>>('admin_audit_log', { p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }), [page]);

  return (
    <Card>
      {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
      {!q.data ? (
        <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
      ) : q.data.rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="Sem registos" description="As ações feitas no painel ficam registadas aqui." />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Administrador</TH>
                <TH>Ação</TH>
                <TH>Detalhe</TH>
                <TH className="text-right">Quando</TH>
              </TR>
            </THead>
            <TBody>
              {q.data.rows.map((a) => (
                <TR key={a.id} className="hover:bg-zinc-50/70">
                  <TD className="font-medium text-zinc-950">{a.admin_name ?? '—'}</TD>
                  <TD>{actionLabel(a.action)}</TD>
                  <TD className="max-w-[260px] truncate">{auditDetail(a.details) ?? '—'}</TD>
                  <TD className="whitespace-nowrap text-right text-zinc-500">{formatDateTime(a.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
        </>
      )}
    </Card>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}
