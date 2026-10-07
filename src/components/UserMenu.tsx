import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, LogOut, Briefcase, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from '../router';

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}

/** Avatar + dropdown do utilizador autenticado (desktop). */
export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!user) return null;
  const isPro = user.role === 'professional';
  const go = (path: string) => { setOpen(false); navigate(path); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-cloud-200 bg-white py-1 pl-1 pr-2.5 transition-colors hover:border-brand-cyan/50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand-dark text-xs font-bold text-white">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(user.name)}
        </span>
        <span className="hidden max-w-[7rem] truncate text-sm font-semibold text-ink-800 xl:block">{user.name.split(/\s+/)[0]}</span>
        <ChevronDown size={15} className={`text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border border-cloud-200 bg-white p-1.5 shadow-cardHover">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-dark text-sm font-bold text-white">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
              <p className="flex items-center gap-1 text-xs text-ink-400">
                {isPro ? <Briefcase size={11} /> : <UserRound size={11} />}
                {isPro ? 'Profissional' : 'Cliente'}
              </p>
            </div>
          </div>
          <div className="my-1 h-px bg-cloud-100" />
          <MenuItem icon={LayoutGrid} label="O meu painel" onClick={() => go('/conta')} />
          <div className="my-1 h-px bg-cloud-100" />
          <MenuItem icon={LogOut} label="Terminar sessão" destructive onClick={async () => { setOpen(false); await signOut(); navigate('/'); }} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, destructive }: { icon: typeof LogOut; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        destructive ? 'text-red-600 hover:bg-red-50' : 'text-ink-700 hover:bg-cloud-100'
      }`}
    >
      <Icon size={16} className={destructive ? 'text-red-500' : 'text-ink-400'} />
      {label}
    </button>
  );
}
