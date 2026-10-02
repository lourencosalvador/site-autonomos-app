import { useState } from 'react';
import { ClipboardList, FileText, Mail, MessageCircle, Phone, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { SearchInput } from '../components/SearchInput';
import { ConfirmDialog, DetailRow } from '../components/blocks';
import { Card, Skeleton, StatusDot } from '../ui/card';
import { Button, buttonClass } from '../ui/button';
import { Select } from '../ui/input';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '../ui/dialog';
import { EmptyState, ErrorBanner, Pagination, Segmented, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { useDebounced } from '../lib/hooks';
import { REQUEST_STATUS } from '../lib/labels';
import { useAction } from '../lib/useAction';
import type { Page, SiteRequest } from '../lib/types';
import { formatDate, formatDateTime, phoneDigits, timeAgo } from '../lib/utils';

const PAGE_SIZE = 20;
type StatusFilter = 'all' | SiteRequest['status'];

export function RequestsPage({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<StatusFilter>('novo');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<SiteRequest | null>(null);
  const debounced = useDebounced(search);

  const q = useAdminQuery(
    () => rpc<Page<SiteRequest>>('admin_list_site_requests', {
      p_status: status === 'all' ? null : status,
      p_search: debounced || null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    }),
    [status, debounced, page],
    60_000,
  );
  const counts = q.data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const refresh = () => {
    void q.reload();
    onChange();
  };

  return (
    <>
      <PageHeader title="Pedidos do site" description="Pedidos enviados pelo formulário “Solicitar serviço”." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="overflow-x-auto">
          <Segmented
            value={status}
            onChange={(v) => { setStatus(v); setPage(0); }}
            options={[
              { value: 'novo', label: 'Novos', count: counts.novo ?? 0 },
              { value: 'em_contacto', label: 'Em contacto', count: counts.em_contacto ?? 0 },
              { value: 'agendado', label: 'Agendados', count: counts.agendado ?? 0 },
              { value: 'concluido', label: 'Concluídos', count: counts.concluido ?? 0 },
              { value: 'cancelado', label: 'Cancelados', count: counts.cancelado ?? 0 },
              { value: 'all', label: 'Todos', count: total },
            ]}
          />
        </div>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Pesquisar nome, telefone, serviço…" />
      </div>

      <Card>
        {q.error && <div className="p-4"><ErrorBanner message={q.error} onRetry={() => void q.reload()} /></div>}
        {!q.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : q.data.rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={debounced ? 'Nenhum pedido encontrado' : 'Sem pedidos aqui'}
            description={debounced ? 'Experimente outro termo de pesquisa.' : 'Quando alguém pedir um serviço pelo site, aparece nesta lista.'}
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Serviço</TH>
                  <TH>Data desejada</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Recebido</TH>
                </TR>
              </THead>
              <TBody>
                {q.data.rows.map((r) => (
                  <TR key={r.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => setSelected(r)}>
                    <TD>
                      <p className="font-medium text-zinc-950">{r.nome}</p>
                      <p className="text-xs text-zinc-500">{r.telefone}</p>
                    </TD>
                    <TD className="max-w-[280px]">
                      <p className="truncate text-zinc-950">{r.categoria}</p>
                      <p className="truncate text-xs text-zinc-500">{r.servico}</p>
                    </TD>
                    <TD className="whitespace-nowrap">{r.data_desejada ? formatDate(r.data_desejada) : '—'}</TD>
                    <TD><StatusDot tone={REQUEST_STATUS[r.status]?.tone ?? 'neutral'}>{REQUEST_STATUS[r.status]?.label ?? r.status}</StatusDot></TD>
                    <TD className="whitespace-nowrap text-right text-zinc-500" title={formatDateTime(r.created_at)}>{timeAgo(r.created_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <RequestSheet
        request={selected}
        onClose={() => setSelected(null)}
        onUpdated={(r) => { setSelected(r); refresh(); }}
        onDeleted={() => { setSelected(null); refresh(); }}
      />
    </>
  );
}

function RequestSheet({
  request, onClose, onUpdated, onDeleted,
}: {
  request: SiteRequest | null;
  onClose: () => void;
  onUpdated: (r: SiteRequest) => void;
  onDeleted: () => void;
}) {
  const run = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const r = request;
  const wa = phoneDigits(r?.telefone);

  const changeStatus = async (status: SiteRequest['status']) => {
    if (!r) return;
    setSaving(true);
    try {
      await run(() => rpc('admin_update_site_request', { p_id: r.id, p_status: status }), 'Estado atualizado.');
      onUpdated({ ...r, status });
    } catch {
      // erro já mostrado
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!r} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg">
        {r && (
          <>
            <div className="border-b border-zinc-100 px-6 py-5 pr-12">
              <DialogTitle>{r.nome}</DialogTitle>
              <DialogDescription className="mt-1">Pedido recebido {formatDateTime(r.created_at)}</DialogDescription>
              <div className="mt-4 flex flex-wrap gap-2">
                {wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={buttonClass('default', 'sm')}>
                    <MessageCircle /> WhatsApp
                  </a>
                )}
                <a href={`tel:+${wa}`} className={buttonClass('outline', 'sm')}>
                  <Phone /> Ligar
                </a>
                {r.email && (
                  <a href={`mailto:${r.email}`} className={buttonClass('outline', 'sm')}>
                    <Mail /> Email
                  </a>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[13px] text-zinc-500">Estado</span>
                <div className="w-44">
                  <Select value={r.status} disabled={saving} onChange={(e) => void changeStatus(e.target.value as SiteRequest['status'])}>
                    {Object.entries(REQUEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </Select>
                </div>
              </div>

              <dl className="divide-y divide-zinc-100">
                <DetailRow label="Categoria">{r.categoria}</DetailRow>
                <DetailRow label="Serviço">{r.servico}</DetailRow>
                <DetailRow label="Telefone">{r.telefone}</DetailRow>
                <DetailRow label="Email">{r.email || '—'}</DetailRow>
                <DetailRow label="Endereço">{r.endereco}</DetailRow>
                <DetailRow label="Data desejada">{r.data_desejada ? formatDate(r.data_desejada) : 'Sem preferência'}</DetailRow>
                <DetailRow label="Horário">{r.horario_preferencial || 'Sem preferência'}</DetailRow>
              </dl>

              <div className="mt-4">
                <p className="text-[13px] text-zinc-500">Descrição</p>
                <p className="mt-1.5 whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] leading-relaxed text-zinc-900">{r.descricao}</p>
              </div>

              {r.anexos?.length > 0 && (
                <div className="mt-5">
                  <p className="text-[13px] text-zinc-500">Anexos ({r.anexos.length})</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {r.anexos.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="group block aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                        {/\.pdf($|\?)/i.test(url) ? (
                          <span className="flex size-full flex-col items-center justify-center gap-1 text-xs text-zinc-500">
                            <FileText className="size-5" /> PDF
                          </span>
                        ) : (
                          <img src={url} alt="Anexo" className="size-full object-cover transition-transform group-hover:scale-105" />
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-zinc-100 px-6 py-4">
              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Apagar pedido
              </Button>
            </div>

            <ConfirmDialog
              open={confirmDelete}
              onOpenChange={setConfirmDelete}
              destructive
              title="Apagar este pedido?"
              description={<>O pedido de <b className="text-zinc-900">{r.nome}</b> é apagado definitivamente. Para o arquivar, mude o estado para “Concluído” ou “Cancelado”.</>}
              confirmLabel="Apagar"
              onConfirm={async () => {
                await run(() => rpc('admin_delete_site_request', { p_id: r.id }), 'Pedido apagado.');
                onDeleted();
              }}
            />
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}
