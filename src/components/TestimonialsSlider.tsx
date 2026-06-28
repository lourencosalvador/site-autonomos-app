import { useState, useEffect, useCallback } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { TESTIMONIALS } from '../data';

export function TestimonialsSlider() {
  const [index, setIndex] = useState(0);
  const count = TESTIMONIALS.length;

  const go = useCallback((dir: 1 | -1) => {
    setIndex((i) => (i + dir + count) % count);
  }, [count]);

  useEffect(() => {
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => window.clearInterval(t);
  }, [count]);

  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="w-full shrink-0 px-1">
              <figure className="relative rounded-3xl border border-brand-dark/10 bg-white p-8 shadow-card sm:p-10">
                <Quote className="absolute right-8 top-8 h-12 w-12 text-brand-cyan/20" />
                <div className="flex items-center gap-1 text-brand-cyan2">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={18} className="fill-current" />
                  ))}
                </div>
                <blockquote className="mt-5 font-display text-lg font-medium leading-relaxed text-brand-dark sm:text-xl">
                  “{t.text}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-4">
                  <img src={t.avatar} alt={t.name} loading="lazy" className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-cyan/40" />
                  <div>
                    <p className="font-semibold text-brand-dark">{t.name}</p>
                    <p className="text-sm text-ink-700/70">{t.role} · {t.city}</p>
                  </div>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={() => go(-1)}
          aria-label="Anterior"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-dark/15 text-brand-dark transition-all hover:border-brand-cyan hover:text-brand-cyan"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-2">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Testemunho ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-7 bg-brand-cyan' : 'w-2 bg-brand-dark/20 hover:bg-brand-dark/40'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => go(1)}
          aria-label="Seguinte"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-dark/15 text-brand-dark transition-all hover:border-brand-cyan hover:text-brand-cyan"
        >
          <ChevronRight size={18} />
        </button>
        </div>
    </div>
  );
}
