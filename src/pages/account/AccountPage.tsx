import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Bell, CalendarDays, ClipboardList, Images, MapPin, Plus, Star, Wallet } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { navigate } from '../../router';
import { useCategories } from '../../hooks/useServices';
import { type ProviderReviews, providerReviews, providerWallet } from '../../lib/hub';
import { formatKz } from '../../lib/payments';
import { type Broadcast, acceptBroadcast, listOpenBroadcasts, locationLine, myBroadcasts, subscribeBroadcasts } from '../../lib/broadcasts';
import { isActive, stageLabel } from '../../lib/requestStage';
import { RequestRow } from '../../components/app/RequestRow';
import {
  Avatar, Badge, Btn, Card, CardHeader, EmptyState, Notice, PageHeader, SectionTitle, Spinner, Stat, formatDate, timeAgo,
} from '../../components/app/ui';

export function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.activeRole === 'professional' ? <ProviderHome /> : <ClientHome />;
}

function useMyRequests() {
  const [rows, setRows] = useState<Broadcast[] | null>(null);
  const load = useCallback(async () => {
    try { setRows(await myBroadcasts()); } catch { setRows((r) => r ?? []); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeBroadcasts({}, () => { void load(); }), [load]);
  return { rows, load };
}

function ClientHome() {
  const { user } = useAuth();
  const categories = useCategories();
  const { rows } = useMyRequests();
  if (!user) return null;
  const first = user.name.split(/\s+/)[0] || user.name;
  const mine = (rows ?? []).filter((r) => r.client_id === user.id);
  const active = mine.filter(isActive);
  const recent = mine.filter((r) => !isActive(r)).slice(0, 4);
  const needsAction = active.filter((r) => stageLabel(r, false).action).length;

  return (
    <>
      <PageHeader
        title={`Olá, ${first}`}
        description="Acompanhe os seus pedidos ou peça um novo serviço."
        actions={<Btn to="/conta/pedir" className="hidden sm:inline-flex"><Plus size={18} /> Novo pedido</Btn>}
      />

      {needsAction > 0 && (
        <Notice tone="warning" title={needsAction === 1 ? 'Tem 1 pedido a precisar de si' : `Tem ${needsAction} pedidos a precisar de si`} className="mb-6">
          Reveja o orçamento, faça o pagamento ou confirme a conclusão do serviço.
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Pedidos em curso" />
            {rows === null ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : active.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhum pedido em curso"
                description="Descreva o que precisa e enviamos o pedido aos profissionais verificados da área."
                action={<Btn to="/conta/pedir"><Plus size={18} /> Novo pedido</Btn>}
              />
            ) : (
              <div className="mt-3 divide-y divide-line border-t border-line">
                {active.map((r) => <RequestRow key={r.id} r={r} asProvider={false} />)}
              </div>
            )}
          </Card>

          {recent.length > 0 && (
            <Card>
              <CardHeader
                title="Histórico recente"
                action={<Btn variant="ghost" size="sm" to="/conta/servicos">Ver tudo <ArrowRight size={16} /></Btn>}
              />
              <div className="mt-3 divide-y divide-line border-t border-line">
                {recent.map((r) => <RequestRow key={r.id} r={r} asProvider={false} />)}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">Pedir um serviço</h2>
            <p className="mt-1 text-[15px] text-ink-500">Escolha uma categoria para começar.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.slice(0, 8).map((c) => (
                <button
                  key={c}
                  onClick={() => navigate(`/conta/pedir?categoria=${encodeURIComponent(c)}`)}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-dark/30 hover:bg-cloud-50 hover:text-ink-900"
                >
                  {c}
                </button>
              ))}
            </div>
            <Btn variant="outline" className="mt-4 w-full" to="/conta/pedir">Todas as categorias</Btn>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">Como funciona</h2>
            <ol className="mt-4 space-y-4">
              {[
                ['Descreva o que precisa', 'O pedido chega aos profissionais verificados da área.'],
                ['Um profissional aceita', 'Pode conversar e ligar-lhe diretamente.'],
                ['Recebe o orçamento', 'Só avança se concordar com o valor.'],
                ['Paga com segurança', 'O valor fica retido até confirmar que o serviço está feito.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cloud-200 text-sm font-semibold text-ink-700">{i + 1}</span>
                  <div>
                    <p className="text-[15px] font-semibold text-ink-900">{t}</p>
                    <p className="text-sm leading-relaxed text-ink-500">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function ProviderHome() {
  const { user } = useAuth();
  const { success, info, error: toastError } = useToast();
  const approved = user?.approvalStatus === 'approved';
  const { rows: mine } = useMyRequests();
  const [jobs, setJobs] = useState<Broadcast[] | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ProviderReviews | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const loadJobs = useCallback(async () => {
    if (!approved) { setJobs([]); return; }
    try { setJobs(await listOpenBroadcasts()); } catch { setJobs((j) => j ?? []); }
  }, [approved]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);
  useEffect(() => {
    if (!approved) return;
    const off = subscribeBroadcasts({}, () => { void loadJobs(); });
    const poll = setInterval(() => { void loadJobs(); }, 5000);
    return () => { off(); clearInterval(poll); };
  }, [approved, loadJobs]);
  useEffect(() => {
    if (!approved) return;
    providerReviews().then(setReviews).catch(() => {});
    providerWallet().then((w) => setBalance(Number(w.due_minor) || 0)).catch(() => {});
  }, [approved]);

  if (!user) return null;
  const first = user.name.split(/\s+/)[0] || user.name;
  const current = (mine ?? []).filter((r) => r.status === 'accepted' && r.provider_id === user.id);

  const accept = async (id: string) => {
    if (accepting) return;
    setAccepting(id);
    try {
      const row = await acceptBroadcast(id);
      if (row) { success('Pedido aceite', 'Envie o orçamento ao cliente.'); navigate(`/conta/pedido/${id}`); }
      else { info('Pedido indisponível', 'Outro profissional já aceitou este pedido.'); await loadJobs(); }
    } catch (e) {
      toastError('Não foi possível aceitar', e instanceof Error ? e.message : undefined);
    } finally { setAccepting(null); }
  };

  return (
    <>
      <PageHeader
        title={`Olá, ${first}`}
        description={user.workAreas.length ? user.workAreas.join(' · ') : 'Defina as suas áreas de atuação nas definições.'}
      />

      {user.approvalStatus === 'pending' && (
        <Notice tone="warning" title="Perfil em verificação" className="mb-6">
          Pode explorar a sua conta e preparar o catálogo. Os pedidos e a carteira ficam disponíveis assim que a nossa equipa aprovar o seu perfil.
        </Notice>
      )}
      {user.approvalStatus === 'rejected' && (
        <Notice tone="danger" title="Perfil não aprovado" className="mb-6">
          O seu perfil não foi aprovado. Fale connosco para rever a situação.
        </Notice>
      )}

      {approved && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat label="Disponíveis" value={jobs?.length ?? '—'} hint="nas suas áreas" icon={Bell} />
          <Stat label="Em curso" value={current.length} hint="aceites por si" icon={ClipboardList} />
          <Stat label="A receber" value={balance === null ? '—' : formatKz(balance)} hint="pagamentos confirmados" icon={Wallet} />
          <Stat label="Avaliação" value={reviews?.count ? reviews.average.toFixed(1) : '—'} hint={reviews?.count ? `${reviews.count} avaliaç${reviews.count === 1 ? 'ão' : 'ões'}` : 'sem avaliações'} icon={Star} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <SectionTitle action={approved ? <span className="flex items-center gap-2 text-sm font-medium text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Ao vivo</span> : undefined}>
              Pedidos disponíveis
            </SectionTitle>
            {!approved ? (
              <Card><EmptyState icon={Bell} title="Disponível após aprovação" description="Assim que o seu perfil for aprovado, os pedidos das suas áreas aparecem aqui em tempo real." /></Card>
            ) : jobs === null ? (
              <Card className="flex justify-center py-10"><Spinner /></Card>
            ) : jobs.length === 0 ? (
              <Card><EmptyState icon={Bell} title="Sem pedidos de momento" description="Quando um cliente pedir um serviço nas suas áreas, aparece aqui de imediato." /></Card>
            ) : (
              <div className="space-y-3">
                {jobs.map((j) => <JobCard key={j.id} job={j} busy={accepting === j.id} disabled={!!accepting} onAccept={() => accept(j.id)} />)}
              </div>
            )}
          </section>

          {current.length > 0 && (
            <Card>
              <CardHeader title="Em curso" description="Os serviços que aceitou." />
              <div className="mt-3 divide-y divide-line border-t border-line">
                {current.map((r) => <RequestRow key={r.id} r={r} asProvider />)}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-ink-900">Avaliações</h2>
              {reviews?.count ? <span className="flex items-center gap-1 text-[15px] font-semibold text-ink-900"><Star size={16} className="fill-amber-400 text-amber-400" /> {reviews.average.toFixed(1)}</span> : null}
            </div>
            {!reviews || reviews.count === 0 ? (
              <p className="mt-2 text-[15px] text-ink-500">As avaliações dos clientes aparecem aqui depois de concluir serviços.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {reviews.items.slice(0, 4).map((r, i) => (
                  <li key={i} className="border-t border-line pt-4 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[15px] font-semibold text-ink-900">{r.client_name || 'Cliente'}</p>
                      <span className="flex shrink-0 gap-0.5">
                        {Array.from({ length: 5 }).map((_, s) => <Star key={s} size={14} className={s < r.rating ? 'fill-amber-400 text-amber-400' : 'text-cloud-300'} />)}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm leading-relaxed text-ink-500">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cloud-100 text-brand-dark"><Images size={20} /></div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink-900">O seu portfólio</h2>
            <p className="mt-1 text-[15px] text-ink-500">Fotos dos seus trabalhos ajudam os clientes a confiar em si.</p>
            <Btn variant="outline" className="mt-4 w-full" to="/conta/perfil?tab=portfolio">Gerir portfólio</Btn>
          </Card>
        </div>
      </div>
    </>
  );
}

function JobCard({ job, busy, disabled, onAccept }: { job: Broadcast; busy: boolean; disabled: boolean; onAccept: () => void }) {
  const when = [formatDate(job.service_date), job.service_time].filter(Boolean).join(', ');
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{job.category}</Badge>
          <span className="text-sm text-ink-400">{timeAgo(job.created_at)}</span>
        </div>
      </div>
      <p className="mt-3 text-base leading-relaxed text-ink-800">{job.description}</p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[15px] text-ink-500">
        {locationLine(job) && <span className="inline-flex items-center gap-1.5"><MapPin size={16} className="text-ink-400" /> {locationLine(job)}</span>}
        {when && <span className="inline-flex items-center gap-1.5"><CalendarDays size={16} className="text-ink-400" /> {when}</span>}
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar name={job.client?.name} src={job.client?.avatar_url} size="sm" />
          <span className="text-[15px] font-medium text-ink-700">{job.client?.name || 'Cliente'}</span>
        </div>
        <Btn onClick={onAccept} loading={busy} disabled={disabled && !busy} className="w-full sm:w-auto">
          {busy ? 'A aceitar…' : 'Aceitar pedido'}
        </Btn>
      </div>
    </Card>
  );
}
