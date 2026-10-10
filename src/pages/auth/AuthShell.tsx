import type { ReactNode } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { useNavigate } from '../../router';

/**
 * Moldura das páginas de autenticação: painel de marca à esquerda (desktop)
 * e o formulário à direita. Em telemóvel fica só o formulário, com o logótipo no topo.
 */
export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[100dvh] bg-white">
      {/* Painel de marca */}
      <aside className="relative hidden w-[44%] shrink-0 overflow-hidden bg-brand-dark lg:block">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="absolute -left-24 top-24 h-80 w-80 animate-blob rounded-full bg-brand-cyan/25 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 animate-blob rounded-full bg-lilac-300/30 blur-3xl [animation-delay:3s]" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
          <button onClick={() => navigate('/')} className="w-fit" aria-label="AUTONOMOUS — início">
            <img src="/admin-logo-light.svg" alt="AUTONOMOUS" className="h-6 w-auto" />
          </button>
          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight text-white xl:text-4xl">
              Profissionais de confiança para qualquer serviço, em Angola.
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-white/70">
              Entre para pedir um serviço em minutos ou para receber novos clientes perto de si.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {[
                  'https://images.pexels.com/photos/19379640/pexels-photo-19379640.jpeg?auto=compress&cs=tinysrgb&w=100',
                  'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=100',
                  'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
                ].map((src) => (
                  <img key={src} src={src} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-dark" loading="lazy" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-brand-cyan">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className="fill-current" />)}
                </div>
                <p className="text-xs text-white/60">Profissionais verificados e de confiança</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} AUTONOMOUS · Construído em Angola.</p>
        </div>
      </aside>

      {/* Formulário */}
      <main className="flex flex-1 flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:hidden">
          <button onClick={() => navigate('/')} aria-label="AUTONOMOUS — início">
            <img src="/logo-principal.svg" alt="AUTONOMOUS" className="h-7 w-auto" />
          </button>
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-900">
            <ArrowLeft size={15} /> Início
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[26rem]">
            <button onClick={() => navigate('/')} className="mb-8 hidden items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-900 lg:inline-flex">
              <ArrowLeft size={15} /> Voltar ao site
            </button>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
