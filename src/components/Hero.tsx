import { ArrowRight, MapPin, Star } from 'lucide-react';
import { PhoneMockup } from './PhoneMockup';

/* ---- Floating avatar bubbles ---- */
type Avatar = { src: string; pos: string; size: string; anim: string; ring: string };
const AVATARS: Avatar[] = [
  {
    src: 'https://images.pexels.com/photos/33569519/pexels-photo-33569519.jpeg?auto=compress&cs=tinysrgb&w=160',
    pos: 'left-[4%] top-[34%]',
    size: 'h-16 w-16 lg:h-20 lg:w-20',
    anim: 'animate-floatY',
    ring: 'ring-brand-cyan/40',
  },
  {
    src: 'https://images.pexels.com/photos/19379640/pexels-photo-19379640.jpeg?auto=compress&cs=tinysrgb&w=160',
    pos: 'right-[5%] top-[30%]',
    size: 'h-16 w-16 lg:h-20 lg:w-20',
    anim: 'animate-floatY2',
    ring: 'ring-lilac-300/60',
  },
  {
    src: 'https://images.pexels.com/photos/37038761/pexels-photo-37038761.jpeg?auto=compress&cs=tinysrgb&w=160',
    pos: 'left-[10%] bottom-[14%]',
    size: 'h-14 w-14 lg:h-16 lg:w-16',
    anim: 'animate-floatY3',
    ring: 'ring-peach-200',
  },
  {
    src: 'https://images.pexels.com/photos/19039168/pexels-photo-19039168.jpeg?auto=compress&cs=tinysrgb&w=160',
    pos: 'right-[9%] bottom-[16%]',
    size: 'h-14 w-14 lg:h-16 lg:w-16',
    anim: 'animate-floatY',
    ring: 'ring-brand-cyan/40',
  },
];

function scrollToSignup() {
  document.getElementById('rede-clientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function Hero() {
  return (
    <section className="hero-wash relative overflow-hidden px-5 pb-0 pt-28 lg:pt-36">
      {/* ===== Background decor ===== */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dotgrid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]" />
        <div className="absolute -left-24 top-24 h-72 w-72 animate-blob rounded-full bg-brand-cyan/20 blur-3xl" />
        <div className="absolute -right-20 top-10 h-72 w-72 animate-blob rounded-full bg-lilac-300/40 blur-3xl [animation-delay:3s]" />
        <svg className="absolute inset-0 h-full w-full text-brand-dark/15" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
          <path d="M40 120 H 220 L 280 180" />
          <path d="M40 120 V 320" />
          <rect x="36" y="116" width="8" height="8" transform="rotate(45 40 120)" />
          <rect x="276" y="176" width="8" height="8" transform="rotate(45 280 180)" />
        </svg>
        <svg className="absolute right-0 top-0 h-full w-1/2 text-brand-dark/15" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" preserveAspectRatio="xMaxYMin meet">
          <path d="M520 120 H 300 L 240 180" />
          <path d="M520 120 V 320" />
          <rect x="516" y="116" width="8" height="8" transform="rotate(45 520 120)" />
          <rect x="236" y="176" width="8" height="8" transform="rotate(45 240 180)" />
        </svg>
      </div>

      {/* ===== Floating avatars ===== */}
      {AVATARS.map((a, i) => (
        <div
          key={a.src}
          className={`absolute z-10 hidden sm:block ${a.pos} ${a.anim} animate-fadeIn`}
          style={{ animationDelay: `${0.5 + i * 0.15}s` }}
        >
          <img
            src={a.src}
            alt=""
            className={`${a.size} rounded-full object-cover shadow-float ring-4 ring-white ${a.ring}`}
            loading="lazy"
          />
        </div>
      ))}

      {/* ===== Floating stickers ===== */}
      <div className="absolute left-[16%] top-[52%] z-10 hidden animate-floatY2 md:block [animation-delay:1s]">
        <div className="flex h-12 w-12 rotate-[-8deg] items-center justify-center rounded-2xl bg-brand-cyan text-2xl shadow-float">🔧</div>
      </div>
      <div className="absolute right-[15%] top-[48%] z-10 hidden animate-floatY3 md:block">
        <div className="flex h-12 w-12 rotate-[10deg] items-center justify-center rounded-2xl bg-lilac-200 text-2xl shadow-float">⚡</div>
      </div>

      {/* ===== Center content ===== */}
      <div className="relative z-20 mx-auto max-w-4xl text-center">
        <span className="animate-fadeUp inline-flex items-center gap-2 rounded-full border border-ink-900/10 bg-white/80 px-4 py-2 text-xs font-semibold text-ink-700 shadow-soft backdrop-blur">
          <MapPin size={14} className="text-brand-cyan" />
          A maior rede de profissionais de Angola
        </span>

        <h1 className="animate-fadeUp mt-7 font-display text-[2rem] font-extrabold leading-[1.08] tracking-tight text-ink-900 [animation-delay:0.1s] sm:text-5xl sm:leading-[1.06] lg:text-6xl">
          O futuro dos serviços em Angola{' '}
          <span className="relative whitespace-nowrap">
            <span className="text-gradient-cyan">cabe no seu bolso.</span>
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" aria-hidden="true">
              <path d="M3 8C60 3 120 3 297 7" stroke="#02E6FF" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        <p className="animate-fadeUp mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-ink-500 [animation-delay:0.2s]">
          A AUTONOMOUS já conecta clientes a profissionais de confiança através da sua plataforma.
          Muito em breve, lançaremos o nosso aplicativo móvel com novas funcionalidades que tornarão
          a contratação e a prestação de serviços ainda mais rápidas, simples e seguras. Acompanhe as
          nossas redes sociais e seja um dos primeiros a descobrir tudo o que está por vir.
        </p>

        {/* Follow the launch → scrolls to the client signup form */}
        <div className="animate-fadeUp mt-9 flex justify-center [animation-delay:0.3s]">
          <button
            onClick={scrollToSignup}
            className="group inline-flex items-center gap-4 rounded-full bg-gradient-to-r from-[#02E6FF] via-[#0AC8E0] to-[#03475E] py-2.5 pl-7 pr-2.5 text-brand-dark shadow-[0_12px_40px_-10px_rgba(2,230,255,0.5)] transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-12px_rgba(2,230,255,0.6)]"
          >
            <span className="font-display text-lg font-bold tracking-tight">Acompanhar o lançamento</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-dark shadow-sm transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
              <ArrowRight size={22} />
            </span>
          </button>
        </div>

        {/* Social proof */}
        <div className="animate-fadeUp mt-7 flex items-center justify-center gap-3 [animation-delay:0.4s]">
          <div className="flex -space-x-2.5">
            {AVATARS.map((a) => (
              <img key={a.src} src={a.src} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" loading="lazy" />
            ))}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1 text-brand-cyan">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className="fill-current" />)}
            </div>
            <p className="text-xs font-medium text-ink-500">+500 clientes satisfeitos</p>
          </div>
        </div>
      </div>

      {/* ===== Phone ===== */}
      <div className="relative z-20 mx-auto mt-14 flex max-w-md justify-center">
        <div className="absolute -inset-x-10 bottom-0 top-10 -z-10 rounded-full bg-gradient-to-t from-brand-cyan/30 via-brand-cyan/10 to-transparent blur-3xl" />
        <div className="animate-scaleIn [animation-delay:0.45s]">
          <PhoneMockup />
        </div>
      </div>

      <div className="pointer-events-none h-24" />
    </section>
  );
}
