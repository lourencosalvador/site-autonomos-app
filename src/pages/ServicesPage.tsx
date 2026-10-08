import { useEffect, useMemo, useState } from 'react';
import { Star, ArrowRight, SlidersHorizontal, Search, X, SearchX } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { type Service } from '../data';
import { useNavigate } from '../router';
import { refreshReveal } from '../hooks/useScrollReveal';
import { useServices } from '../hooks/useServices';
import { track } from '../lib/analytics';
import { useAuth } from '../auth/AuthContext';


function requestPath(loggedIn: boolean, category?: string) {
  const base = loggedIn ? '/conta/pedir' : '/solicitar-servico';
  return category ? `${base}?categoria=${encodeURIComponent(category)}` : base;
}

const POPULAR = ['Eletricidade', 'Canalização', 'Ar condicionado', 'Limpeza', 'Energia solar', 'Pintura'];


function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function searchServices(services: Service[], query: string): Service[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return services;
  return services.filter((s) => {
    const haystack = normalize(`${s.title} ${s.description} ${s.keywords ?? ''}`);
    return terms.every((t) => haystack.includes(t));
  });
}

export function ServicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const services = useServices();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchServices(services, query), [services, query]);
  const searching = query.trim().length > 0;

  // Regista a pesquisa quando o utilizador pára de escrever (para o painel saber o que procuram).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const t = window.setTimeout(() => track('search', q), 1200);
    return () => window.clearTimeout(t);
  }, [query]);


  useEffect(() => {
    refreshReveal();
  }, [results]);

  return (
    <>
      <PageHero
        icon={SlidersHorizontal}
        eyebrow="Catálogo completo"
        title={<>Todos os serviços, <span className="text-gradient-cyan">num só lugar.</span></>}
        subtitle={`Encontre o profissional certo para qualquer necessidade. ${services.length} categorias disponíveis.`}
      />

      <section className="bg-cloud-50 pb-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="relative z-10 mx-auto -mt-8 max-w-3xl">
            <label htmlFor="pesquisa-servicos" className="sr-only">Pesquisar serviços</label>
            <div className="group flex items-center gap-3 rounded-full border border-cloud-200 bg-white py-2 pl-5 pr-2 shadow-card transition-all duration-300 focus-within:border-brand-cyan focus-within:shadow-cardHover">
              <Search size={20} className="shrink-0 text-ink-400 transition-colors group-focus-within:text-brand-cyan2" />
              <input
                id="pesquisa-servicos"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Que serviço procura?"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-ink-900 placeholder:text-ink-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {searching && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Limpar pesquisa"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-cloud-100 hover:text-ink-700"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {searching ? (
                <p className="text-sm text-ink-500" aria-live="polite">
                  {results.length === 0
                    ? 'Nenhuma categoria encontrada'
                    : `${results.length} ${results.length === 1 ? 'categoria encontrada' : 'categorias encontradas'}`}
                </p>
              ) : (
                <>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Mais procurados:</span>
                  {POPULAR.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setQuery(p)}
                      className="rounded-full border border-cloud-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 transition-all duration-200 hover:border-brand-cyan hover:text-brand-dark"
                    >
                      {p}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {results.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((s, i) => (
                <ServiceCard key={s.id} service={s} index={i} onRequest={() => { track('service_click', s.category); navigate(requestPath(!!user, s.category)); }} />
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-12 max-w-md rounded-3xl border border-cloud-200 bg-white p-10 text-center shadow-soft">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-dark">
                <SearchX size={24} />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-ink-900">
                Não encontrámos “{query.trim()}”
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                Descreva o que precisa no pedido de serviço e nós encontramos o profissional certo para si.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(requestPath(!!user))}
                  className="btn-ripple inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-cyan hover:text-brand-dark"
                >
                  Solicitar serviço <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink-500 transition-colors hover:text-ink-900"
                >
                  Limpar pesquisa
                </button>
              </div>
            </div>
          )}

          <p className="mt-10 text-center text-sm text-ink-400">
            Os valores apresentados são estimativas iniciais e podem variar conforme a complexidade do serviço.
          </p>
        </div>
      </section>
    </>
  );
}

function ServiceCard({ service, index, onRequest }: { service: Service; index: number; onRequest: () => void }) {
  return (
    <article
      className={`reveal reveal-delay-${(index % 3) + 1} group overflow-hidden rounded-3xl border border-cloud-200 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cardHover`}
    >
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-brand-dark to-brand-dark3">
        <img
          src={service.image}
          alt={service.title}
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/50 to-transparent" />
      </div>
      <div className="p-6">
        <h3 className="font-display text-lg font-bold text-ink-900">{service.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">{service.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-400">Preço</p>
            <p className="font-display text-base font-extrabold text-ink-900">Sob consulta</p>
          </div>
          <div className="flex items-center gap-0.5 text-brand-cyan2">
            {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} className="fill-current" />)}
          </div>
        </div>
        <button
          onClick={onRequest}
          className="btn-ripple mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-cyan hover:text-brand-dark"
        >
          Solicitar <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}
