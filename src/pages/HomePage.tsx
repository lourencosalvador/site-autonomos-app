import { ArrowRight, Search, UserCheck, Wrench, ShieldCheck, Clock, LayoutGrid, Headset, Tag } from 'lucide-react';
import { Hero } from '../components/Hero';
import { Button } from '../components/Button';
import { SectionHeading } from '../components/SectionHeading';
import { ServicesCarousel } from '../components/ServicesCarousel';
import { TestimonialsSlider } from '../components/TestimonialsSlider';
import { FaqSection } from '../components/FaqSection';
import { ClientSignupSection } from '../components/ClientSignupSection';
import { Counter } from '../components/Counter';
import { STATS, BENEFITS, CATEGORIES } from '../data';

const BENEFIT_ICONS = [ShieldCheck, Clock, LayoutGrid, ShieldCheck, Tag, Headset];

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
  const marquee = CATEGORIES.filter((c) => c !== 'Todos');
  return (
    <>
      <Hero />

      {/* ===== MARQUEE TRUST STRIP ===== */}
      <section className="relative border-y border-cloud-200 bg-white py-5">
        <div className="marquee-mask overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-10 pr-10">
            {[...marquee, ...marquee].map((c, i) => (
              <span key={i} className="flex items-center gap-10 whitespace-nowrap text-sm font-bold uppercase tracking-wider text-ink-400">
                {c}
                <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="relative bg-cloud-50 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Confiança"
            title={<>Uma rede que cresce <span className="text-gradient-cyan">todos os dias.</span></>}
            subtitle="Uma comunidade de profissionais verificados e clientes satisfeitos em toda Angola."
          />
          <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`reveal-scale reveal-delay-${i + 1} group rounded-3xl border border-cloud-200 bg-white p-7 text-center shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-cyan/40 hover:shadow-cardHover`}
              >
                <p className="font-display text-4xl font-extrabold text-ink-900 lg:text-5xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-sm font-medium text-ink-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative overflow-hidden bg-white py-24">
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-lilac-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Como funciona"
            title="Dois caminhos. Uma plataforma."
            subtitle="Escolha o seu lado e veja como é simples começar."
          />
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <FlowCard reveal="reveal-left" title="Para Clientes" accent steps={CUSTOMER_STEPS} cta={{ label: 'Solicitar Serviço', to: '/solicitar-servico' }} />
            <FlowCard reveal="reveal-right" title="Para Profissionais" steps={PRO_STEPS} cta={{ label: 'Quero ser Prestador', to: '/ser-profissional' }} />
          </div>
        </div>
      </section>

      {/* ===== SERVICES CAROUSEL ===== */}
      <section className="relative bg-cloud-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Serviços"
            title="Tudo o que precisa, num só lugar."
            subtitle="Mais de 15 categorias de serviços com profissionais prontos para ajudar."
          />
          <div className="reveal mt-12">
            <ServicesCarousel />
          </div>
          <div className="mt-10 text-center">
            <Button to="/services" variant="dark" size="lg">
              Ver todos os serviços <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </section>

      {/* ===== CLIENT EARLY-ACCESS SIGNUP ===== */}
      <ClientSignupSection />

      {/* ===== WHY CHOOSE ===== */}
      <section className="relative overflow-hidden bg-white py-24">
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-brand-cyan/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
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
                  className={`reveal reveal-delay-${(i % 3) + 1} group rounded-3xl border border-cloud-200 bg-cloud-50 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-cyan/40 hover:bg-white hover:shadow-cardHover`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-dark transition-all duration-300 group-hover:bg-brand-cyan group-hover:text-brand-dark group-hover:shadow-glow">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-ink-900">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="relative bg-cloud-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Testemunhos"
            title="Quem usa, recomenda."
            subtitle="Histórias reais de clientes e profissionais que fazem parte da rede AUTONOMOUS."
          />
          <div className="reveal mt-12">
            <TestimonialsSlider />
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <FaqSection />

      {/* ===== FINAL CTA ===== */}
      <section className="bg-white px-5 py-20 lg:px-8">
        <div className="reveal-scale relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-brand-dark px-6 py-20 text-center shadow-cardDark">
          <div className="absolute inset-0 bg-grid-dark opacity-30" />
          <div className="absolute left-1/2 top-0 h-72 w-[80%] -translate-x-1/2 rounded-full bg-brand-cyan/20 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
              Pronto para encontrar o <span className="text-gradient-cyan">profissional certo?</span>
            </h2>
            <p className="mt-5 text-lg text-white/70">Comece agora. Leva menos de dois minutos.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button to="/solicitar-servico" size="lg">Solicitar Serviço <ArrowRight size={18} /></Button>
              <Button to="/ser-profissional" variant="outline-light" size="lg">Ser um Prestador</Button>
            </div>
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
  reveal = 'reveal',
}: {
  title: string;
  steps: { n: string; title: string; desc: string; icon: typeof Search }[];
  cta: { label: string; to: string };
  accent?: boolean;
  reveal?: string;
}) {
  return (
    <div className={`${reveal} rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-cardHover ${
      accent ? 'border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/[0.08] to-white' : 'border-cloud-200 bg-white shadow-soft'
    }`}>
      <h3 className="font-display text-xl font-bold text-ink-900">{title}</h3>
      <div className="mt-6 space-y-5">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.n} className="flex gap-4">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-dark text-brand-cyan">
                <Icon size={20} />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-cyan text-[10px] font-bold text-brand-dark">
                  {s.n}
                </span>
              </div>
              <div>
                <p className="font-semibold text-ink-900">{s.title}</p>
                <p className="mt-0.5 text-sm text-ink-500">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-7">
        <Button to={cta.to} size="md" variant={accent ? 'primary' : 'dark'}>
          {cta.label} <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
