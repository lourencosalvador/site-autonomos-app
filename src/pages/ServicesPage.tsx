import { useState, useMemo } from 'react';
import { Search, Star, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '../components/Button';
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-dark pt-32 pb-20 lg:pt-40 lg:pb-24">
        <div className="absolute inset-0 bg-grid-dark opacity-40" />
        <div className="absolute -right-20 top-10 h-80 w-80 rounded-full bg-brand-cyan/15 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-5 text-center lg:px-8">
          <span className="reveal inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-cyan">
            <SlidersHorizontal size={14} /> Catálogo completo
          </span>
          <h1 className="reveal reveal-delay-1 mt-5 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Todos os serviços, <span className="text-gradient-cyan">num só lugar.</span>
          </h1>
          <p className="reveal reveal-delay-2 mt-5 text-lg text-white/70">
            Encontre o profissional certo para qualquer necessidade. Mais de 15 categorias disponíveis.
          </p>

          {/* Search bar */}
          <div className="reveal reveal-delay-3 mx-auto mt-8 max-w-xl">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1.5 backdrop-blur-md focus-within:border-brand-cyan/50">
              <Search size={20} className="ml-3 text-white/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar serviço..."
                className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <Button size="md" className="shrink-0" onClick={() => navigate('/solicitar-servico')}>
                Solicitar
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters + grid */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          {/* Category filters */}
          <div className="no-scrollbar -mx-5 mb-10 flex gap-2.5 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  cat === c
                    ? 'bg-brand-dark text-white shadow-card'
                    : 'border border-brand-dark/15 text-brand-dark hover:border-brand-cyan hover:text-brand-cyan2'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="mb-6 text-sm text-ink-700/60">
            {filtered.length} serviço{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-brand-dark/10 bg-brand-dark/[0.02] py-20 text-center">
              <p className="font-display text-lg font-bold text-brand-dark">Nenhum serviço encontrado</p>
              <p className="mt-2 text-sm text-ink-700/60">Tente outra pesquisa ou categoria.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s, i) => (
                <article
                  key={s.id}
                  className={`reveal reveal-delay-${(i % 3) + 1} group overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img src={s.image} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/70 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-brand-cyan px-3 py-1 text-xs font-bold text-brand-dark shadow-glow">
                      {s.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-lg font-bold text-brand-dark">{s.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-700/75">{s.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-ink-700/55">A partir de</p>
                        <p className="font-display text-base font-extrabold text-brand-dark">{s.price}</p>
                      </div>
                      <div className="flex items-center gap-0.5 text-brand-cyan2">
                        {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} className="fill-current" />)}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/solicitar-servico')}
                      className="btn-ripple mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-cyan hover:text-brand-dark"
                    >
                      Solicitar <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-10 text-center text-sm text-ink-700/60">
            Os valores apresentados são estimativas iniciais e podem variar conforme a complexidade do serviço.
          </p>
        </div>
      </section>
    </>
  );
}
