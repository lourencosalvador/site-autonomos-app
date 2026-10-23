import { useEffect, useState } from 'react';
import { ChevronLeft, SearchX } from 'lucide-react';
import { type PublicProfile, providerPublicProfile } from '../../lib/profile';
import { navigate } from '../../router';
import { Portfolio, ProfileHeader, ProfileTabs, ReviewsView, StarsButton } from '../../components/app/profile';
import { Btn, Card, DetailRow, EmptyState, PageLoader } from '../../components/app/ui';

type Tab = 'info' | 'portfolio' | 'reviews';

export function ProviderProfilePage({ id }: { id: string }) {
  const [p, setP] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('portfolio');

  useEffect(() => {
    let active = true;
    providerPublicProfile(id)
      .then((d) => { if (active) setP(d); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const back = () => (window.history.length > 1 ? window.history.back() : navigate('/conta/servicos'));

  if (loading) return <PageLoader />;
  if (!p) {
    return (
      <Card>
        <EmptyState icon={SearchX} title="Perfil indisponível" description="Este profissional já não está disponível." action={<Btn variant="outline" onClick={back}>Voltar</Btn>} />
      </Card>
    );
  }

  const areas = p.work_areas ?? [];
  const subtitle = [p.specialty || areas[0], p.company_name].filter(Boolean).join(' · ') || 'Profissional';
  const since = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) : null;

  return (
    <>
      <ProfileHeader name={p.name || 'Profissional'} subtitle={subtitle} email={p.province} avatarUrl={p.avatar_url} onBack={back} />

      <div className="my-5 flex flex-col items-center gap-2 sm:my-6 sm:flex-row sm:justify-between">
        <ProfileTabs value={tab === 'reviews' ? 'info' : tab} onChange={setTab} tabs={[{ value: 'info', label: 'Informações' }, { value: 'portfolio', label: 'Portfólio' }]} />
        <StarsButton average={p.rating.average} count={p.rating.count} onClick={() => setTab('reviews')} />
      </div>

      {tab === 'portfolio' && <Portfolio items={p.portfolio} />}

      {tab === 'reviews' && (
        <div>
          <button onClick={() => setTab('portfolio')} className="mb-4 inline-flex items-center gap-1 text-[15px] font-medium text-ink-500 hover:text-ink-900">
            <ChevronLeft size={18} /> Voltar ao perfil
          </button>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink-900">Avaliações</h2>
          <ReviewsView average={p.rating.average} count={p.rating.count} items={p.reviews} />
        </div>
      )}

      {tab === 'info' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-5 sm:p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">Sobre</h2>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-600">{p.bio || 'Este profissional ainda não escreveu uma apresentação.'}</p>
            {areas.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {areas.map((a) => <span key={a} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-700">{a}</span>)}
              </div>
            )}
          </Card>
          <Card className="p-5 sm:p-6">
            <dl className="divide-y divide-line">
              <DetailRow label="Especialidade">{p.specialty || '—'}</DetailRow>
              <DetailRow label="Tipo">{p.company_name ? p.company_name : 'Individual'}</DetailRow>
              <DetailRow label="Localização">{p.province || '—'}</DetailRow>
              <DetailRow label="Serviços concluídos">{p.jobs_done}</DetailRow>
              {since && <DetailRow label="Na AUTONOMOUS desde">{since}</DetailRow>}
            </dl>
          </Card>
        </div>
      )}
    </>
  );
}
