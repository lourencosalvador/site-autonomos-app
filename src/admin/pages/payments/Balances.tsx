import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { SearchInput } from '../../components/SearchInput';
import { Avatar } from '../../components/blocks';
import { Card, Skeleton } from '../../ui/card';
import { EmptyState, ErrorBanner, Pagination, Table, TBody, TD, TH, THead, TR } from '../../ui/misc';
import { rpc, useAdminQuery } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { formatMoney } from '../../lib/money';
import type { MoneyCtx, ProviderBalance } from '../../lib/types';
import { timeAgo } from '../../lib/utils';

const PAGE_SIZE = 20;

type Result = {
  total: number;
  rows: ProviderBalance[];
  totals: { earned: number; held: number; available: number; withdrawn: number; pending_withdrawals: number };
};

export function Balances({ ctx }: { ctx: MoneyCtx }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debounced = useDebounced(search);
  const q = useAdminQuery(
    () => rpc<Result>('admin_provider_balances', { p_search: debounced || null, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }),
    [debounced, page],
  );
  const m = (v?: number) => formatMoney(v ?? 0, ctx);
  const t = q.data?.totals;

  return (
    <>
      <Card className="mb-4">
        <div className="grid grid-cols-2 divide-zinc-100 sm:grid-cols-5 sm:divide-x">
          {[
            { label: 'Ganho pelos prestadores', value: t?.earned, hint: 'Líquido, depois da taxa de serviço' },
            { label: 'Retido em escrow', value: t?.held, hint: 'Serviços ainda não concluídos' },
            { label: 'Disponível para saque', value: t?.available },
            { label: 'Saques pendentes', value: t?.pending_withdrawals },
            { label: 'Já levantado', value: t?.withdrawn },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3.5 sm:px-5" title={s.hint}>
              <p className="text-xs text-zinc-500">{s.label}</p>
              {q.data ? <p className="mt-1 text-[15px] font-semibold tabular-nums text-zinc-950">{m(s.value)}</p> : <Skeleton className="mt-1.5 h-5 w-20" />}
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-4 flex justify-end">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Pesquisar prestador…" />
      </div>

      <Card>
        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
        {!q.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : q.data.rows.length === 0 ? (
          <EmptyState icon={Wallet} title="Sem saldos" description="Os prestadores aparecem aqui depois do primeiro serviço pago." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Prestador</TH>
                  <TH className="text-right">Serviços pagos</TH>
                  <TH className="text-right">Ganho</TH>
                  <TH className="text-right">Retido</TH>
                  <TH className="text-right">Disponível</TH>
                  <TH className="text-right">Pendente</TH>
                  <TH className="text-right">Levantado</TH>
                  <TH>Último pagamento</TH>
                </TR>
              </THead>
              <TBody>
                {q.data.rows.map((p) => (
                  <TR key={p.id} className="hover:bg-zinc-50/70">
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-950">{p.name ?? 'Sem nome'}</p>
                          <p className="truncate text-xs text-zinc-500">{p.phone ?? p.email ?? '—'}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums">{p.jobs}</TD>
                    <TD className="whitespace-nowrap text-right font-medium tabular-nums text-zinc-950">{m(p.earned)}</TD>
                    <TD className="whitespace-nowrap text-right tabular-nums">{m(p.held)}</TD>
                    <TD className="whitespace-nowrap text-right font-medium tabular-nums text-brand-dark">{m(p.available)}</TD>
                    <TD className="whitespace-nowrap text-right tabular-nums">{m(p.pending_withdrawals)}</TD>
                    <TD className="whitespace-nowrap text-right tabular-nums">{m(p.withdrawn)}</TD>
                    <TD className="whitespace-nowrap text-zinc-500">{p.last_paid_at ? timeAgo(p.last_paid_at) : '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
