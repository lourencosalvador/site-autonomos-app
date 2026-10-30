import { TrendingUp, Wallet, Clock, Eye } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { ProfessionalForm } from '../components/app/ProfessionalForm';
import { FeeExplainer } from '../components/app/FeeExplainer';
import { navigate } from '../router';
import { track } from '../lib/analytics';

const BENEFITS = [
  { icon: TrendingUp, title: 'Receba novos clientes', desc: 'Os pedidos das suas áreas chegam até si, sem ter de procurar.' },
  { icon: Wallet, title: 'Pagamento garantido', desc: 'O cliente paga à AUTONOMOUS e nós transferimos o valor para a sua conta.' },
  { icon: Clock, title: 'Trabalhe quando quiser', desc: 'Aceita apenas os pedidos que lhe convêm.' },
  { icon: Eye, title: 'Ganhe visibilidade', desc: 'Perfil com portfólio e avaliações dos clientes.' },
];

export function BecomeProPage() {
  return (
    <>
      <PageHero
        icon={TrendingUp}
        eyebrow="Junte-se à rede"
        title={<>Faça parte da nova rede de <span className="text-gradient-cyan">profissionais de Angola.</span></>}
        subtitle="Receba novos clientes, aumente a sua renda e trabalhe com flexibilidade."
      />

      <section className="bg-cloud-50 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="rounded-2xl border border-line bg-white p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-dark"><Icon size={22} /></div>
                  <h3 className="mt-4 text-base font-semibold text-ink-900">{b.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-500">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-5 lg:grid-cols-[1fr_360px] lg:px-8">
          <div className="rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-5 py-6 sm:px-8">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900">Registo de profissional</h2>
              <p className="mt-1.5 text-[15px] text-ink-500">Cria a sua conta e envia os dados para verificação. É gratuito.</p>
            </div>
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <ProfessionalForm submitLabel="Quero fazer parte da AUTONOMOUS" onDone={() => { track('application_submitted'); navigate('/conta'); }} />
            </div>
          </div>
          <aside className="h-fit lg:sticky lg:top-28">
            <FeeExplainer audience="professional" />
          </aside>
        </div>
      </section>
    </>
  );
}
