import { Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { PageHero } from '../components/PageHero';

const CHANNELS = [
  { icon: Mail, label: 'Email', value: 'geral@autonomous.ao', href: 'mailto:geral@autonomous.ao' },
  { icon: Phone, label: 'Telefone', value: '+244 900 000 000', href: 'tel:+244900000000' },
  { icon: MapPin, label: 'Endereço', value: 'Luanda, Angola', href: null },
  { icon: Clock, label: 'Atendimento', value: 'Seg–Sáb · 8h às 19h', href: null },
];

export function ContactPage() {
  return (
    <>
      <PageHero
        icon={MessageSquare}
        eyebrow="Fale connosco"
        title={<>Estamos aqui para <span className="text-gradient-cyan">ajudar.</span></>}
        subtitle="Tem dúvidas ou precisa de suporte? A nossa equipa responde rapidamente."
      />

      <section className="bg-cloud-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* Channels */}
            <div>
              <SectionHeading center={false} eyebrow="Contactos" title="Vários canais à sua disposição." />
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {CHANNELS.map((c, i) => {
                  const Icon = c.icon;
                  const inner = (
                    <div className={`reveal reveal-delay-${i + 1} flex items-start gap-4 rounded-2xl border border-cloud-200 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand-cyan/40 hover:shadow-cardHover`}>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-dark">
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{c.label}</p>
                        <p className="mt-0.5 font-semibold text-ink-900">{c.value}</p>
                      </div>
                    </div>
                  );
                  return c.href ? (
                    <a key={c.label} href={c.href} className="block">{inner}</a>
                  ) : (
                    <div key={c.label}>{inner}</div>
                  );
                })}
              </div>

              <div className="reveal mt-8 rounded-3xl bg-gradient-to-br from-brand-dark to-brand-dark2 p-7 text-white shadow-card">
                <h3 className="font-display text-lg font-bold">Suporte ao cliente</h3>
                <p className="mt-2 text-sm text-white/70">
                  Para questões sobre pedidos, profissionais ou parcerias, envie-nos um email ou ligue. Respondemos em poucas horas.
                </p>
              </div>
            </div>

            {/* Map / illustration */}
            <div className="reveal-right relative overflow-hidden rounded-3xl border border-cloud-200 shadow-card">
              <div className="relative h-full min-h-[420px] bg-brand-dark">
                <div className="absolute inset-0 bg-grid-dark opacity-40" />
                <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-cyan/20 blur-3xl" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-cyan/15 text-brand-cyan animate-pulseGlow">
                    <MapPin size={28} />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold text-white">Luanda, Angola</h3>
                  <p className="mt-2 max-w-xs text-sm text-white/65">
                    A nossa equipa opera a partir de Luanda, servindo clientes e profissionais em todo o país.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
