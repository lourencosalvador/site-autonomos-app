import { useState } from 'react';
import { Check, ExternalLink, MessageCircle, Phone, Trash2, UserPlus, X } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { SearchInput } from '../components/SearchInput';
import { Avatar, ConfirmDialog, DetailRow } from '../components/blocks';
import { Card, Skeleton, StatusDot } from '../ui/card';
import { Button, buttonClass } from '../ui/button';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '../ui/dialog';
import { EmptyState, ErrorBanner, Pagination, Segmented, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { useDebounced } from '../lib/hooks';
import { APPLICATION_STATUS } from '../lib/labels';
import { useAction } from '../lib/useAction';
import type { Application, Page } from '../lib/types';
import { formatDateTime, phoneDigits, timeAgo } from '../lib/utils';

const PAGE_SIZE = 20;
type Filter = 'all' | Application['status'];

export function ApplicationsPage({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Application | null>(null);
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
                  <TR key={a.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => setSelected(a)}>
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

      <ApplicationSheet
        application={selected}
        onClose={() => setSelected(null)}
        onUpdated={(a) => { setSelected(a); refresh(); }}
        onDeleted={() => { setSelected(null); refresh(); }}
      />
    </>
  );
}

function ApplicationSheet({
  application, onClose, onUpdated, onDeleted,
}: {
  application: Application | null;
  onClose: () => void;
  onUpdated: (a: Application) => void;
  onDeleted: () => void;
}) {
  const run = useAction();
  const [confirm, setConfirm] = useState<null | 'approved' | 'rejected' | 'delete'>(null);
  const a = application;
  const wa = phoneDigits(a?.phone);

  const setStatus = async (status: Application['status'], message: string) => {
    if (!a) return;
    await run(() => rpc('admin_set_application_status', { p_id: a.id, p_status: status }), message);
    onUpdated({ ...a, status });
  };

  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg">
        {a && (
          <>
            <div className="border-b border-zinc-100 px-6 py-5 pr-12">
              <div className="flex items-center gap-3">
                <Avatar name={a.name} src={a.photo_url} className="size-12 text-sm" />
                <div className="min-w-0">
                  <DialogTitle className="truncate">{a.name}</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    <StatusDot tone={APPLICATION_STATUS[a.status]?.tone ?? 'neutral'}>{APPLICATION_STATUS[a.status]?.label ?? a.status}</StatusDot>
                  </DialogDescription>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'sm')}>
                    <MessageCircle /> WhatsApp
                  </a>
                )}
                <a href={`tel:+${wa}`} className={buttonClass('outline', 'sm')}>
                  <Phone /> Ligar
                </a>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <dl className="divide-y divide-zinc-100">
                <DetailRow label="Área">{a.work_area ?? '—'}</DetailRow>
                <DetailRow label="Especialidade">{a.specialty ?? '—'}</DetailRow>
                <DetailRow label="Experiência">{a.experience_years != null ? `${a.experience_years} anos` : '—'}</DetailRow>
                <DetailRow label="Cidade">{a.city ?? '—'}</DetailRow>
                <DetailRow label="Telefone">{a.phone}</DetailRow>
                <DetailRow label="Email">{a.email || '—'}</DetailRow>
                <DetailRow label="Recebida">{formatDateTime(a.created_at)}</DetailRow>
              </dl>

              {a.description && (
                <div className="mt-4">
                  <p className="text-[13px] text-zinc-500">Sobre o profissional</p>
                  <p className="mt-1.5 whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] leading-relaxed text-zinc-900">{a.description}</p>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <DocLink label="Fotografia" url={a.photo_url} />
                <DocLink label="Bilhete de identidade" url={a.id_document_url} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-6 py-4">
              <Button variant="ghost" size="icon-sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirm('delete')} aria-label="Apagar candidatura" title="Apagar candidatura">
                <Trash2 />
              </Button>
              <div className="flex gap-2">
                {a.status !== 'rejected' && (
                  <Button variant="outline" size="sm" onClick={() => setConfirm('rejected')}>
                    <X /> Rejeitar
                  </Button>
                )}
                {a.status !== 'approved' && (
                  <Button size="sm" onClick={() => setConfirm('approved')}>
                    <Check /> Aprovar
                  </Button>
                )}
              </div>
            </div>

            <ConfirmDialog
              open={confirm === 'approved'}
              onOpenChange={(o) => !o && setConfirm(null)}
              title={`Aprovar ${a.name}?`}
              description="O profissional passa a estar aprovado. Se o envio automático de contas estiver configurado, recebe a chave de acesso à app por SMS."
              confirmLabel="Aprovar"
              onConfirm={() => setStatus('approved', 'Candidatura aprovada.')}
            />
            <ConfirmDialog
              open={confirm === 'rejected'}
              onOpenChange={(o) => !o && setConfirm(null)}
              title={`Rejeitar ${a.name}?`}
              description="A candidatura fica marcada como rejeitada. Pode voltar a aprová-la mais tarde."
              confirmLabel="Rejeitar"
              onConfirm={() => setStatus('rejected', 'Candidatura rejeitada.')}
            />
            <ConfirmDialog
              open={confirm === 'delete'}
              onOpenChange={(o) => !o && setConfirm(null)}
              destructive
              title="Apagar candidatura?"
              description="Os dados da candidatura são apagados definitivamente."
              confirmLabel="Apagar"
              onConfirm={async () => {
                await run(() => rpc('admin_delete_application', { p_id: a.id }), 'Candidatura apagada.');
                onDeleted();
              }}
            />
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}

function DocLink({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 p-3 text-[13px] text-zinc-400">
        {label}
        <p className="text-xs">Não enviado</p>
      </div>
    );
  }
  const isPdf = /\.pdf($|\?)/i.test(url);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-lg border border-zinc-200 transition-colors hover:border-zinc-300">
      {!isPdf && <img src={url} alt={label} className="aspect-[4/3] w-full bg-zinc-50 object-cover" />}
      <div className="flex items-center justify-between px-3 py-2 text-[13px] text-zinc-700">
        {label}
        <ExternalLink className="size-3.5 text-zinc-400 group-hover:text-zinc-700" />
      </div>
    </a>
  );
}
