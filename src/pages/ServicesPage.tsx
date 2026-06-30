import { Star, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { SERVICES, type Service } from '../data';
import { useNavigate } from '../router';

export function ServicesPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHero
        icon={SlidersHorizontal}
        eyebrow="Catálogo completo"
        title={<>Todos os serviços, <span className="text-gradient-cyan">num só lugar.</span></>}
        subtitle="Encontre o profissional certo para qualquer necessidade. Mais de 15 categorias disponíveis."
      />

      <section className="bg-cloud-50 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} onRequest={() => navigate('/solicitar-servico')} />
            ))}
          </div>

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
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/70 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-brand-cyan px-3 py-1 text-xs font-bold text-brand-dark shadow-glow">
          {service.category}
        </span>
      </div>
      <div className="p-6">
        <h3 className="font-display text-lg font-bold text-ink-900">{service.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">{service.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-400">A partir de</p>
            <p className="font-display text-base font-extrabold text-ink-900">{service.price}</p>
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
