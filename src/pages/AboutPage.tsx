import { Target, Eye, Sparkles, MapPin, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { Button } from '../components/Button';
import { Counter } from '../components/Counter';
import { STATS } from '../data';

export function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-dark pt-32 pb-20 lg:pt-40 lg:pb-24">
        <div className="absolute inset-0 bg-grid-dark opacity-40" />
        <div className="absolute left-1/2 top-0 h-72 w-[70%] -translate-x-1/2 rounded-full bg-brand-cyan/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 text-center lg:px-8">
          <span className="reveal inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-cyan">
            <Sparkles size={14} /> Sobre nós
          </span>
          <h1 className="reveal reveal-delay-1 mt-5 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Construímos a maior rede de <span className="text-gradient-cyan">profissionais de África.</span>
          </h1>
          <p className="reveal reveal-delay-2 mt-5 text-lg text-white/70">
            A AUTONOMOUS nasceu em Angola para resolver um problema simples: encontrar um profissional de confiança não deveria ser difícil.
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="reveal rounded-3xl border border-brand-dark/10 bg-gradient-to-br from-white to-brand-dark/[0.03] p-8 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/15 text-brand-cyan2">
                <Target size={22} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold text-brand-dark">Missão</h2>
              <p className="mt-3 text-base leading-relaxed text-ink-700/80">
                Tornar a contratação de profissionais de confiança simples, rápida e fiável — para todos.
              </p>
            </div>
            <div className="reveal reveal-delay-1 rounded-3xl border border-brand-dark/10 bg-gradient-to-br from-white to-brand-dark/[0.03] p-8 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/15 text-brand-cyan2">
                <Eye size={22} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold text-brand-dark">Visão</h2>
              <p className="mt-3 text-base leading-relaxed text-ink-700/80">
                Ser a maior plataforma de África a ligar clientes e profissionais independentes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Traction */}
      <section className="relative overflow-hidden bg-brand-dark3 py-24">
        <div className="absolute inset-0 bg-grid-dark opacity-20" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading
            light
            eyebrow="Tração"
            title="Um modelo já validado."
            subtitle="Mais de 100 profissionais, clientes servidos e pedidos reais concluídos. O marketplace já está a funcionar."
          />
          <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div key={s.label} className={`reveal reveal-delay-${i + 1} rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center backdrop-blur`}>
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
      </section>

      {/* CTA */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
          <h2 className="reveal font-display text-3xl font-extrabold text-brand-dark sm:text-4xl">
            Junte-se ao movimento.
          </h2>
          <p className="reveal reveal-delay-1 mt-4 text-lg text-ink-700/75">
            Faça parte da rede que está a transformar a forma como Angola contrata serviços.
          </p>
          <div className="reveal reveal-delay-2 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to="/solicitar-servico" size="lg">Solicitar Serviço</Button>
            <Button to="/ser-profissional" variant="secondary" size="lg">Ser Prestador</Button>
          </div>
          <div className="reveal reveal-delay-3 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-700/60">
            {['Sem compromisso', 'Resposta rápida', 'Profissionais verificados'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-brand-cyan2" /> {t}</span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
