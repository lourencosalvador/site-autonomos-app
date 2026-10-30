import { type ReactNode } from 'react';
import { Briefcase, ClipboardList, Home, LogOut, Plus, UserRound, Wallet, type LucideIcon } from 'lucide-react';
import { useAuth, type AuthUser, type Role } from '../../auth/AuthContext';
import { navigate, useRoute } from '../../router';
import { NotificationBell, UnreadDot, useInbox } from './Inbox';
import { Avatar, cx } from './ui';

type NavItem = { id: string; label: string; icon: LucideIcon; path: string; match: (section: string) => boolean; badge?: number };

export function navItems(user: AuthUser, unreadMessages = 0): NavItem[] {
  const asPro = user.activeRole === 'professional';
  const approved = user.approvalStatus === 'approved';
  const home: NavItem = { id: 'home', label: 'Início', icon: Home, path: '/conta', match: (s) => s === '' };
  const services: NavItem = {
    id: 'services', label: 'Serviços', icon: ClipboardList, path: '/conta/servicos', badge: unreadMessages,
    match: (s) => s === 'servicos' || s.startsWith('pedido/') || s.startsWith('chat/') || s.startsWith('prestador/'),
  };
  const profile: NavItem = {
    id: 'profile', label: 'Perfil', icon: UserRound, path: '/conta/perfil',
    match: (s) => s === 'perfil' || s === 'definicoes' || s === 'catalogo',
  };
  if (!asPro) {
    return [home, { id: 'new', label: 'Novo pedido', icon: Plus, path: '/conta/pedir', match: (s) => s === 'pedir' }, services, profile];
  }
  return [
    home,
    services,
    ...(approved ? [{ id: 'wallet', label: 'Finanças', icon: Wallet, path: '/conta/financas', match: (s: string) => s === 'financas' }] : []),
    profile,
  ];
}

export function ModeSwitch({ className }: { className?: string }) {
  const { user, setMode } = useAuth();
  if (!user?.isProfessional) return null;
  const opts: { value: Role; label: string; icon: LucideIcon }[] = [
    { value: 'professional', label: 'Profissional', icon: Briefcase },
    { value: 'client', label: 'Cliente', icon: UserRound },
  ];
  return (
    <div className={cx('grid grid-cols-2 gap-1 rounded-xl bg-cloud-100 p-1', className)} role="radiogroup" aria-label="Perfil em uso">
      {opts.map((o) => {
        const active = user.activeRole === o.value;
        const Icon = o.icon;
        return (
          <button key={o.value} role="radio" aria-checked={active}
            onClick={() => { if (!active) { setMode(o.value); navigate('/conta'); } }}
            className={cx('flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors',
              active ? 'bg-white text-ink-900 shadow-[0_1px_2px_rgba(10,31,42,0.1)]' : 'text-ink-500 hover:text-ink-900')}>
            <Icon size={15} /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function AppShell({ children, immersive = false }: { children: ReactNode; immersive?: boolean }) {
  const { user, signOut } = useAuth();
  const { unread } = useInbox();
  const route = useRoute();
  if (!user) return null;
  const section = route.name === 'account' ? route.section : '';
  const items = navItems(user, unread.messages);
  const roleLabel = user.activeRole === 'professional' ? (user.companyName ? `Profissional · ${user.companyName}` : 'Profissional') : 'Cliente';

  return (
    <div className="min-h-[100dvh] bg-cloud-100/60 text-ink-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-white md:flex">
        <div className="flex h-16 shrink-0 items-center justify-between pl-5 pr-3">
          <button onClick={() => navigate('/conta')} aria-label="Início">
            <img src="/logo-principal.svg" alt="AUTONOMOUS" className="h-8 w-36 object-cover object-left" />
          </button>
          <NotificationBell />
        </div>

        {user.isProfessional && <div className="px-3 pt-2"><ModeSwitch /></div>}

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
                <span className="flex-1 text-left">{it.label}</span>
                <UnreadDot count={it.badge} />
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
        <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur md:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <button onClick={() => navigate('/conta')} aria-label="Início">
              <img src="/logo-principal.svg" alt="AUTONOMOUS" className="h-8 w-36 object-cover object-left" />
            </button>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <button onClick={() => navigate('/conta/perfil')} aria-label="Perfil" className="ml-1">
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              </button>
            </div>
          </div>
          {user.isProfessional && <div className="px-4 pb-3"><ModeSwitch /></div>}
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
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-line bg-white/95 p-1.5 shadow-[0_12px_32px_-12px_rgba(3,71,94,0.28)] backdrop-blur-xl">
        {items.map((it) => {
          const active = it.match(section);
          const Icon = it.icon;
          const isNew = it.id === 'new';
          return (
            <button
              key={it.id}
              onClick={() => navigate(it.path)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors',
                active ? 'text-brand-dark' : 'text-ink-400 hover:text-ink-700',
              )}
            >
              <span className={cx(
                'relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                isNew ? 'bg-brand-dark text-white' : active ? 'bg-brand-cyan/15' : '',
              )}>
                <Icon size={20} strokeWidth={active || isNew ? 2.3 : 1.9} />
                {!!it.badge && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
              </span>
              {it.label === 'Novo pedido' ? 'Pedir' : it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
