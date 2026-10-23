import { type ReactNode } from 'react';
import { ClipboardList, Home, Images, LogOut, Plus, Settings, Wallet, type LucideIcon } from 'lucide-react';
import { useAuth, type AuthUser } from '../../auth/AuthContext';
import { navigate, useRoute } from '../../router';
import { Avatar, cx } from './ui';

type NavItem = { id: string; label: string; icon: LucideIcon; path: string; match: (section: string) => boolean };

export function navItems(user: AuthUser): NavItem[] {
  const isPro = user.role === 'professional';
  const approved = user.approvalStatus === 'approved';
  const home: NavItem = { id: 'home', label: 'Início', icon: Home, path: '/conta', match: (s) => s === '' };
  const services: NavItem = {
    id: 'services', label: 'Serviços', icon: ClipboardList, path: '/conta/servicos',
    match: (s) => s === 'servicos' || s.startsWith('pedido/') || s.startsWith('chat/'),
  };
  const account: NavItem = { id: 'account', label: 'Conta', icon: Settings, path: '/conta/definicoes', match: (s) => s === 'definicoes' };
  if (!isPro) {
    return [home, { id: 'new', label: 'Novo pedido', icon: Plus, path: '/conta/pedir', match: (s) => s === 'pedir' }, services, account];
  }
  return [
    home,
    services,
    ...(approved ? [{ id: 'wallet', label: 'Finanças', icon: Wallet, path: '/conta/financas', match: (s: string) => s === 'financas' }] : []),
    { id: 'catalog', label: 'Catálogo', icon: Images, path: '/conta/catalogo', match: (s) => s === 'catalogo' },
    account,
  ];
}

export function AppShell({ children, immersive = false }: { children: ReactNode; immersive?: boolean }) {
  const { user, signOut } = useAuth();
  const route = useRoute();
  if (!user) return null;
  const section = route.name === 'account' ? route.section : '';
  const items = navItems(user);
  const isPro = user.role === 'professional';
  const roleLabel = isPro ? (user.companyName ? `Profissional · ${user.companyName}` : 'Profissional') : 'Cliente';

  return (
    <div className="min-h-[100dvh] bg-cloud-100/60 text-ink-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-white md:flex">
        <button onClick={() => navigate('/conta')} className="flex h-16 shrink-0 items-center px-5" aria-label="Início">
          <img src="/logo-principal.svg" alt="AUTONOMOUS" className="h-8 w-40 object-cover object-left" />
        </button>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((it) => {
            const active = it.match(section);
            const Icon = it.icon;
            return (
              <button
                key={it.id}
                onClick={() => navigate(it.path)}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
                  active ? 'bg-brand-dark text-white' : 'text-ink-500 hover:bg-cloud-100 hover:text-ink-900',
                )}
              >
                <Icon size={19} strokeWidth={active ? 2.2 : 1.9} />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
              <p className="truncate text-[13px] text-ink-400">{roleLabel}</p>
            </div>
            <button
              onClick={async () => { await signOut(); navigate('/'); }}
              aria-label="Terminar sessão"
              title="Terminar sessão"
              className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-cloud-100 hover:text-ink-900"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {!immersive && (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur md:hidden">
          <button onClick={() => navigate('/conta')} aria-label="Início">
            <img src="/logo-principal.svg" alt="AUTONOMOUS" className="h-8 w-36 object-cover object-left" />
          </button>
          <button onClick={() => navigate('/conta/definicoes')} aria-label="Conta">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          </button>
        </header>
      )}

      <main className={cx('md:pl-[248px]', !immersive && 'pb-32 md:pb-0')}>
        {immersive ? children : (
          <div className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">{children}</div>
        )}
      </main>

      {!immersive && <Dock items={items} section={section} />}
    </div>
  );
}

function Dock({ items, section }: { items: NavItem[]; section: string }) {
  const visible = items.filter((i) => i.id !== 'catalog');
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-line bg-white/95 p-1.5 shadow-[0_12px_32px_-12px_rgba(3,71,94,0.28)] backdrop-blur-xl">
        {visible.map((it) => {
          const active = it.match(section);
          const Icon = it.icon;
          const isNew = it.id === 'new';
          return (
            <button
              key={it.id}
              onClick={() => navigate(it.path)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors',
                active ? 'text-brand-dark' : 'text-ink-400 hover:text-ink-700',
              )}
            >
              <span className={cx(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                isNew ? 'bg-brand-dark text-white' : active ? 'bg-brand-cyan/15' : '',
              )}>
                <Icon size={20} strokeWidth={active || isNew ? 2.3 : 1.9} />
              </span>
              {it.label === 'Novo pedido' ? 'Pedir' : it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
