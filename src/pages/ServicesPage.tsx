import { useState, useMemo } from 'react';
import { Search, Star, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { SERVICES, CATEGORIES } from '../data';
import { useNavigate } from '../router';

export function ServicesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Todos');

  const filtered = useMemo(() => {
    return SERVICES.filter((s) => {
      const matchCat = cat === 'Todos' || s.category === cat;
      const matchQuery =
        !query ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [query, cat]);

  return (
    <>
      <PageHero
        icon={SlidersHorizontal}
        eyebrow="Catálogo completo"
        title={<>Todos os serviços, <span className="text-gradient-cyan">num só lugar.</span></>}
        subtitle="Encontre o profissional certo para qualquer necessidade. Mais de 15 categorias disponíveis."
      >
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-2 rounded-full border border-ink-900/10 bg-white p-1.5 shadow-soft focus-within:border-brand-cyan/50 focus-within:shadow-glowSoft">
            <Search size={20} className="ml-3 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar serviço..."
              className="flex-1 bg-transparent px-2 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
            <Button size="md" variant="dark" className="shrink-0" onClick={() => navigate('/solicitar-servico')}>
              Solicitar
            </Button>
          </div>
        </div>
      </PageHero>

      {/* Filters + grid */}
      <section className="bg-cloud-50 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          {/* Category filters */}
          <div className="no-scrollbar -mx-5 mb-10 flex gap-2.5 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  cat === c
                    ? 'bg-ink-900 text-white shadow-soft'
                    : 'border border-ink-900/12 bg-white text-ink-500 hover:border-brand-cyan hover:text-brand-dark'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="mb-6 text-sm text-ink-400">
            {filtered.length} serviço{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-cloud-200 bg-white py-20 text-center">
              <p className="font-display text-lg font-bold text-ink-900">Nenhum serviço encontrado</p>
              <p className="mt-2 text-sm text-ink-400">Tente outra pesquisa ou categoria.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s, i) => (
                <article
                  key={s.id}
                  className={`reveal reveal-delay-${(i % 3) + 1} group overflow-hidden rounded-3xl border border-cloud-200 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cardHover`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img src={s.image} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/70 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-brand-cyan px-3 py-1 text-xs font-bold text-brand-dark shadow-glow">
                      {s.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-lg font-bold text-ink-900">{s.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">{s.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-ink-400">A partir de</p>
                        <p className="font-display text-base font-extrabold text-ink-900">{s.price}</p>
                      </div>
                      <div className="flex items-center gap-0.5 text-brand-cyan2">
                        {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} className="fill-current" />)}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/solicitar-servico')}
                      className="btn-ripple mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-cyan hover:text-brand-dark"
                    >
                      Solicitar <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
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
