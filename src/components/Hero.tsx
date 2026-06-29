import { Star } from 'lucide-react';
import { Button } from './Button';
import { Container } from './ui/Container';
import { PhoneMockup } from './PhoneMockup';

type Avatar = { src: string; pos: string; size: string; anim: string };

const AVATARS: Avatar[] = [
  {
    src: 'https://images.pexels.com/photos/33569519/pexels-photo-33569519.jpeg?auto=compress&cs=tinysrgb&w=160',
    pos: 'left-[4%] top-[34%]',
    size: 'h-16 w-16 lg:h-20 lg:w-20',
    anim: 'animate-floatY',
  },
  {
    src: 'https://images.pexels.com/photos/19379640/pexels-photo-19379640.jpeg?auto=compress&cs=tinysrgb&w=160',
    pos: 'right-[5%] top-[30%]',
    size: 'h-16 w-16 lg:h-20 lg:w-20',
    anim: 'animate-floatY2',
  },
  {
    src: 'https://images.pexels.com/photos/37038761/pexels-photo-37038761.jpeg?auto=compress&cs=tinysrgb&w=160',
    pos: 'left-[10%] bottom-[14%]',
    size: 'h-14 w-14 lg:h-16 lg:w-16',
    anim: 'animate-floatY3',
  },
  {
    src: 'https://images.pexels.com/photos/19039168/pexels-photo-19039168.jpeg?auto=compress&cs=tinysrgb&w=160',
    pos: 'right-[9%] bottom-[16%]',
    size: 'h-14 w-14 lg:h-16 lg:w-16',
    anim: 'animate-floatY',
  },
];

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-white pt-32 lg:pt-40">
      {/* Teal glow background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #14b8a6 100%)',
          backgroundSize: '100% 100%',
        }}
      />

      {/* Floating avatar bubbles */}
      {AVATARS.map((a, i) => (
        <div
          key={a.src}
          className={`absolute z-10 hidden animate-fadeIn sm:block ${a.pos} ${a.anim}`}
          style={{ animationDelay: `${0.5 + i * 0.15}s` }}
        >
          <img
            src={a.src}
            alt=""
            className={`${a.size} rounded-full object-cover shadow-float ring-4 ring-white`}
            loading="lazy"
          />
        </div>
      ))}

      {/* Content */}
      <Container className="relative z-20 text-center">
        <div className="animate-fadeUp">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            A maior rede de profissionais de Angola
          </span>
        </div>

        <h1 className="animate-fadeUp mx-auto mt-6 max-w-4xl font-display text-[2.5rem] font-bold leading-[1.05] tracking-tightest text-zinc-900 [animation-delay:60ms] sm:text-6xl lg:text-7xl">
          Profissionais de confiança
          <br className="hidden sm:block" /> para <span className="text-teal-600">qualquer serviço.</span>
        </h1>

        <p className="animate-fadeUp mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 [animation-delay:120ms]">
          Encontre eletricistas, pintores, técnicos e muito mais. Combinados em minutos,
          com preços transparentes e sem surpresas.
        </p>

        <div className="animate-fadeUp mt-8 flex justify-center [animation-delay:180ms]">
          <Button to="/request" size="lg" className="w-full sm:w-auto">Solicitar Serviço</Button>
        </div>

        <div className="animate-fadeUp mt-8 flex items-center justify-center gap-3 [animation-delay:240ms]">
          <div className="flex -space-x-2">
            {AVATARS.map((a) => (
              <img key={a.src} src={a.src} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" loading="lazy" />
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-600">
            <span className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className="fill-current" />)}
            </span>
            <span><span className="font-semibold text-zinc-900">+500</span> clientes satisfeitos</span>
          </div>
        </div>
      </Container>

      {/* Device */}
      <div className="relative z-20 mt-16 flex justify-center lg:mt-20">
        <div className="animate-scaleIn [animation-delay:200ms]">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
