import { useState, type ReactNode } from 'react';
import {
  Activity, ClipboardList, LayoutDashboard, LogOut, Menu, Settings, UserPlus, Users, Wallet, Wrench, ExternalLink,
} from 'lucide-react';
import { Dialog, SheetContent, DialogTitle } from '../ui/dialog';
import { cn, formatTime, initials } from '../lib/utils';
import type { AdminSession } from '../lib/session';

export type SectionId = '' | 'atividade' | 'pagamentos' | 'pedidos' | 'candidaturas' | 'utilizadores' | 'servicos' | 'definicoes';

type NavItem = { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }>; count?: number };

export function Shell({
  section, session, counts, onLogout, children,
}: {
  section: SectionId;
  session: AdminSession;
  counts: { requests?: number; applications?: number; payments?: number };
  onLogout: () => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Geral',
      items: [
        { id: '', label: 'Visão geral', icon: LayoutDashboard },
        { id: 'atividade', label: 'Atividade', icon: Activity },
        { id: 'pagamentos', label: 'Pagamentos', icon: Wallet, count: counts.payments },
      ],
    },
    {
      label: 'Gestão',
      items: [
        { id: 'pedidos', label: 'Pedidos do site', icon: ClipboardList, count: counts.requests },
        { id: 'candidaturas', label: 'Candidaturas', icon: UserPlus, count: counts.applications },
        { id: 'utilizadores', label: 'Utilizadores', icon: Users },
        { id: 'servicos', label: 'Serviços', icon: Wrench },
      ],
    },
    {
      label: 'Conta',
      items: [{ id: 'definicoes', label: 'Definições', icon: Settings }],
    },
  ];

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-100 px-4">
        <img src="/admin-logo-dark.svg" alt="AUTONOMOUS" className="h-[18px] w-auto" />
        <span className="rounded border border-zinc-200 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 px-2.5 text-[11px] font-medium text-zinc-400">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = item.id === section;
                const Icon = item.icon;
                return (
                  <li key={item.id || 'overview'}>
                    <a
                      href={item.id ? `#/admin/${item.id}` : '#/admin'}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors',
                        active ? 'bg-zinc-100 font-medium text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950',
                      )}
                    >
                      <Icon className={cn('size-4', active ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-600')} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {!!item.count && (
                        <span className="min-w-5 rounded bg-zinc-950 px-1.5 text-center text-[11px] font-medium leading-5 text-white tabular-nums">
                          {item.count > 99 ? '99+' : item.count}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-100 p-3">
        <a
          href="#/"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
        >
          <ExternalLink className="size-4 text-zinc-400" /> Abrir o site
        </a>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
            {initials(session.admin.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-zinc-950">{session.admin.name}</p>
            <p className="truncate text-xs text-zinc-500">Sessão até às {formatTime(session.expiresAt)}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Terminar sessão"
            aria-label="Terminar sessão"
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50/80 font-sans text-zinc-950 antialiased">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-zinc-200 bg-white lg:block">{sidebar}</aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 sm:max-w-72" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Menu</DialogTitle>
          {sidebar}
        </SheetContent>
      </Dialog>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="-ml-1 rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
          >
            <Menu className="size-5" />
          </button>
          <img src="/admin-logo-dark.svg" alt="AUTONOMOUS" className="h-4 w-auto" />
        </header>
        <main className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
