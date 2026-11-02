import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { FaqSection } from '../components/FaqSection';
import { track } from '../lib/analytics';

type Channel = { icon: LucideIcon; label: string; value: string; hint: string; action: string; href: string; external?: boolean };

const CHANNELS: Channel[] = [
  { icon: MessageCircle, label: 'WhatsApp', value: '+244 976 477 097', hint: 'A forma mais rápida de falar connosco.', action: 'Abrir conversa', href: 'https://wa.me/244976477097', external: true },
  { icon: Phone, label: 'Telefone', value: '+244 976 477 097', hint: 'Segunda a sábado, das 08h às 18h.', action: 'Ligar', href: 'tel:+244976477097' },
  { icon: Mail, label: 'Email', value: 'autonomous.ao@gmail.com', hint: 'Para parcerias, empresas e assuntos detalhados.', action: 'Enviar email', href: 'mailto:autonomous.ao@gmail.com' },
];

const INFO = [
  { icon: Clock, label: 'Horário', value: 'Segunda a sábado, 08h às 18h' },
  { icon: MapPin, label: 'Onde estamos', value: 'Luanda, Angola' },
];

export function ContactPage() {
  return (
    <>
      <section className="border-b border-cloud-200 bg-white pb-20 pt-32 lg:pb-24 lg:pt-40">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8">
          <div>
            <p className="reveal inline-flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-brand-dark">
              <span className="h-0.5 w-5 rounded-full bg-brand-cyan2" /> Contacto
            </p>
            <h1 className="reveal reveal-delay-1 mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              Estamos aqui para ajudar.
            </h1>
            <p className="reveal reveal-delay-2 mt-5 max-w-md text-lg leading-relaxed text-ink-500">
              Dúvidas sobre um pedido, um profissional ou uma parceria? Fale connosco pelo canal que preferir. Respondemos em poucas horas.
            </p>
            <dl className="reveal reveal-delay-2 mt-10 space-y-5">
              {INFO.map((i) => {
                const Icon = i.icon;
                return (
                  <div key={i.label} className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cloud-300 text-brand-dark">
                      <Icon size={20} strokeWidth={1.8} />
                    </span>
                    <div>
                      <dt className="text-sm text-ink-500">{i.label}</dt>
                      <dd className="text-base font-semibold text-ink-900">{i.value}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>

          <ul className="reveal reveal-delay-1 divide-y divide-cloud-300 self-start overflow-hidden rounded-3xl border border-cloud-300 bg-white">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              return (
                <li key={c.label}>
                  <a
                    href={c.href}
                    target={c.external ? '_blank' : undefined}
                    rel={c.external ? 'noopener noreferrer' : undefined}
                    onClick={() => track('contact_click', c.label)}
                    className="group flex flex-col gap-4 p-6 transition-colors hover:bg-cloud-50 sm:flex-row sm:items-center sm:p-7"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-dark text-brand-cyan">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-500">{c.label}</span>
                      <span className="mt-0.5 block truncate text-lg font-semibold text-ink-900">{c.value}</span>
                      <span className="mt-0.5 block text-[15px] text-ink-500">{c.hint}</span>
                    </span>
                    <span className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-cloud-300 bg-white px-4 text-[15px] font-semibold text-ink-900 transition-colors group-hover:border-brand-dark group-hover:bg-brand-dark group-hover:text-white">
                      {c.action} <ArrowUpRight size={16} />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <FaqSection contactCard={false} />
    </>
  );
}
