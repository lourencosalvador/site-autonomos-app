import { Target, Eye, MapPin, TrendingUp, Users, Check } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { SectionHeading } from '../components/SectionHeading';
import { Button } from '../components/Button';
import { Counter } from '../components/Counter';
import { STATS } from '../data';

const HIGHLIGHTS = [
  { icon: Users, t: 'Comunidade crescente', d: 'Mais de 100 profissionais registados.' },
  { icon: TrendingUp, t: 'Modelo validado', d: 'Pedidos reais já concluídos com sucesso.' },
  { icon: MapPin, t: 'Raízes em Angola', d: 'Em expansão por todo o país e além.' },
];

export function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Sobre nós"
        title="A construir a maior rede de profissionais de África"
        description="A AUTONOMOUS nasceu em Angola para resolver um problema simples: encontrar um profissional de confiança não deveria ser difícil."
      />

      {/* Quem é a AUTONOMOUS */}
      <section className="py-24 lg:py-28">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="reveal-left overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              <img src="/sobre.png" alt="Profissionais da AUTONOMOUS" className="h-full w-full object-cover" />
            </div>
            <div className="reveal-right">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Quem somos</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Quem é a AUTONOMOUS
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-zinc-600">
                A AUTONOMOUS é uma plataforma digital de intermediação de serviços que conecta clientes
                a prestadores qualificados de forma rápida, organizada e confiável. O objetivo central é
                reduzir a fricção na procura e contratação de serviços essenciais do dia a dia,
                eliminando incertezas comuns como falta de confiança, dificuldade de encontrar
                profissionais e ausência de padronização de preços e qualidade.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
                A plataforma surge da necessidade real de estruturar o mercado informal de serviços,
                onde a maior parte das contratações acontece por indicação ou contacto direto, sem
                garantia de verificação ou eficiência no processo. A AUTONOMOUS introduz um sistema
                centralizado onde pedidos de serviço podem ser feitos de forma simples, encaminhados
                para profissionais adequados e acompanhados até a conclusão.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Missão / Visão */}
      <section className="border-y border-zinc-200 bg-zinc-50 py-24 lg:py-28">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="reveal-left p-8 sm:p-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-accent-700">
                <Target size={20} strokeWidth={1.75} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-zinc-900">Missão</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
                Tornar a contratação de profissionais de confiança simples, rápida e fiável para todos.
              </p>
            </Card>
            <Card className="reveal-right p-8 sm:p-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-accent-700">
                <Eye size={20} strokeWidth={1.75} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-zinc-900">Visão</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
                Ser a maior plataforma de África a ligar clientes e profissionais independentes.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* Tração */}
      <section className="py-24 lg:py-28">
        <Container>
          <SectionHeading
            eyebrow="Tração"
            title="Um modelo já validado"
            description="Mais de 100 profissionais, clientes servidos e pedidos reais concluídos. O marketplace já está a funcionar."
          />
          <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div key={s.label} className={`reveal reveal-delay-${i + 1} bg-white p-8 text-center`}>
                <p className="font-display text-4xl font-bold tracking-tight text-zinc-900 lg:text-5xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-sm text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {HIGHLIGHTS.map((c, i) => {
              const Icon = c.icon;
              return (
                <Card key={c.t} className={`reveal reveal-delay-${i + 1} flex items-start gap-4 p-6`}>
                  <Icon size={20} className="mt-0.5 shrink-0 text-accent-700" strokeWidth={1.75} />
                  <div>
                    <p className="font-semibold text-zinc-900">{c.t}</p>
                    <p className="mt-1 text-sm text-zinc-600">{c.d}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-200 bg-zinc-50 py-24 lg:py-28">
        <Container className="max-w-2xl text-center">
          <h2 className="reveal font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Junte-se ao movimento
          </h2>
          <p className="reveal reveal-delay-1 mt-4 text-lg leading-relaxed text-zinc-600">
            Faça parte da rede que está a transformar a forma como Angola contrata serviços.
          </p>
          <div className="reveal reveal-delay-2 mt-8 flex justify-center">
            <Button to="/request" size="lg">Solicitar Serviço</Button>
          </div>
          <div className="reveal reveal-delay-3 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
            {['Sem compromisso', 'Resposta rápida', 'Profissionais verificados'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><Check size={15} className="text-accent-700" /> {t}</span>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
