import { useEffect, useState } from 'react';
import { Menu, X, ArrowRight, LayoutGrid, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';
import { UserMenu } from './UserMenu';
import { useAuth } from '../auth/AuthContext';
import { useRoute, useNavigate, type Route } from '../router';

const LINKS: { label: string; route: Route['name']; path: string }[] = [
  { label: 'Início', route: 'home', path: '/' },
  { label: 'Serviços', route: 'services', path: '/services' },
  { label: 'Ser Profissional', route: 'become-pro', path: '/ser-profissional' },
  { label: 'Sobre', route: 'about', path: '/sobre' },
  { label: 'Contato', route: 'contact', path: '/contato' },
];

export function Navbar() {
  const route = useRoute();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const firstName = user?.name.split(/\s+/)[0] ?? '';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 lg:px-5 lg:pt-4">
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-full border bg-white px-3 py-2.5 transition-all duration-300 lg:px-4 ${
          scrolled ? 'border-cloud-200 shadow-card' : 'border-cloud-200/70 shadow-soft'
        }`}
      >
        <Logo />

        {/* Center pill nav */}
        <div className="hidden items-center gap-0.5 rounded-full bg-cloud-100/80 p-1 lg:flex">
          {LINKS.map((l) => {
            const active = route.name === l.route;
            return (
              <button
                key={l.path}
                onClick={() => navigate(l.path)}
                className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-ink-900 text-white shadow-soft'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <UserMenu />
          ) : (
            <>
              <button
                onClick={() => navigate('/entrar')}
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:text-ink-900"
              >
                Entrar
              </button>
              <Button to="/criar-conta" variant="dark" size="md">
                Criar conta <ArrowRight size={16} />
              </Button>
            </>
          )}
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-900 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${
          open ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mx-1 mt-2 rounded-3xl bg-white p-5 shadow-card border border-cloud-200">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <button
                key={l.path}
                onClick={() => { navigate(l.path); setOpen(false); }}
                className={`rounded-xl px-4 py-3 text-left text-base font-semibold transition-colors ${
                  route.name === l.route ? 'bg-brand-cyan/12 text-brand-dark' : 'text-ink-700 hover:bg-cloud-100'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          {user ? (
            <>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cloud-200 bg-cloud-50 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-dark text-sm font-bold text-white">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (firstName[0] ?? '?').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{user.name}</p>
                  <p className="text-xs text-ink-400">{user.role === 'professional' ? 'Profissional' : 'Cliente'}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <button onClick={() => { navigate('/conta'); setOpen(false); }} className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-base font-semibold text-ink-700 hover:bg-cloud-100">
                  <LayoutGrid size={18} className="text-ink-400" /> O meu painel
                </button>
                <button onClick={async () => { setOpen(false); await signOut(); navigate('/'); }} className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-base font-semibold text-red-600 hover:bg-red-50">
                  <LogOut size={18} className="text-red-500" /> Terminar sessão
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <Button to="/criar-conta" variant="dark" size="md" className="w-full" onClick={() => setOpen(false)}>
                Criar conta
              </Button>
              <Button to="/entrar" variant="outline-dark" size="md" className="w-full" onClick={() => setOpen(false)}>
                Entrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
