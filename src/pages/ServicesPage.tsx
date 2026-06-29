import { Star, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { SERVICES, type Service } from '../data';
import { useNavigate } from '../router';

export function ServicesPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHero
        eyebrow="Catálogo"
        title="Todos os serviços, num só lugar"
        description="Encontre o profissional certo para qualquer necessidade, com várias categorias disponíveis em toda Angola."
      />

      <section className="py-16 lg:py-20">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} onRequest={() => navigate('/request')} />
            ))}
          </div>

          <p className="mt-12 text-center text-sm text-zinc-500">
            Os valores apresentados são estimativas iniciais e podem variar conforme a complexidade do serviço.
          </p>
        </Container>
      </section>
    </>
  );
}

function ServiceCard({ service, index, onRequest }: { service: Service; index: number; onRequest: () => void }) {
  return (
    <Card interactive as="article" className={`reveal reveal-delay-${(index % 3) + 1} group flex flex-col overflow-hidden`}>
      <div className="relative aspect-[16/10] overflow-hidden border-b border-zinc-200 bg-zinc-100">
        <img
          src={service.image}
          alt={service.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full border border-zinc-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-700 backdrop-blur">
          {service.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold text-zinc-900">{service.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-600">{service.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">A partir de</p>
            <p className="font-display text-base font-semibold text-zinc-900">{service.price}</p>
          </div>
          <div className="flex gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} className="fill-current" />)}
          </div>
        </div>
        <Button onClick={onRequest} variant="secondary" size="md" className="mt-5 w-full">
          Solicitar <ArrowRight size={15} />
        </Button>
      </div>
    </Card>
  );
}
