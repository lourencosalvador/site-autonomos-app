import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Briefcase, Check, Clock, ExternalLink, FileText, Image as ImageIcon, Loader2, MessageCircle,
  Phone, RefreshCw, Repeat, Send, Star, Trash2, UserCheck, Users, Wallet, X,
} from 'lucide-react';
import { SheetContent, Dialog, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge, Card, Skeleton, StatusDot } from '../ui/card';
import { Button, buttonClass } from '../ui/button';
import { Textarea } from '../ui/input';
import { Segmented, EmptyState, ErrorBanner } from '../ui/misc';
import { Avatar, ConfirmDialog, DetailRow } from './blocks';
import { CHART_COLORS } from './charts';
import { rpc, useAdminQuery } from '../lib/api';
import { useAction } from '../lib/useAction';
import { APPLICATION_STATUS, APP_REQUEST_STATUS } from '../lib/labels';
import { formatMoney } from '../lib/money';
import { cn, formatDate, formatDateTime, formatNumber, initials, phoneDigits, timeAgo } from '../lib/utils';
import type { MoneyCtx, ProfessionalProfile as Profile, ProfJob, ProfReview } from '../lib/types';

type Tab = 'overview' | 'jobs' | 'reviews' | 'catalog' | 'finance' | 'notes';
type Target = { applicationId?: string; userId?: string; name?: string };

const JOB_TONE: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning', accepted: 'brand', completed: 'success', rejected: 'danger', cancelled: 'neutral',
};

export function ProfessionalProfileSheet({
  target, onClose, onStatusChange,
}: {
  target: Target | null;
  onClose: () => void;
  /** Chamado quando a candidatura muda de estado (para a lista recarregar). */
  onStatusChange?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [version, setVersion] = useState(0);
  const q = useAdminQuery(
    () => (target
      ? rpc<Profile>('admin_professional_profile', { p_application_id: target.applicationId ?? null, p_user_id: target.userId ?? null })
      : Promise.resolve(null)),
    [target?.applicationId, target?.userId, version],
  );
  const d = q.data;
  const ctx: MoneyCtx = { currency: 'AOA', factor: d?.factor ?? 100 };

  useEffect(() => setTab('overview'), [target?.applicationId, target?.userId]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const app = d?.application;
  const acc = d?.account;
  const name = app?.name ?? acc?.name ?? target?.name ?? 'Profissional';
  const avatar = app?.photo_url ?? acc?.avatar_url ?? null;

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'jobs', label: 'Trabalhos', count: d?.stats.jobs_total },
    { value: 'reviews', label: 'Avaliações', count: d?.stats.reviews_count },
    { value: 'catalog', label: 'Catálogo', count: (d?.stats.posts ?? 0) + (d?.stats.stories ?? 0) },
    { value: 'finance', label: 'Finanças' },
    { value: 'notes', label: 'Notas', count: d?.notes.length },
  ];

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-3xl" aria-describedby={undefined}>
        {!d ? (
          <div className="space-y-4 p-6">
            <DialogTitle className="sr-only">A carregar perfil</DialogTitle>
            {q.error ? <ErrorBanner message={q.error} onRetry={reload} /> : (
              <>
                <div className="flex items-center gap-3"><Skeleton className="size-14 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-24" /></div></div>
                <Skeleton className="h-24" /><Skeleton className="h-40" />
              </>
            )}
          </div>
        ) : (
          <>
            <Header profile={d} name={name} avatar={avatar} onReload={reload} onStatusChange={() => { reload(); onStatusChange?.(); }} />

            <div className="border-b border-zinc-100 px-4 sm:px-6">
              <div className="-mb-px overflow-x-auto">
                <Segmented value={tab} onChange={setTab} options={tabs} className="my-3" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-50/40 px-4 py-5 sm:px-6">
              {tab === 'overview' && <Overview profile={d} ctx={ctx} />}
              {tab === 'jobs' && <Jobs jobs={d.jobs ?? []} ctx={ctx} />}
              {tab === 'reviews' && <Reviews profile={d} />}
              {tab === 'catalog' && <Catalog profile={d} />}
              {tab === 'finance' && <Finance profile={d} ctx={ctx} />}
              {tab === 'notes' && <Notes profile={d} onChanged={reload} />}
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}

/* ---------------- Cabeçalho ---------------- */

function Header({ profile, name, avatar, onReload, onStatusChange }: {
  profile: Profile; name: string; avatar: string | null; onReload: () => void; onStatusChange: () => void;
}) {
  const run = useAction();
  const app = profile.application;
  const acc = profile.account;
  const [confirm, setConfirm] = useState<null | 'approved' | 'rejected'>(null);
  const wa = phoneDigits(app?.phone ?? acc?.phone ?? acc?.auth_phone);
  const st = app ? APPLICATION_STATUS[app.status] : null;

  const setStatus = async (status: 'approved' | 'rejected', msg: string) => {
    if (!app) return;
    await run(() => rpc('admin_set_application_status', { p_id: app.id, p_status: status }), msg);
    onStatusChange();
  };

  return (
    <div className="border-b border-zinc-200 px-4 py-5 pr-12 sm:px-6">
      <div className="flex items-start gap-4">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-zinc-100 text-base font-semibold text-zinc-600">
          {avatar ? <img src={avatar} alt="" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center">{initials(name)}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-lg">{name}</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {st && <StatusDot tone={st.tone}>{st.label}</StatusDot>}
              {acc ? (
                <Badge tone={acc.suspended ? 'danger' : 'success'}>{acc.suspended ? 'Conta suspensa' : 'Conta ativa na app'}</Badge>
              ) : (
                <Badge tone="neutral">Sem conta na app</Badge>
              )}
              {app?.work_area && <span className="text-[13px] text-zinc-500">{app.work_area}</span>}
            </div>
          </DialogDescription>
        </div>
        <button type="button" onClick={onReload} className="hidden rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 sm:block" title="Atualizar" aria-label="Atualizar">
          <RefreshCw className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={buttonClass('default', 'sm')}>
            <MessageCircle /> WhatsApp
          </a>
        )}
        {wa && <a href={`tel:+${wa}`} className={buttonClass('outline', 'sm')}><Phone /> Ligar</a>}
        {acc && (
          <a href={`#/admin/utilizadores`} className={buttonClass('outline', 'sm')} title="Abrir na gestão de utilizadores">
            <ExternalLink /> Ver conta
          </a>
        )}
        <div className="ml-auto flex gap-2">
          {app && app.status !== 'rejected' && <Button variant="outline" size="sm" onClick={() => setConfirm('rejected')}><X /> Rejeitar</Button>}
          {app && app.status !== 'approved' && <Button size="sm" onClick={() => setConfirm('approved')}><Check /> Aprovar</Button>}
        </div>
      </div>

      {app && (
        <ConfirmDialog
          open={confirm === 'approved'} onOpenChange={(o) => !o && setConfirm(null)}
          title={`Aprovar ${name}?`}
          description="O profissional passa a estar aprovado. Se o envio automático de contas estiver configurado, recebe a chave de acesso à app por SMS."
          confirmLabel="Aprovar" onConfirm={() => setStatus('approved', 'Candidatura aprovada.')}
        />
      )}
      {app && (
        <ConfirmDialog
          open={confirm === 'rejected'} onOpenChange={(o) => !o && setConfirm(null)}
          title={`Rejeitar ${name}?`} description="A candidatura fica marcada como rejeitada. Pode voltar a aprová-la mais tarde."
          confirmLabel="Rejeitar" onConfirm={() => setStatus('rejected', 'Candidatura rejeitada.')}
        />
      )}
    </div>
  );
}

/* ---------------- Visão geral ---------------- */

function Overview({ profile, ctx }: { profile: Profile; ctx: MoneyCtx }) {
  const s = profile.stats;
  const app = profile.application;
  const acc = profile.account;
  const rating = s.rating_avg != null ? Number(s.rating_avg) : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Briefcase} label="Trabalhos" value={formatNumber(s.jobs_total ?? 0)} hint={`${formatNumber(s.jobs_completed ?? 0)} concluídos`} />
        <Stat icon={Star} label="Avaliação" value={rating != null ? rating.toLocaleString('pt-PT') : '—'} hint={`${formatNumber(s.reviews_count ?? 0)} avaliações`} accent={rating != null} />
        <Stat icon={Users} label="Clientes" value={formatNumber(s.clients ?? 0)} hint={`${formatNumber(s.repeat_clients ?? 0)} recorrentes`} />
        <Stat icon={Clock} label="Resposta média" value={s.avg_response_hours != null ? `${Number(s.avg_response_hours).toLocaleString('pt-PT')} h` : '—'} hint="até aceitar" />
      </div>

      {(s.jobs_total ?? 0) > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
            <h4 className="text-sm font-semibold text-zinc-950">Resumo dos trabalhos</h4>
            {s.last_job_at && <span className="text-xs text-zinc-500">último {timeAgo(s.last_job_at)}</span>}
          </div>
          <div className="grid grid-cols-2 divide-zinc-100 sm:grid-cols-5 sm:divide-x">
            {[
              { label: 'Concluídos', value: s.jobs_completed, tone: 'text-emerald-600' },
              { label: 'A decorrer', value: s.jobs_accepted, tone: 'text-brand-dark' },
              { label: 'Pendentes', value: s.jobs_pending, tone: 'text-amber-600' },
              { label: 'Recusados', value: s.jobs_rejected, tone: 'text-zinc-500' },
              { label: 'Cancelados', value: s.jobs_cancelled, tone: 'text-zinc-500' },
            ].map((x) => (
              <div key={x.label} className="px-4 py-3">
                <p className={cn('text-xl font-semibold tabular-nums', x.tone)}>{formatNumber(x.value ?? 0)}</p>
                <p className="text-xs text-zinc-500">{x.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {profile.monthly && profile.monthly.some((m) => m.jobs > 0) && (
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-zinc-950">Atividade dos últimos 12 meses</h4>
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={profile.monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={34} />
                <Tooltip
                  cursor={{ fill: '#fafafa' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as NonNullable<Profile['monthly']>[number];
                    return (
                      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
                        <p className="mb-1 font-medium text-zinc-950">{monthLabel(row.month)}</p>
                        <p className="text-zinc-600">{row.jobs} {row.jobs === 1 ? 'trabalho' : 'trabalhos'} · {row.completed} concluídos</p>
                        {row.earned > 0 && <p className="text-zinc-600">{formatMoney(row.earned, ctx)}</p>}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="jobs" fill={CHART_COLORS.dark} radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" fill={CHART_COLORS.cyan} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {app && (
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-zinc-950">Candidatura</h4>
            <dl className="mt-2 divide-y divide-zinc-100">
              <DetailRow label="Área">{app.work_area ?? '—'}</DetailRow>
              <DetailRow label="Especialidade">{app.specialty ?? '—'}</DetailRow>
              <DetailRow label="Experiência">{app.experience_years != null ? `${app.experience_years} anos` : '—'}</DetailRow>
              <DetailRow label="Cidade">{app.city ?? '—'}</DetailRow>
              <DetailRow label="Telefone">{app.phone}</DetailRow>
              <DetailRow label="Email">{app.email || '—'}</DetailRow>
              <DetailRow label="Recebida">{formatDate(app.created_at)}</DetailRow>
            </dl>
            {app.description && <p className="mt-3 whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] leading-relaxed text-zinc-700">{app.description}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <DocLink label="Fotografia" url={app.photo_url} />
              <DocLink label="Bilhete de identidade" url={app.id_document_url} />
            </div>
            {profile.other_applications.length > 0 && (
              <p className="mt-3 text-xs text-zinc-500">
                Esta pessoa tem {profile.other_applications.length} {profile.other_applications.length === 1 ? 'outra candidatura' : 'outras candidaturas'} ({profile.other_applications.map((o) => APPLICATION_STATUS[o.status]?.label ?? o.status).join(', ')}).
              </p>
            )}
          </Card>
        )}

        <Card className="p-5">
          <h4 className="text-sm font-semibold text-zinc-950">Conta na app</h4>
          {acc ? (
            <>
              <dl className="mt-2 divide-y divide-zinc-100">
                <DetailRow label="Nome">{acc.name ?? '—'}</DetailRow>
                <DetailRow label="Email">{acc.email ?? '—'}</DetailRow>
                <DetailRow label="Telefone">{acc.phone ?? acc.auth_phone ?? '—'}</DetailRow>
                {typeof acc.province === 'string' && acc.province && <DetailRow label="Província">{acc.province}</DetailRow>}
                <DetailRow label="Registo">{formatDate(acc.created_at)}</DetailRow>
                <DetailRow label="Último acesso">{acc.last_sign_in_at ? timeAgo(acc.last_sign_in_at) : 'Nunca'}</DetailRow>
                <DetailRow label="Ligada por">{linkLabel(profile.link)}</DetailRow>
              </dl>
              {typeof acc.bio === 'string' && acc.bio && <p className="mt-3 whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[13px] leading-relaxed text-zinc-700">{acc.bio}</p>}
            </>
          ) : (
            <div className="mt-2 rounded-lg border border-dashed border-zinc-200 p-4 text-[13px] text-zinc-500">
              Ainda sem conta na app. É criada quando a candidatura for aprovada e o profissional ativar o acesso.
            </div>
          )}
        </Card>
      </div>

      {profile.timeline.length > 0 && (
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-zinc-950">Linha temporal</h4>
          <ol className="mt-3 space-y-3 border-l border-zinc-200 pl-4">
            {profile.timeline.map((e, i) => (
              <li key={i} className="relative text-[13px]">
                <span className="absolute -left-[21px] top-1 size-2 rounded-full border-2 border-white bg-zinc-300" />
                <p className="text-zinc-900">{e.title}{e.detail ? <span className="text-zinc-500"> · {e.detail}</span> : null}</p>
                <p className="text-xs text-zinc-400">{formatDateTime(e.at)}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <Icon className="size-4 text-zinc-400" />
      </div>
      <p className={cn('mt-1.5 flex items-center gap-1 text-xl font-semibold tabular-nums', accent ? 'text-zinc-950' : 'text-zinc-950')}>
        {value}{accent && <Star className="size-3.5 fill-brand-cyan2 text-brand-cyan2" />}
      </p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </Card>
  );
}

/* ---------------- Trabalhos ---------------- */

function Jobs({ jobs, ctx }: { jobs: ProfJob[]; ctx: MoneyCtx }) {
  const [filter, setFilter] = useState<string>('all');
  if (jobs.length === 0) return <EmptyState icon={Briefcase} title="Sem trabalhos" description="Ainda não recebeu nenhum pedido na app." />;
  const counts = jobs.reduce<Record<string, number>>((acc, j) => ({ ...acc, [j.status]: (acc[j.status] ?? 0) + 1 }), {});
  const shown = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Segmented
          value={filter} onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos', count: jobs.length },
            { value: 'completed', label: 'Concluídos', count: counts.completed ?? 0 },
            { value: 'accepted', label: 'A decorrer', count: counts.accepted ?? 0 },
            { value: 'pending', label: 'Pendentes', count: counts.pending ?? 0 },
            { value: 'rejected', label: 'Recusados', count: counts.rejected ?? 0 },
            { value: 'cancelled', label: 'Cancelados', count: counts.cancelled ?? 0 },
          ].filter((o) => o.value === 'all' || (counts[o.value] ?? 0) > 0)}
        />
      </div>
      <ul className="space-y-2.5">
        {shown.map((j) => (
          <li key={j.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-950">{j.service ?? 'Serviço'}</p>
                    {j.is_urgent && <Badge tone="danger">Urgente</Badge>}
                    {j.is_multi_day && <Badge tone="outline">Vários dias</Badge>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-zinc-500">
                    {j.client.name ?? 'Cliente'}{j.location ? ` · ${j.location}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusDot tone={JOB_TONE[j.status] ?? 'neutral'}>{APP_REQUEST_STATUS[j.status] ?? j.status}</StatusDot>
                  {j.provider_net != null && <p className="mt-1 text-[13px] font-medium tabular-nums text-zinc-950">{formatMoney(j.provider_net, ctx)}</p>}
                </div>
              </div>
              {j.description && <p className="mt-2 line-clamp-2 text-[13px] text-zinc-600">{j.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span>Pedido {formatDate(j.created_at)}</span>
                {j.completed_at && <span>Concluído {formatDate(j.completed_at)}</span>}
                {j.rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-zinc-600">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn('size-3', i < j.rating! ? 'fill-brand-cyan2 text-brand-cyan2' : 'text-zinc-200')} />)}
                  </span>
                )}
                {j.escrow_status && <span>Escrow: {j.escrow_status}</span>}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Avaliações ---------------- */

function Reviews({ profile }: { profile: Profile }) {
  const reviews = profile.reviews ?? [];
  const s = profile.stats;
  const dist = s.rating_dist ?? {};
  const total = s.reviews_count ?? 0;
  if (total === 0) return <EmptyState icon={Star} title="Sem avaliações" description="Ainda não recebeu avaliações de clientes." />;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-semibold tabular-nums text-zinc-950">{Number(s.rating_avg ?? 0).toLocaleString('pt-PT')}</p>
            <div className="mt-1 flex justify-center">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn('size-4', i < Math.round(Number(s.rating_avg ?? 0)) ? 'fill-brand-cyan2 text-brand-cyan2' : 'text-zinc-200')} />)}
            </div>
            <p className="mt-1 text-xs text-zinc-500">{formatNumber(total)} avaliações</p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = dist[String(n)] ?? 0;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-zinc-500">{n}</span>
                  <Star className="size-3 fill-zinc-300 text-zinc-300" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-brand-cyan2" style={{ width: `${total ? (c / total) * 100 : 0}%` }} />
                  </div>
                  <span className="w-6 text-right tabular-nums text-zinc-500">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <ul className="space-y-2.5">
        {reviews.map((r) => <li key={r.id}><ReviewCard review={r} /></li>)}
      </ul>
    </div>
  );
}

function ReviewCard({ review: r }: { review: ProfReview }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={r.client.name} src={r.client.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-medium text-zinc-950">{r.client.name ?? 'Cliente'}</p>
            <span className="shrink-0 text-xs text-zinc-400">{timeAgo(r.created_at)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="inline-flex">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn('size-3.5', i < r.rating ? 'fill-brand-cyan2 text-brand-cyan2' : 'text-zinc-200')} />)}
            </span>
            {r.service && <span className="text-xs text-zinc-400">{r.service}</span>}
          </div>
          {r.comment && <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-700">{r.comment}</p>}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Catálogo ---------------- */

function Catalog({ profile }: { profile: Profile }) {
  const posts = profile.catalog ?? [];
  const [zoom, setZoom] = useState<string | null>(null);
  if (posts.length === 0) return <EmptyState icon={ImageIcon} title="Catálogo vazio" description="O profissional ainda não publicou trabalhos na app." />;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {posts.map((p) => (
          <button key={p.id} type="button" onClick={() => setZoom(p.image_url)} className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 text-left">
            <img src={p.image_url} alt={p.caption ?? ''} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
            {p.type === 'story' && <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">Estado</span>}
            {(p.caption || p.highlight) && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-[11px] text-white">
                {p.highlight ?? p.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <SheetContent className="flex items-center justify-center bg-black/90 sm:max-w-3xl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Imagem do catálogo</DialogTitle>
          {zoom && <img src={zoom} alt="" className="max-h-[85vh] w-auto rounded-lg object-contain" />}
        </SheetContent>
      </Dialog>
    </>
  );
}

/* ---------------- Finanças ---------------- */

function Finance({ profile, ctx }: { profile: Profile; ctx: MoneyCtx }) {
  const s = profile.stats;
  const payments = profile.payments ?? [];
  const m = (v?: number | null) => formatMoney(v ?? 0, ctx);
  if ((s.paid_jobs ?? 0) === 0) return <EmptyState icon={Wallet} title="Sem movimentos" description="Ainda não há pagamentos associados a este profissional." />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Wallet} label="Total ganho" value={m(s.earned)} hint={`${formatNumber(s.paid_jobs ?? 0)} pagamentos`} />
        <Stat icon={Clock} label="Retido em escrow" value={m(s.held)} />
        <Stat icon={UserCheck} label="Disponível" value={m(s.available)} />
        <Stat icon={Repeat} label="Já levantado" value={m(s.withdrawn)} hint={s.pending_withdrawals ? `${m(s.pending_withdrawals)} a aguardar` : undefined} />
      </div>

      <Card>
        <div className="grid grid-cols-2 divide-zinc-100 sm:grid-cols-3 sm:divide-x">
          <div className="px-5 py-3"><p className="text-xs text-zinc-500">Faturado (bruto)</p><p className="mt-0.5 font-semibold tabular-nums">{m(s.gross_billed)}</p></div>
          <div className="px-5 py-3"><p className="text-xs text-zinc-500">Gerou para a plataforma</p><p className="mt-0.5 font-semibold tabular-nums">{m(s.platform_generated)}</p></div>
          <div className="px-5 py-3"><p className="text-xs text-zinc-500">Ticket médio</p><p className="mt-0.5 font-semibold tabular-nums">{m(s.avg_ticket)}</p></div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-zinc-100 px-5 py-3"><h4 className="text-sm font-semibold text-zinc-950">Pagamentos recebidos</h4></div>
        <ul className="divide-y divide-zinc-100">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-zinc-950">{p.service ?? 'Serviço'}</p>
                <p className="text-xs text-zinc-500">{p.client ?? 'Cliente'} · {formatDate(p.paid_at)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-medium tabular-nums text-zinc-950">{formatMoney(p.provider_net, { ...ctx, currency: p.currency })}</p>
                <p className="text-xs text-zinc-400">{p.released_at ? 'libertado' : 'em escrow'}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {profile.withdrawals && profile.withdrawals.length > 0 && (
        <Card>
          <div className="border-b border-zinc-100 px-5 py-3"><h4 className="text-sm font-semibold text-zinc-950">Saques</h4></div>
          <ul className="divide-y divide-zinc-100">
            {profile.withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                <span className="text-zinc-600">{w.method ?? 'Saque'} · {formatDate(w.requested_at ?? w.created_at)}</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums text-zinc-950">{formatMoney(w.amount, { ...ctx, currency: w.currency ?? ctx.currency })}</span>
                  <Badge tone={w.paid_at ? 'success' : 'warning'}>{w.paid_at ? 'Pago' : 'Pendente'}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Notas ---------------- */

function Notes({ profile, onChanged }: { profile: Profile; onChanged: () => void }) {
  const run = useAction();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Prefere anexar à candidatura; se não houver, à conta.
  const entity = profile.application ? 'application' : 'user';
  const entityId = profile.application?.id ?? profile.account?.id;

  const add = async () => {
    if (!entityId || !body.trim()) return;
    setSaving(true);
    try {
      await run(() => rpc('admin_add_note', { p_entity: entity, p_entity_id: entityId, p_body: body.trim() }), 'Nota adicionada.');
      setBody('');
      onChanged();
    } catch {
      // erro já mostrado
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {entityId ? (
        <Card className="p-4">
          <Textarea ref={inputRef} value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000}
            placeholder="Nota interna sobre este profissional (só a equipa vê)…" />
          <div className="mt-2 flex justify-end">
            <Button size="sm" disabled={saving || !body.trim()} onClick={() => void add()}>
              {saving ? <Loader2 className="animate-spin" /> : <Send />} Adicionar nota
            </Button>
          </div>
        </Card>
      ) : (
        <p className="text-[13px] text-zinc-500">Não há candidatura nem conta para anexar notas.</p>
      )}

      {profile.notes.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-zinc-400">Ainda não há notas.</p>
      ) : (
        <ul className="space-y-2.5">
          {profile.notes.map((n) => (
            <li key={n.id}>
              <Card className="p-4">
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-zinc-800">{n.body}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>{n.admin_name ?? 'Admin'} · {formatDateTime(n.created_at)}</span>
                  <button type="button" onClick={() => setRemoving(n.id)} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label="Apagar nota">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)} destructive
        title="Apagar nota?" description="A nota é apagada definitivamente." confirmLabel="Apagar"
        onConfirm={async () => {
          if (removing === null) return;
          await run(() => rpc('admin_delete_note', { p_id: removing }), 'Nota apagada.');
          onChanged();
        }}
      />
    </div>
  );
}

/* ---------------- Auxiliares ---------------- */

function DocLink({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return <div className="rounded-lg border border-dashed border-zinc-200 p-3 text-[13px] text-zinc-400">{label}<p className="text-xs">Não enviado</p></div>;
  }
  const isPdf = /\.pdf($|\?)/i.test(url);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-lg border border-zinc-200 transition-colors hover:border-zinc-300">
      {!isPdf ? <img src={url} alt={label} className="aspect-[4/3] w-full bg-zinc-50 object-cover" /> : <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-50"><FileText className="size-6 text-zinc-400" /></div>}
      <div className="flex items-center justify-between px-3 py-2 text-[13px] text-zinc-700">{label}<ExternalLink className="size-3.5 text-zinc-400 group-hover:text-zinc-700" /></div>
    </a>
  );
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-PT', { month: 'short', timeZone: 'UTC' }).replace('.', '');
}

function linkLabel(link: Profile['link']) {
  switch (link) {
    case 'auth_user_id': return 'Ligação direta';
    case 'phone': return 'Telefone';
    case 'email': return 'Email';
    case 'account': return 'Conta';
    default: return '—';
  }
}
