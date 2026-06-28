import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { SERVICES, type Service } from '../data';
import { useNavigate } from '../router';

const CARD_W = 320; // px, base width incl. gap

export function ServicesCarousel() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Duplicate the list for an infinite-loop feel
  const items = [...SERVICES, ...SERVICES];

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * CARD_W, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Arrows (desktop) */}
      <div className="mb-5 flex items-center justify-end gap-3">
        <button
          onClick={() => scrollBy(-1)}
          disabled={atStart}
          aria-label="Anterior"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-dark/15 bg-white text-brand-dark shadow-soft transition-all hover:border-brand-cyan hover:text-brand-cyan disabled:opacity-40 disabled:hover:text-brand-dark"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => scrollBy(1)}
          disabled={atEnd}
          aria-label="Seguinte"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-dark/15 bg-white text-brand-dark shadow-soft transition-all hover:border-brand-cyan hover:text-brand-cyan disabled:opacity-40"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
        style={{ scrollPaddingLeft: '1rem' }}
      >
        {items.map((s, i) => (
          <ServiceCard key={`${s.id}-${i}`} service={s} onClick={() => navigate('/solicitar-servico')} />
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-ink-700/60">
        Os valores apresentados são estimativas iniciais e podem variar conforme a complexidade do serviço.
      </p>
    </div>
  );
}

function ServiceCard({ service, onClick }: { service: Service; onClick: () => void }) {
  return (
    <article
      className="group relative w-[280px] shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cardDark sm:w-[300px]"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={service.image}
          alt={service.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/10 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-brand-cyan px-3 py-1 text-xs font-bold text-brand-dark shadow-glow">
          {service.category}
        </span>
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg font-bold text-brand-dark">{service.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-700/75">{service.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-700/55">A partir de</p>
            <p className="font-display text-base font-extrabold text-brand-dark">{service.price}</p>
          </div>
          <div className="flex items-center gap-0.5 text-brand-cyan2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={13} className="fill-current" />
            ))}
          </div>
        </div>

        <button
          onClick={onClick}
          className="btn-ripple mt-4 w-full rounded-full bg-brand-dark py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-cyan hover:text-brand-dark"
        >
          Solicitar
        </button>
      </div>
    </article>
  );
}
