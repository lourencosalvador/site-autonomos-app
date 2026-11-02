import { Star } from 'lucide-react';
import { TESTIMONIALS, type Testimonial } from '../data';

/** Initials from a full name, e.g. "Ana Domingos" -> "AD". */
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Testemunhos em grelha: o primeiro em destaque, os restantes à volta.
 * No telemóvel passa a uma faixa com scroll horizontal (snap).
 */
export function TestimonialsGrid() {
  return (
    <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
      {TESTIMONIALS.map((t, i) => (
        <TestimonialCard key={t.name} t={t} featured={i === 0} />
      ))}
    </div>
  );
}

function TestimonialCard({ t, featured }: { t: Testimonial; featured: boolean }) {
  return (
    <figure
      className={`reveal flex w-[86%] shrink-0 snap-start flex-col rounded-3xl p-7 sm:w-[60%] md:w-auto ${
        featured ? 'bg-brand-dark text-white md:col-span-2 lg:col-span-1 lg:row-span-2 lg:p-9' : 'border border-cloud-300 bg-white'
      }`}
    >
      <div className={`flex items-center gap-0.5 ${featured ? 'text-brand-cyan' : 'text-brand-cyan2'}`} aria-label={`${t.rating} de 5 estrelas`}>
        {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={15} className="fill-current" />)}
      </div>
      <blockquote className={`mt-5 leading-relaxed ${featured ? 'font-display text-xl font-medium text-white lg:text-2xl lg:leading-snug' : 'text-[17px] text-ink-800'}`}>
        “{t.text}”
      </blockquote>
      <figcaption className={`mt-auto flex items-center gap-3 pt-7 ${featured ? 'lg:border-t lg:border-white/10 lg:pt-6' : ''}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          featured ? 'bg-white/10 text-white' : 'bg-cloud-200 text-brand-dark'
        }`}>
          {initials(t.name)}
        </span>
        <span>
          <span className={`block text-[15px] font-semibold ${featured ? 'text-white' : 'text-ink-900'}`}>{t.name}</span>
          <span className={`block text-sm ${featured ? 'text-white/60' : 'text-ink-500'}`}>{t.role} · {t.city}</span>
        </span>
      </figcaption>
    </figure>
  );
}
