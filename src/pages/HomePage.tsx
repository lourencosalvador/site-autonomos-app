import {
  ShieldCheck, Clock, Wallet, LayoutGrid, MessageSquare, Star,
  ArrowRight, type LucideIcon,
} from 'lucide-react';
import { Hero } from '../components/Hero';
import { Button } from '../components/Button';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { SectionHeading } from '../components/SectionHeading';
import { Accordion } from '../components/ui/Accordion';
import { Counter } from '../components/Counter';
import {
  FEATURES, CLIENT_STEPS, PRO_STEPS, STATS, TESTIMONIALS, FAQS,
} from '../data';

const FEATURE_ICONS: Record<string, LucideIcon> = {
  ShieldCheck, Clock, Wallet, LayoutGrid, MessageSquare, Star,
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export function HomePage() {
  return (
    <>
      <Hero />
      <LogoMarquee />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <Faq />
      <CtaSection />
    </>
  );
}

/* ------------------------------------------------------------------ */
function LogoMarquee() {
  const items = ['Eletricidade', 'Pintura', 'Limpeza', 'Carpintaria', 'Informática', 'Segurança', 'Jardinagem', 'Construção Civil'];
  return (
    <section className="border-y border-zinc-200 py-8">
      <Container>
        <p className="text-center text-xs font-medium uppercase tracking-widest text-zinc-400">
          Todos os serviços essenciais, uma só rede de confiança
        </p>
        <div className="marquee-mask mt-6 overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-12">
            {[...items, ...items].map((label, i) => (
              <span key={i} className="whitespace-nowrap text-sm font-medium text-zinc-400">{label}</span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Features() {
  return (
    <section className="py-24 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="Porquê a AUTONOMOUS"
          title="Tudo o que precisa para contratar com confiança"
          description="Um marketplace de confiança, feito para tirar a fricção, a incerteza e a adivinhação de encontrar profissionais qualificados."
        />
        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = FEATURE_ICONS[f.icon] ?? ShieldCheck;
            return (
              <div key={f.title} className={`reveal reveal-delay-${(i % 3) + 1} bg-white p-8`}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-accent-700">
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-base font-semibold text-zinc-900">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function StepList({ steps, label }: { steps: { title: string; desc: string }[]; label: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-accent-700">{label}</p>
      <ol className="mt-6 space-y-8">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-sm font-semibold text-zinc-900">
              {i + 1}
            </span>
            <div className="pt-0.5">
              <h4 className="font-semibold text-zinc-900">{s.title}</h4>
              <p className="mt-1 text-[15px] leading-relaxed text-zinc-600">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-24 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="Como funciona"
          title="Dois lados. Um fluxo simples."
          description="Quer precise de um serviço ou seja você a fazê-lo, começar leva apenas alguns minutos."
        />
        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Card className="reveal-left p-8 sm:p-10">
            <StepList steps={CLIENT_STEPS} label="Para clientes" />
            <Button to="/request" variant="primary" size="md" className="mt-8">
              Solicitar Serviço <ArrowRight size={16} />
            </Button>
          </Card>
          <Card className="reveal-right p-8 sm:p-10">
            <StepList steps={PRO_STEPS} label="Para profissionais" />
          </Card>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Stats() {
  return (
    <section className="py-24 lg:py-28">
      <Container>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.label} className={`reveal reveal-delay-${i + 1} bg-white p-8 text-center`}>
              <p className="font-display text-4xl font-bold tracking-tight text-zinc-900 lg:text-5xl">
                <Counter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Testimonials() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-24 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="Testemunhos"
          title="Adorado por clientes e profissionais"
          description="Histórias reais de quem usa a AUTONOMOUS para resolver problemas em toda Angola."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Card key={t.name} className={`reveal reveal-delay-${(i % 3) + 1} flex flex-col p-6`}>
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: t.rating }).map((_, k) => <Star key={k} size={15} className="fill-current" />)}
              </div>
              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-zinc-700">“{t.text}”</p>
              <div className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                  {initials(t.name)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
                  <p className="text-sm text-zinc-500">{t.role} · {t.city}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function Faq() {
  return (
    <section className="py-24 lg:py-28">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title="Perguntas frequentes"
          description="Tudo o que precisa de saber sobre contratar e trabalhar através da AUTONOMOUS."
        />
        <div className="reveal mt-12">
          <Accordion items={FAQS} />
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
function CtaSection() {
  return (
    <section className="py-24 lg:py-28">
      <Container>
        <div className="reveal-scale relative overflow-hidden rounded-3xl bg-zinc-950 px-6 py-20 text-center sm:px-12">
          <div className="absolute inset-0 bg-dots opacity-[0.15] [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)]" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pronto para resolver o seu problema?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-400">
              Junte-se a milhares de clientes e profissionais que já usam a AUTONOMOUS. Leva menos de dois minutos para começar.
            </p>
            <div className="mt-8 flex justify-center">
              <Button to="/request" variant="inverted" size="lg" className="w-full sm:w-auto">
                Solicitar Serviço
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
