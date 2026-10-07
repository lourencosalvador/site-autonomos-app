import { Home, Wallet, ClipboardList, UserRound, type LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useRoute, useNavigate } from '../router';

type Item = { label: string; icon: LucideIcon; section: string; path: string };

/** Dock fixa em baixo ao centro, com navegação da área autenticada (adapta-se ao papel). */
export function Dock() {
  const { user } = useAuth();
  const route = useRoute();
  const navigate = useNavigate();
  if (!user) return null;

  const isPro = user.role === 'professional';
  const items: Item[] = [
    { label: 'Início', icon: Home, section: '', path: '/conta' },
    { label: 'Serviços', icon: ClipboardList, section: 'servicos', path: '/conta/servicos' },
    ...(isPro ? [{ label: 'Finanças', icon: Wallet, section: 'financas', path: '/conta/financas' } as Item] : []),
    { label: 'Conta', icon: UserRound, section: 'definicoes', path: '/conta/definicoes' },
  ];

  const current = route.name === 'account' ? route.section : '__none__';

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-cloud-200 bg-white/90 p-1.5 shadow-cardHover backdrop-blur-md">
        {items.map((it) => {
          const active = current === it.section;
          const Icon = it.icon;
          return (
            <button
              key={it.path}
              onClick={() => navigate(it.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-[64px] flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[11px] font-semibold transition-all duration-200 ${
                active ? 'bg-brand-dark text-white shadow-soft' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <Icon size={19} />
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
