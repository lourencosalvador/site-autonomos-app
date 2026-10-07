import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { SearchInput } from '../components/SearchInput';
import { Avatar } from '../components/blocks';
import { ProfessionalProfileSheet } from '../components/ProfessionalProfile';
import { Card, Skeleton, StatusDot } from '../ui/card';
import { EmptyState, ErrorBanner, Pagination, Segmented, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { useDebounced } from '../lib/hooks';
import { APPLICATION_STATUS } from '../lib/labels';
import type { Application, Page } from '../lib/types';
import { formatDateTime, timeAgo } from '../lib/utils';

const PAGE_SIZE = 20;
type Filter = 'all' | Application['status'];

export function ApplicationsPage({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const debounced = useDebounced(search);

  const q = useAdminQuery(
    () => rpc<Page<Application>>('admin_list_applications', {
      p_status: status === 'all' ? null : status,
      p_search: debounced || null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    }),
    [status, debounced, page],
    60_000,
  );
  const counts = q.data?.counts ?? {};
  const refresh = () => {
    void q.reload();
    onChange();
  };

  return (
    <>
      <PageHeader title="Candidaturas" description="Profissionais que se registaram pelo site e aguardam validação." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={status}
          onChange={(v) => { setStatus(v); setPage(0); }}
          options={[
            { value: 'pending', label: 'Pendentes', count: counts.pending ?? 0 },
            { value: 'approved', label: 'Aprovadas', count: counts.approved ?? 0 },
            { value: 'rejected', label: 'Rejeitadas', count: counts.rejected ?? 0 },
            { value: 'all', label: 'Todas', count: Object.values(counts).reduce((a, b) => a + b, 0) },
          ]}
        />
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Pesquisar nome, área, cidade…" />
      </div>

      <Card>
        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
        {!q.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : q.data.rows.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={debounced ? 'Nenhuma candidatura encontrada' : 'Nada por aqui'}
            description={debounced ? 'Experimente outro termo de pesquisa.' : 'As candidaturas do formulário “Ser profissional” aparecem nesta lista.'}
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Profissional</TH>
                  <TH>Área</TH>
                  <TH>Cidade</TH>
                  <TH>Experiência</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Recebida</TH>
                </TR>
              </THead>
              <TBody>
                {q.data.rows.map((a) => (
                  <TR key={a.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => setSelected(a.id)}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={a.name} src={a.photo_url} />
                        <div>
                          <p className="font-medium text-zinc-950">{a.name}</p>
                          <p className="text-xs text-zinc-500">{a.phone}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="max-w-[220px]">
                      <p className="truncate text-zinc-950">{a.work_area ?? '—'}</p>
                      <p className="truncate text-xs text-zinc-500">{a.specialty}</p>
                    </TD>
                    <TD>{a.city ?? '—'}</TD>
                    <TD className="tabular-nums">{a.experience_years != null ? `${a.experience_years} ${a.experience_years === 1 ? 'ano' : 'anos'}` : '—'}</TD>
                    <TD><StatusDot tone={APPLICATION_STATUS[a.status]?.tone ?? 'neutral'}>{APPLICATION_STATUS[a.status]?.label ?? a.status}</StatusDot></TD>
                    <TD className="whitespace-nowrap text-right text-zinc-500" title={formatDateTime(a.created_at)}>{timeAgo(a.created_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <ProfessionalProfileSheet
        target={selected ? { applicationId: selected } : null}
        onClose={() => setSelected(null)}
        onStatusChange={refresh}
      />
    </>
  );
}
