import { ArrowRight, CheckCircle2, Search, UserCheck, Wrench, ShieldCheck, Clock, Sparkles, Headset, Tag, Star } from 'lucide-react';
import { Button } from '../components/Button';
import { SectionHeading } from '../components/SectionHeading';
import { ServicesCarousel } from '../components/ServicesCarousel';
import { TestimonialsSlider } from '../components/TestimonialsSlider';
import { Counter } from '../components/Counter';
import { STATS, BENEFITS } from '../data';

const FLOATING_CARDS = [
  { text: 'Canalizador encontrado', delay: '0s' },
  { text: 'Eletricista disponível', delay: '0.6s' },
  { text: 'Serviço confirmado', delay: '1.2s' },
  { text: 'Técnico próximo', delay: '1.8s' },
];

const BENEFIT_ICONS = [ShieldCheck, Clock, Sparkles, ShieldCheck, Tag, Headset];

const CUSTOMER_STEPS = [
  { n: '1', title: 'Solicite', desc: 'Descreva o serviço que precisa em poucos minutos.', icon: Search },
  { n: '2', title: 'Encontramos o profissional', desc: 'Ligamos o pedido a um profissional qualificado e verificado.', icon: UserCheck },
  { n: '3', title: 'Serviço realizado', desc: 'O profissional resolve o seu problema. Avalie a experiência.', icon: Wrench },
];

const PRO_STEPS = [
  { n: '1', title: 'Cadastre-se', desc: 'Crie a sua conta e partilhe a sua área de atuação.', icon: UserCheck },
  { n: '2', title: 'Seja aprovado', desc: 'A nossa equipa valida o seu perfil e documentos.', icon: ShieldCheck },
  { n: '3', title: 'Receba oportunidades', desc: 'Comece a receber pedidos de clientes perto de si.', icon: ArrowRight },
];

export function HomePage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-brand-dark pt-28 pb-24 lg:pt-36 lg:pb-32">
        <div className="absolute inset-0 bg-grid-dark opacity-50" />
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-brand-cyan/20 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-brand-cyan/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="reveal inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-cyan backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
              A maior rede de profissionais de Angola
            </span>

            <h1 className="reveal reveal-delay-1 mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Encontre profissionais de confiança para{' '}
              <span className="text-gradient-cyan">qualquer serviço.</span>
            </h1>

            <p className="reveal reveal-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              A AUTONOMOUS conecta clientes a profissionais qualificados de forma rápida, simples e segura.
            </p>

            <div className="reveal reveal-delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/solicitar-servico" size="lg">
                Solicitar Serviço <ArrowRight size={18} />
              </Button>
              <Button to="/ser-profissional" variant="outline-light" size="lg">
                Quero ser um Prestador
              </Button>
            </div>

            <div className="reveal reveal-delay-4 mt-8 flex items-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand-cyan" /> 100+ profissionais
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand-cyan" /> Resposta rápida
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <CheckCircle2 size={16} className="text-brand-cyan" /> Verificados
              </div>
            </div>
          </div>

          {/* Hero visual */}
          <div className="reveal reveal-delay-2 relative">
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-brand-cyan/30 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-cardDark">
                <img
                  src="https://images.pexels.com/photos/8961346/pexels-photo-8961346.jpeg?auto=compress&cs=tinysrgb&w=900"
                  alt="Profissional a trabalhar"
                  className="h-[420px] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/30 to-transparent" />
              </div>

              {/* Floating UI cards */}
              {FLOATING_CARDS.map((c, i) => (
                <div
                  key={c.text}
                  className="absolute flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white shadow-cardDark backdrop-blur-md animate-floatY"
                  style={{
                    animationDelay: c.delay,
                    left: i % 2 === 0 ? '-8%' : 'auto',
                    right: i % 2 === 1 ? '-8%' : 'auto',
                    top: `${10 + i * 22}%`,
                  }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-cyan">
                    <CheckCircle2 size={14} className="text-brand-dark" />
                  </span>
                  {c.text}
                </div>
              ))}

              {/* Rating badge */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-2xl border border-white/15 bg-brand-dark2 px-5 py-3 shadow-cardDark backdrop-blur">
                <div className="flex items-center gap-2">
                  <div className="flex text-brand-cyan">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className="fill-current" />)}
                  </div>
                  <span className="text-sm font-semibold text-white">4.9 · 800+ serviços</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUST / STATS ===== */}
      <section className="relative -mt-12 bg-white py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Confiança"
            title={<>Mais de 100 profissionais já fazem parte da nossa rede.</>}
            subtitle="Uma comunidade crescente de profissionais verificados e clientes satisfeitos em toda Angola."
          />
          <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`reveal reveal-delay-${i + 1} group rounded-3xl border border-brand-dark/10 bg-gradient-to-b from-white to-brand-dark/[0.03] p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand-cyan/40 hover:shadow-card`}
              >
                <p className="font-display text-4xl font-extrabold text-brand-dark lg:text-5xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-sm font-medium text-ink-700/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative overflow-hidden bg-brand-dark py-24">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-brand-cyan/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            light
            eyebrow="Como funciona"
            title="Dois caminhos. Uma plataforma."
            subtitle="Escolha o seu lado e veja como é simples começar."
          />

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <FlowCard title="Para Clientes" accent steps={CUSTOMER_STEPS} cta={{ label: 'Solicitar Serviço', to: '/solicitar-servico' }} />
            <FlowCard title="Para Profissionais" steps={PRO_STEPS} cta={{ label: 'Quero ser Prestador', to: '/ser-profissional' }} />
          </div>
        </div>
      </section>

      {/* ===== SERVICES CAROUSEL ===== */}
      <section className="relative bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Serviços"
            title="Tudo o que precisa, num só lugar."
            subtitle="Mais de 15 categorias de serviços com profissionais prontos para ajudar."
          />
          <div className="mt-12">
            <ServicesCarousel />
          </div>
          <div className="mt-10 text-center">
            <Button to="/services" variant="secondary" size="md">
              Ver todos os serviços <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE ===== */}
      <section className="relative overflow-hidden bg-brand-dark3 py-24">
        <div className="absolute inset-0 bg-grid-dark opacity-20" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            light
            eyebrow="Porquê a AUTONOMOUS"
            title="Feito para dar confiança."
            subtitle="Cada detalhe pensado para que contratar um profissional seja simples e seguro."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b, i) => {
              const Icon = BENEFIT_ICONS[i] ?? ShieldCheck;
              return (
                <div
                  key={b.title}
                  className={`reveal reveal-delay-${(i % 3) + 1} group rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand-cyan/40 hover:bg-white/[0.07]`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/15 text-brand-cyan transition-all duration-300 group-hover:bg-brand-cyan group-hover:text-brand-dark">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-white">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="relative bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Testemunhos"
            title="Quem usa, recomenda."
            subtitle="Histórias reais de clientes e profissionais que fazem parte da rede AUTONOMOUS."
          />
          <div className="mt-12">
            <TestimonialsSlider />
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative overflow-hidden bg-brand-dark py-24">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="absolute left-1/2 top-0 h-72 w-[80%] -translate-x-1/2 rounded-full bg-brand-cyan/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 text-center lg:px-8">
          <h2 className="reveal font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            Pronto para encontrar o <span className="text-gradient-cyan">profissional certo?</span>
          </h2>
          <p className="reveal reveal-delay-1 mt-5 text-lg text-white/70">
            Comece agora. Leva menos de dois minutos.
          </p>
          <div className="reveal reveal-delay-2 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to="/solicitar-servico" size="lg">Solicitar Serviço <ArrowRight size={18} /></Button>
            <Button to="/ser-profissional" variant="outline-light" size="lg">Ser um Prestador</Button>
          </div>
        </div>
      </section>
    </>
  );
}

function FlowCard({
  title,
  steps,
  cta,
  accent = false,
}: {
  title: string;
  steps: { n: string; title: string; desc: string; icon: typeof Search }[];
  cta: { label: string; to: string };
  accent?: boolean;
}) {
  return (
    <div className={`reveal rounded-3xl border p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 ${
      accent ? 'border-brand-cyan/30 bg-brand-cyan/[0.06]' : 'border-white/10 bg-white/[0.04]'
    }`}>
      <h3 className="font-display text-xl font-bold text-white">{title}</h3>
      <div className="mt-6 space-y-5">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.n} className="flex gap-4">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-cyan/15 text-brand-cyan">
                <Icon size={20} />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-cyan text-[10px] font-bold text-brand-dark">
                  {s.n}
                </span>
              </div>
              <div>
                <p className="font-semibold text-white">{s.title}</p>
                <p className="mt-0.5 text-sm text-white/65">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-7">
        <Button to={cta.to} size="md" variant={accent ? 'primary' : 'ghost'}>
          {cta.label} <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
