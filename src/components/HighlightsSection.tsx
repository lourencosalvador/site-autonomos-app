import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';

type Moment = {
  src: string;
  tag: string;
  title: string;
  summary: string;
  /** Local e/ou data, opcional. */
  meta?: string;
  /** object-position da imagem quando é recortada (ex.: 'center 30%'). */
  focus?: string;
};

/*
 * Momentos de destaque — editar aqui os textos de cada registo.
 * O 1.º é a notícia principal, o 2.º e o 3.º ficam ao lado, os restantes na lista.
 */
const MOMENTS: Moment[] = [
  {
    src: '/galeria/g08.jpg',
    tag: 'SonaJovem 5.0',
    title: 'A AUTONOMOUS no espaço SonaJovem da Sonangol',
    summary:
      'Apresentámos a plataforma a visitantes, parceiros e empreendedores no stand dedicado aos projetos do programa SonaJovem — com a mensagem que nos define: confiança construída em cada ligação.',
    meta: 'Luanda',
    focus: 'center 40%',
  },
  {
    src: '/galeria/g04.jpg',
    tag: 'Reconhecimento',
    title: 'Finalistas do Programa SonaJovem 5.0',
    summary:
      'A Sonangol distinguiu o projeto AUTONOMOUS pelo mérito, consistência e elevado potencial, após um exigente processo de avaliação técnica, estratégica e de impacto.',
    meta: 'Luanda · 20 de Fevereiro de 2026',
  },
  {
    src: '/galeria/g03.jpg',
    tag: 'Em palco',
    title: 'Lado a lado com os empreendedores do programa',
    summary: 'Um momento partilhado com outros projetos que estão a transformar a economia angolana.',
    focus: 'center 60%',
  },
  {
    src: '/galeria/g06.jpg',
    tag: 'Apresentação',
    title: '“Feito para Angola”: a plataforma apresentada ao público',
    summary: 'A nossa visão no grande ecrã — ligar clientes a profissionais verificados em todo o país.',
  },
  {
    src: '/galeria/g02.jpg',
    tag: 'Conversa',
    title: 'A partilhar a visão da AUTONOMOUS em painel',
    summary: 'Conversas sobre empreendedorismo, tecnologia e o futuro dos serviços em Angola.',
    focus: 'center 55%',
  },
  {
    src: '/galeria/g09.jpg',
    tag: 'Parcerias',
    title: 'Encontros que abrem portas',
    summary: 'Ligações com parceiros e mentores no espaço do programa SonaJovem.',
    focus: 'center 35%',
  },
  {
    src: '/galeria/g07.jpg',
    tag: 'Comunidade',
    title: 'Perto de quem quer fazer parte da rede',
    summary: 'Conversas com visitantes que vieram conhecer a AUTONOMOUS de perto.',
  },
  {
    src: '/galeria/g01.jpg',
    tag: 'Imprensa',
    title: 'Registos e cobertura do evento',
    summary: 'A presença da AUTONOMOUS acompanhada pelas câmaras, nos bastidores e no stand.',
  },
  {
    src: '/galeria/g05.jpg',
    tag: 'Rede',
    title: 'Cada aperto de mão conta',
    summary: 'Profissionais e parceiros que acreditam no projeto e crescem connosco todos os dias.',
    focus: 'center 35%',
  },
];

export function HighlightsSection() {
  const [open, setOpen] = useState<number | null>(null);
  const [lead, ...rest] = MOMENTS.map((m, i) => ({ ...m, index: i }));
  const side = rest.slice(0, 2);
  const more = rest.slice(2);

  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="pointer-events-none absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-brand-cyan/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        {/* Cabeçalho */}
        <div className="reveal flex flex-col gap-4 border-b border-ink-900/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-cyan/12 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" /> Momentos de destaque
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
              A nossa jornada, <span className="text-gradient-cyan">em destaque.</span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-ink-500">
            Eventos, reconhecimentos e pessoas que fazem parte da história da AUTONOMOUS.
          </p>
        </div>

        {/* Principal + laterais */}
        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <article className="reveal lg:col-span-7">
            <Thumb moment={lead} onOpen={setOpen} className="aspect-[16/10] rounded-3xl" />
            <MetaLine tag={lead.tag} meta={lead.meta} className="mt-5" />
            <h3 className="mt-3 font-display text-2xl font-extrabold leading-tight text-ink-900 sm:text-3xl">{lead.title}</h3>
            <p className="mt-3 text-base leading-relaxed text-ink-500">{lead.summary}</p>
          </article>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-8">
            {side.map((m, i) => (
              <article key={m.src} className={`reveal reveal-delay-${i + 1}`}>
                <Thumb moment={m} onOpen={setOpen} className="aspect-[16/9] rounded-2xl" />
                <MetaLine tag={m.tag} meta={m.meta} className="mt-4" />
                <h3 className="mt-2 font-display text-lg font-bold leading-snug text-ink-900">{m.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">{m.summary}</p>
              </article>
            ))}
          </div>
        </div>

        {/* Mais momentos */}
        <div className="mt-16">
          <div className="reveal flex items-center gap-4">
            <h3 className="shrink-0 text-sm font-bold uppercase tracking-wider text-brand-dark">Mais momentos</h3>
            <span className="h-px flex-1 bg-ink-900/10" />
          </div>
          <div className="mt-2 grid gap-x-10 sm:grid-cols-2">
            {more.map((m, i) => (
              <article
                key={m.src}
                className={`reveal reveal-delay-${(i % 2) + 1} flex items-start gap-4 border-b border-ink-900/10 py-6`}
              >
                <div className="min-w-0 flex-1">
                  <MetaLine tag={m.tag} meta={m.meta} />
                  <h4 className="mt-2 font-display text-base font-bold leading-snug text-ink-900">{m.title}</h4>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">{m.summary}</p>
                </div>
                <Thumb moment={m} onOpen={setOpen} className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-28" small />
              </article>
            ))}
          </div>
        </div>
      </div>

      {open !== null && <Lightbox index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}

function MetaLine({ tag, meta, className = '' }: { tag: string; meta?: string; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`}>
      <span className="font-bold uppercase tracking-wider text-brand-cyan2">{tag}</span>
      {meta && (
        <>
          <span className="h-1 w-1 rounded-full bg-ink-400/60" />
          <span className="font-medium text-ink-400">{meta}</span>
        </>
      )}
    </div>
  );
}

function Thumb({
  moment,
  onOpen,
  className,
  small = false,
}: {
  moment: Moment & { index: number };
  onOpen: (i: number) => void;
  className: string;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(moment.index)}
      aria-label={`Ver foto: ${moment.title}`}
      className={`group relative block w-full overflow-hidden border border-cloud-200 bg-cloud-100 shadow-soft transition-shadow duration-300 hover:shadow-cardHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-cyan/40 ${className}`}
    >
      <img
        src={moment.src}
        alt={moment.title}
        loading="lazy"
        style={{ objectPosition: moment.focus ?? 'center' }}
        className="h-full w-full object-cover transition-transform duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
      />
      {!small && (
        <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-dark opacity-0 shadow-soft backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
          <Expand size={17} />
        </span>
      )}
    </button>
  );
}

function Lightbox({ index, onChange, onClose }: { index: number; onChange: (i: number) => void; onClose: () => void }) {
  const m = MOMENTS[index];
  const go = useCallback(
    (dir: 1 | -1) => onChange((index + dir + MOMENTS.length) % MOMENTS.length),
    [index, onChange],
  );

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [go, onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={m.title} className="fixed inset-0 z-[120] flex flex-col bg-brand-dark3/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 py-4 text-white/70">
        <span className="text-sm font-semibold tabular-nums">{index + 1} / {MOMENTS.length}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20" onClick={onClose}>
        <img
          key={m.src}
          src={m.src}
          alt={m.title}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full animate-fadeIn rounded-2xl object-contain shadow-cardDark"
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          aria-label="Anterior"
          className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-5"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(1); }}
          aria-label="Seguinte"
          className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-5"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl px-5 pb-8 pt-5 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">{m.tag}</span>
        <h3 className="mt-2 font-display text-lg font-bold text-white sm:text-xl">{m.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-white/65">{m.summary}</p>
      </div>
    </div>
  );
}
