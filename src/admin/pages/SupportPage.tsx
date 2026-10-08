import { useState } from 'react';
import { LifeBuoy, Loader2, RefreshCw, Search, UserCheck, UserX } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { Card, Skeleton } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { EmptyState, ErrorBanner } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { timeAgo } from '../lib/utils';

type SupportItem = {
  id: string;
  category: string;
  description: string;
  city: string | null;
  service_date: string | null;
  created_at: string;
  waited_seconds: number;
  client_name: string | null;
  client_phone: string | null;
};
type ProviderHit = { id: string; name: string | null; work_area: string | null };

export function SupportPage({ onChange }: { onChange?: () => void }) {
  const q = useAdminQuery(() => rpc<SupportItem[]>('admin_support_queue', { p_limit: 200 }), [], 20_000);
  const rows = q.data ?? [];

  const refresh = () => { q.reload(); onChange?.(); };

  return (
    <>
      <PageHeader
        title="Apoio ao cliente"
        description="Pedidos que passaram do tempo de espera sem nenhum prestador aceitar. Vincule um prestador ou marque como sem prestadores."
      />

      <Card className="mb-4">
        <div className="flex items-center justify-between p-4">
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <LifeBuoy className="size-4 text-zinc-400" /> {rows.length} pedido(s) por tratar · atualiza a cada 20s
          </p>
          <Button variant="outline" size="sm" onClick={refresh} disabled={q.loading}>
            <RefreshCw className={q.loading ? 'animate-spin' : ''} /> Atualizar
          </Button>
        </div>
      </Card>

      {q.error && <ErrorBanner message={q.error} onRetry={q.reload} />}

      {q.loading && !q.data ? (
        <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={LifeBuoy} title="Tudo em dia" description="Nenhum pedido à espera de apoio." /></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((item) => <SupportCard key={item.id} item={item} onDone={refresh} />)}
        </div>
      )}
    </>
  );
}

function SupportCard({ item, onDone }: { item: SupportItem; onDone: () => void }) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ProviderHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const waitedMin = Math.floor(item.waited_seconds / 60);

  const search = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) { setHits(null); return; }
    setSearching(true);
    try { setHits(await rpc<ProviderHit[]>('admin_search_providers', { p_query: value.trim() })); }
    finally { setSearching(false); }
  };

  const assign = async (providerId: string) => {
    setBusy(true);
    try { await rpc('admin_assign_provider', { p_broadcast: item.id, p_provider: providerId }); onDone(); }
    catch { setBusy(false); }
  };

  const markNone = async () => {
    setBusy(true);
    try { await rpc('admin_mark_no_providers', { p_broadcast: item.id }); onDone(); }
    catch { setBusy(false); }
  };

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">{item.category}</span>
              <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">sem resposta · {waitedMin}m</span>
            </div>
            <p className="mt-2 text-sm text-zinc-700">{item.description}</p>
            <p className="mt-1.5 text-[13px] text-zinc-500">
              <strong className="text-zinc-700">{item.client_name ?? 'Cliente'}</strong>
              {item.client_phone ? ` · ${item.client_phone}` : ''}
              {item.city ? ` · ${item.city}` : ''} · {timeAgo(item.created_at)}
            </p>
          </div>
        </div>

        {/* Vincular prestador */}
        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-zinc-700"><UserCheck className="size-4 text-zinc-400" /> Vincular um prestador</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input value={query} onChange={(e) => search(e.target.value)} placeholder="Procurar por nome ou área…" className="pl-8" disabled={busy} />
          </div>
          {searching && <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400"><Loader2 className="size-3 animate-spin" /> A procurar…</p>}
          {hits && hits.length === 0 && query.trim().length >= 2 && !searching && (
            <p className="mt-2 text-xs text-zinc-400">Sem prestadores aprovados para "{query}".</p>
          )}
          {hits && hits.length > 0 && (
            <div className="mt-2 space-y-1">
              {hits.map((h) => (
                <button key={h.id} onClick={() => assign(h.id)} disabled={busy}
                  className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60">
                  <span><span className="font-medium text-zinc-900">{h.name}</span> <span className="text-zinc-400">· {h.work_area ?? '—'}</span></span>
                  <span className="text-[12px] font-semibold text-emerald-600">Vincular</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={markNone} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <UserX className="text-red-500" />} Marcar sem prestadores
          </Button>
        </div>
      </div>
    </Card>
  );
}
