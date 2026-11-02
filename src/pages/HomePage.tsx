import { ArrowRight, BadgeCheck, Clock, Headset, LayoutGrid, ReceiptText, ShieldCheck } from 'lucide-react';
import { Hero } from '../components/Hero';
import { Button } from '../components/Button';
import { SectionHeading } from '../components/SectionHeading';
import { ServicesCarousel } from '../components/ServicesCarousel';
import { TestimonialsGrid } from '../components/TestimonialsSlider';
import { FaqSection } from '../components/FaqSection';
import { BENEFITS } from '../data';
import { useCategories } from '../hooks/useServices';

const BENEFIT_ICONS = [BadgeCheck, Clock, LayoutGrid, ShieldCheck, ReceiptText, Headset];

const CUSTOMER_STEPS = [
  { title: 'Descreva o que precisa', desc: 'Escolha o serviço e conte-nos o problema. Leva dois minutos.' },
  { title: 'Receba o orçamento', desc: 'Um profissional verificado da sua zona aceita e envia o valor. Só avança se concordar.' },
  { title: 'Pague no fim', desc: 'Paga depois de o serviço estar feito e avalia o profissional.' },
];

const PRO_STEPS = [
  { title: 'Crie a sua conta', desc: 'Indique até três áreas de atuação e envie os seus documentos.' },
  { title: 'Seja aprovado', desc: 'A nossa equipa valida o seu perfil, normalmente em poucos dias.' },
  { title: 'Receba pedidos', desc: 'Aceite pedidos perto de si e saque o saldo para a sua conta bancária.' },
];

export function HomePage() {
  const marquee = useCategories();
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

      {/* ===== HOW IT WORKS ===== */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Como funciona"
            title="Dois caminhos. Uma plataforma."
            subtitle="Escolha o seu lado e veja como é simples começar."
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <FlowCard label="Para clientes" title="O profissional certo, sem complicações." steps={CUSTOMER_STEPS} cta={{ label: 'Solicitar serviço', to: '/solicitar-servico' }} />
            <FlowCard dark label="Para profissionais" title="Mais clientes, menos tempo à procura." steps={PRO_STEPS} cta={{ label: 'Quero ser profissional', to: '/ser-profissional' }} />
          </div>
        </div>
      </section>

      {/* ===== SERVICES CAROUSEL ===== */}
      <section className="relative bg-cloud-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Serviços"
            title="Tudo o que precisa, num só lugar."
            subtitle="Mais de 25 categorias de serviços com profissionais prontos para ajudar."
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

      {/* ===== WHY CHOOSE ===== */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Porquê a AUTONOMOUS"
            title="Feito para dar confiança."
            subtitle="Cada detalhe pensado para que contratar um profissional seja simples e seguro."
          />
          <div className="reveal mt-14 grid gap-px overflow-hidden rounded-3xl border border-cloud-300 bg-cloud-300 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b, i) => {
              const Icon = BENEFIT_ICONS[i] ?? ShieldCheck;
              return (
                <div key={b.title} className="bg-white p-7 transition-colors duration-200 hover:bg-cloud-50 sm:p-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cloud-300 text-brand-dark">
                    <Icon size={21} strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-6 font-display text-lg font-bold text-ink-900">{b.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="border-y border-cloud-200 bg-cloud-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Testemunhos"
            title="Quem usa, recomenda."
            subtitle="Histórias de clientes e profissionais que fazem parte da rede AUTONOMOUS."
          />
          <div className="mt-14">
            <TestimonialsGrid />
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
  label,
  title,
  steps,
  cta,
  dark = false,
}: {
  label: string;
  title: string;
  steps: { title: string; desc: string }[];
  cta: { label: string; to: string };
  dark?: boolean;
}) {
  return (
    <div className={`reveal flex flex-col rounded-3xl p-7 sm:p-10 ${dark ? 'bg-brand-dark text-white' : 'border border-cloud-300 bg-cloud-50'}`}>
      <p className={`text-sm font-semibold uppercase tracking-[0.14em] ${dark ? 'text-brand-cyan' : 'text-brand-dark'}`}>{label}</p>
      <h3 className={`mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.75rem] ${dark ? 'text-white' : 'text-ink-900'}`}>{title}</h3>
      <ol className="mt-8">
        {steps.map((s, i) => (
          <li key={s.title} className={`grid grid-cols-[auto_1fr] gap-4 border-t py-5 ${dark ? 'border-white/10' : 'border-cloud-300'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[13px] font-semibold ${
              dark ? 'border-white/20 text-brand-cyan' : 'border-cloud-300 bg-white text-brand-dark'
            }`}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <p className={`text-[17px] font-semibold ${dark ? 'text-white' : 'text-ink-900'}`}>{s.title}</p>
              <p className={`mt-1 text-[15px] leading-relaxed ${dark ? 'text-white/65' : 'text-ink-500'}`}>{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-auto pt-4">
        <Button to={cta.to} size="md" variant={dark ? 'primary' : 'secondary'}>
          {cta.label} <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
