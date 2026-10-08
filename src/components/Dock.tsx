import { Home, Wallet, ClipboardList, UserRound, type LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useRoute, useNavigate } from '../router';

type Item = { label: string; icon: LucideIcon; section: string; path: string };

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
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-cloud-200/70 bg-white/75 p-1 shadow-[0_10px_34px_-10px_rgba(3,71,94,0.28)] backdrop-blur-xl">
        {items.map((it) => {
          const active = current === it.section;
          const Icon = it.icon;
          return (
            <button
              key={it.path}
              onClick={() => navigate(it.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-medium tracking-tight transition-colors duration-200 ${
                active ? 'text-brand-dark' : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200 ${active ? 'bg-brand-cyan/15' : 'bg-transparent'}`}>
                <Icon size={18} strokeWidth={active ? 2.4 : 1.9} />
              </span>
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
