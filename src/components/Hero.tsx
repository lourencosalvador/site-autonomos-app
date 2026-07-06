import { ArrowRight, MapPin, Star } from 'lucide-react';
import { PhoneMockup } from './PhoneMockup';

/** Build do APK (Android) no Expo. */
const APK_URL =
  'https://expo.dev/accounts/lourenzocardoso/projects/autonomos-app/builds/4a6b259a-6c9b-47f3-af2b-6df4f96f06e6';

/* Ícone Google Play (o mesmo colorido já usado no site). */
function GooglePlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3.6 1.8a1.7 1.7 0 0 0-.6 1.3v17.8c0 .53.23 1 .6 1.3l.1.08L13.5 12.4v-.23L3.7 1.72l-.1.08z" fill="#02E6FF" />
      <path d="M16.8 15.7l-3.3-3.3v-.23l3.3-3.3.08.05 3.9 2.22c1.12.63 1.12 1.67 0 2.31l-3.9 2.22-.08.04z" fill="#FFD400" />
      <path d="M16.88 15.65 13.5 12.27 3.6 22.2c.37.39.98.44 1.67.05l11.6-6.6z" fill="#F4413F" />
      <path d="M16.88 8.9 5.27 2.3c-.69-.39-1.3-.34-1.67.05l9.9 9.92 3.38-3.37z" fill="#34A853" />
    </svg>
  );
}

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

export function Hero() {
  return (
    <section className="hero-wash relative overflow-hidden px-5 pb-0 pt-28 lg:pt-36">
      {/* ===== Background decor ===== */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dotgrid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]" />
        {/* aurora blobs */}
        <div className="absolute -left-24 top-24 h-72 w-72 animate-blob rounded-full bg-brand-cyan/20 blur-3xl" />
        <div className="absolute -right-20 top-10 h-72 w-72 animate-blob rounded-full bg-lilac-300/40 blur-3xl [animation-delay:3s]" />
        {/* blueprint corner lines (like the reference) */}
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

        <h1 className="animate-fadeUp mt-7 font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight text-ink-900 [animation-delay:0.1s] sm:text-6xl sm:leading-[1.02] lg:text-7xl">
          Profissionais de confiança
          <br className="hidden sm:block" /> para{' '}
          <span className="relative whitespace-nowrap">
            <span className="text-gradient-cyan">qualquer serviço.</span>
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" aria-hidden="true">
              <path d="M3 8C60 3 120 3 297 7" stroke="#02E6FF" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        <p className="animate-fadeUp mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-500 [animation-delay:0.2s]">
          Baixe a AUTONOMOUS e encontre canalizadores, eletricistas, técnicos e muito mais.
          Rápido, simples e seguro.
        </p>

        {/* Download APK (Android) */}
        <div className="animate-fadeUp mt-9 flex justify-center [animation-delay:0.3s]">
          <a
            href={APK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-4 rounded-full bg-gradient-to-r from-[#02E6FF] via-[#0AC8E0] to-[#03475E] py-2.5 pl-7 pr-2.5 text-brand-dark shadow-[0_12px_40px_-10px_rgba(2,230,255,0.5)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_55px_-10px_rgba(2,230,255,0.65)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <GooglePlayIcon className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Baixar para Android</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-dark shadow-sm transition-transform duration-300 ease-out group-hover:translate-x-1">
              <ArrowRight size={22} />
            </span>
          </a>
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
        {/* glow behind phone */}
        <div className="absolute -inset-x-10 bottom-0 top-10 -z-10 rounded-full bg-gradient-to-t from-brand-cyan/30 via-brand-cyan/10 to-transparent blur-3xl" />
        <div className="animate-scaleIn [animation-delay:0.45s]">
          <PhoneMockup />
        </div>
      </div>

      {/* bottom fade into next section */}
      <div className="pointer-events-none h-24" />
    </section>
  );
}
