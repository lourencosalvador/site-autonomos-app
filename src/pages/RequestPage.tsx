import { useState, type ReactNode } from 'react';
import { Smartphone, Rocket } from 'lucide-react';
import { PageHero } from '../components/PageHero';

function AppleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.21-1.18 3.02-.83.91-2.18 1.61-3.31 1.52-.14-1.1.42-2.27 1.13-3.02.81-.86 2.23-1.5 3.36-1.52zM20.5 17.04c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.52-4.12 3.53-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.78-4.04-3.35C-1.1 16.4-1.46 11.18 1.21 8.4 2.31 7.26 3.84 6.55 5.4 6.55c1.59 0 2.59 1 3.91 1 1.28 0 2.06-1 3.9-1 1.39 0 2.86.76 3.91 2.07-3.44 1.88-2.88 6.79.38 8.42z" />
    </svg>
  );
}

function GooglePlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3.6 1.8a1.7 1.7 0 0 0-.6 1.3v17.8c0 .53.23 1 .6 1.3l.1.08L13.5 12.4v-.23L3.7 1.72l-.1.08z" fill="#02E6FF" />
      <path d="M16.8 15.7l-3.3-3.3v-.23l3.3-3.3.08.05 3.9 2.22c1.12.63 1.12 1.67 0 2.31l-3.9 2.22-.08.04z" fill="#FFD400" />
      <path d="M16.88 15.65 13.5 12.27 3.6 22.2c.37.39.98.44 1.67.05l11.6-6.6z" fill="#F4413F" />
      <path d="M16.88 8.9 5.27 2.3c-.69-.39-1.3-.34-1.67.05l9.9 9.92 3.38-3.37z" fill="#34A853" />
    </svg>
  );
}

function StoreButton({ icon, top, bottom, onClick }: { icon: ReactNode; top: string; bottom: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl bg-ink-900 px-5 py-3 text-white shadow-pill transition-all duration-300 hover:-translate-y-1 hover:bg-ink-800"
    >
      <span className="grid h-7 w-7 place-items-center">{icon}</span>
      <span className="text-left leading-none">
        <span className="block text-[10px] font-medium text-white/60">{top}</span>
        <span className="mt-1 block font-display text-base font-bold tracking-tight">{bottom}</span>
      </span>
    </button>
  );
}

export function RequestPage() {
  const [comingSoon, setComingSoon] = useState(false);

  return (
    <PageHero
      icon={Smartphone}
      eyebrow="Solicitar serviço"
      title="Solicite um serviço em poucos minutos."
      subtitle="Baixe o nosso app para solicitar um serviço de forma rápida, simples e segura. Encontre o profissional certo onde quer que esteja."
    >
      <div className="flex flex-col items-center">
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <StoreButton icon={<AppleIcon className="h-6 w-6" />} top="Baixar na" bottom="App Store" onClick={() => setComingSoon(true)} />
          <StoreButton icon={<GooglePlayIcon className="h-5 w-5" />} top="Disponível no" bottom="Google Play" onClick={() => setComingSoon(true)} />
        </div>

        {comingSoon && (
          <div className="animate-fadeUp mt-6 flex max-w-md items-center gap-3 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-5 py-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-cyan/20 text-brand-cyan2">
              <Rocket size={20} />
            </span>
            <p className="text-sm text-brand-dark">
              <span className="font-bold">O nosso app está a chegar!</span> Vai ser lançado em breve na App Store e no Google Play. Fica atento. 🚀
            </p>
          </div>
        )}
      </div>
    </PageHero>
  );
}
