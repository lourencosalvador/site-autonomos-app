import { Target, Eye, Sparkles, MapPin, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { PageHero } from '../components/PageHero';
import { Button } from '../components/Button';
import { Counter } from '../components/Counter';
import { STATS } from '../data';

export function AboutPage() {
  return (
    <>
      <PageHero
        icon={Sparkles}
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

      {/* Traction — dark accent panel */}
      <section className="bg-white px-5 py-12 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-brand-dark px-6 py-20 shadow-cardDark lg:px-12">
          <div className="absolute inset-0 bg-grid-dark opacity-25" />
          <div className="absolute left-1/2 top-0 h-72 w-[70%] -translate-x-1/2 rounded-full bg-brand-cyan/15 blur-3xl" />
          <div className="relative">
            <SectionHeading
              light
              eyebrow="Tração"
              title="Um modelo já validado."
              subtitle="Mais de 100 profissionais, clientes servidos e pedidos reais concluídos. O marketplace já está a funcionar."
            />
            <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <div key={s.label} className={`reveal-scale reveal-delay-${i + 1} rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center backdrop-blur`}>
                  <p className="font-display text-4xl font-extrabold text-white lg:text-5xl">
                    <Counter value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/65">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Users, t: 'Comunidade crescente', d: 'Mais de 100 profissionais registados.' },
                { icon: TrendingUp, t: 'Modelo validado', d: 'Pedidos reais já concluídos com sucesso.' },
                { icon: MapPin, t: 'Foco em Angola', d: 'Expansão para toda a África a caminho.' },
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={c.t} className={`reveal reveal-delay-${i + 1} flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur`}>
                    <Icon size={22} className="mt-0.5 shrink-0 text-brand-cyan" />
                    <div>
                      <p className="font-semibold text-white">{c.t}</p>
                      <p className="mt-1 text-sm text-white/65">{c.d}</p>
                    </div>
                  </div>
                );
              })}
            </div>
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
