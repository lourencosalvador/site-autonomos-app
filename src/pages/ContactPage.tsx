import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';

const CHANNELS = [
  { icon: Mail, label: 'Email', value: 'autonomous.ao@gmail.com', href: 'mailto:autonomous.ao@gmail.com' },
  { icon: Phone, label: 'Telefone', value: '+244 976 477 097', href: 'tel:+244976477097' },
  { icon: MapPin, label: 'Endereço', value: 'Luanda, Angola', href: null },
  { icon: Clock, label: 'Horário', value: 'Seg–Dom · 08h às 18h', href: null },
];

export function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contato"
        title="Estamos aqui para ajudar"
        description="Tem dúvidas ou precisa de suporte? A nossa equipa responde rapidamente."
      />

      <section className="py-24 lg:py-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Canais</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-zinc-900">
                Vários canais à sua disposição
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {CHANNELS.map((c, i) => {
                  const Icon = c.icon;
                  const inner = (
                    <Card interactive className={`reveal reveal-delay-${i + 1} flex items-start gap-4 p-5`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-accent-700">
                        <Icon size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{c.label}</p>
                        <p className="mt-0.5 font-medium text-zinc-900">{c.value}</p>
                      </div>
                    </Card>
                  );
                  return c.href ? (
                    <a key={c.label} href={c.href} className="block">{inner}</a>
                  ) : (
                    <div key={c.label}>{inner}</div>
                  );
                })}
              </div>

              <Card className="reveal mt-6 bg-zinc-50 p-6">
                <h3 className="font-semibold text-zinc-900">Suporte ao cliente</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Para questões sobre pedidos, profissionais ou parcerias, envie-nos um email ou ligue.
                  Respondemos em poucas horas.
                </p>
              </Card>
            </div>

            <Card className="reveal-right flex min-h-[420px] flex-col items-center justify-center bg-zinc-50 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white text-accent-700">
                <MapPin size={26} strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-zinc-900">Luanda, Angola</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-600">
                A nossa equipa opera a partir de Luanda, servindo clientes e profissionais em todo o país.
              </p>
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
}
