import { Target, Eye, Users, CheckCircle2 } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { PageHero } from '../components/PageHero';
import { Button } from '../components/Button';

const GALLERY = Array.from({ length: 9 }, (_, i) => `/galeria/g${String(i + 1).padStart(2, '0')}.jpg`);

export function AboutPage() {
  return (
    <>
      <PageHero
        icon={Users}
        eyebrow="Sobre nós"
        title={<>Construímos a maior rede de <span className="text-gradient-cyan">profissionais de África.</span></>}
        subtitle="A AUTONOMOUS nasceu em Angola para resolver um problema simples: encontrar um profissional de confiança não deveria ser difícil."
      />

      {/* Quem é a AUTONOMOUS */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Image */}
            <div className="reveal-left relative">
              <div className="absolute -inset-5 -z-10 rounded-[2.75rem] bg-gradient-to-tr from-brand-cyan/25 via-lilac-200/50 to-transparent blur-2xl" />
              <div className="overflow-hidden rounded-[2rem] border border-cloud-200 bg-gradient-to-br from-cloud-100 to-white shadow-card">
                <img
                  src="/sobre.png"
                  alt="Equipa de profissionais AUTONOMOUS"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Text */}
            <div className="reveal-right">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-cyan/12 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-dark">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" /> Quem somos
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
                Quem é a <span className="text-gradient-cyan">AUTONOMOUS</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-ink-500">
                A AUTONOMOUS é uma plataforma digital de intermediação de serviços que conecta
                clientes a prestadores qualificados de forma rápida, organizada e confiável. O
                objetivo central é reduzir a fricção na procura e contratação de serviços
                essenciais do dia a dia, eliminando incertezas comuns como falta de confiança,
                dificuldade de encontrar profissionais e ausência de padronização de preços e
                qualidade.
              </p>
              <p className="mt-4 text-base leading-relaxed text-ink-500">
                A plataforma surge da necessidade real de estruturar o mercado informal de
                serviços, onde a maior parte das contratações acontece por indicação ou contacto
                direto, sem garantia de verificação ou eficiência no processo. A AUTONOMOUS
                introduz um sistema centralizado onde pedidos de serviço podem ser feitos de forma
                simples, encaminhados para profissionais adequados e acompanhados até a conclusão.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="bg-cloud-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="reveal-left rounded-3xl border border-cloud-200 bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cardHover">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-dark">
                <Target size={22} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold text-ink-900">Missão</h2>
              <p className="mt-3 text-base leading-relaxed text-ink-500">
                Tornar a contratação de profissionais de confiança simples, rápida e fiável — para todos.
              </p>
            </div>
            <div className="reveal-right rounded-3xl border border-cloud-200 bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cardHover">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-dark">
                <Eye size={22} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold text-ink-900">Visão</h2>
              <p className="mt-3 text-base leading-relaxed text-ink-500">
                Ser a maior plataforma de África a ligar clientes e profissionais independentes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Galeria — registos da AUTONOMOUS */}
      <section className="relative overflow-hidden bg-white py-24">
        <div className="pointer-events-none absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-brand-cyan/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-10 h-80 w-80 rounded-full bg-lilac-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Bastidores"
            title={<>Registos da <span className="text-gradient-cyan">AUTONOMOUS.</span></>}
            subtitle="Momentos reais da nossa jornada — a equipa, os profissionais e o trabalho no terreno."
          />

          <div className="reveal mt-14 columns-2 gap-4 sm:columns-3 lg:columns-4">
            {GALLERY.map((src, i) => (
              <figure
                key={src}
                className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-cloud-200 bg-cloud-100 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-cardHover"
              >
                <img
                  src={src}
                  alt={`Registo AUTONOMOUS ${i + 1}`}
                  loading="lazy"
                  className="block w-full align-middle transition-transform duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-dark/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cloud-50 py-24">
        <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
          <h2 className="reveal font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Junte-se ao movimento.
          </h2>
          <p className="reveal reveal-delay-1 mt-4 text-lg text-ink-500">
            Faça parte da rede que está a transformar a forma como Angola contrata serviços.
          </p>
          <div className="reveal reveal-delay-2 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to="/solicitar-servico" size="lg">Solicitar Serviço</Button>
            <Button to="/ser-profissional" variant="outline-dark" size="lg">Ser Prestador</Button>
          </div>
          <div className="reveal reveal-delay-3 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-400">
            {['Sem compromisso', 'Resposta rápida', 'Profissionais verificados'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-brand-cyan2" /> {t}</span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
