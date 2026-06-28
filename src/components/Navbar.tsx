import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';
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
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-brand-dark/85 backdrop-blur-xl shadow-cardDark border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <Logo light />

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = route.name === l.route;
            return (
              <button
                key={l.path}
                onClick={() => navigate(l.path)}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  active ? 'text-brand-cyan' : 'text-white/80 hover:text-white'
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-cyan" />
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            onClick={() => navigate('/ser-profissional')}
            className="text-sm font-semibold text-white/90 transition-colors hover:text-brand-cyan"
          >
            Quero ser Prestador
          </button>
          <Button to="/solicitar-servico" size="md">
            Solicitar Serviço
          </Button>
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white lg:hidden"
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
        <div className="mx-4 mb-4 rounded-3xl bg-brand-dark2 p-5 shadow-cardDark border border-white/10">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <button
                key={l.path}
                onClick={() => { navigate(l.path); setOpen(false); }}
                className={`rounded-xl px-4 py-3 text-left text-base font-medium transition-colors ${
                  route.name === l.route ? 'bg-brand-cyan/15 text-brand-cyan' : 'text-white/85 hover:bg-white/5'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Button to="/solicitar-servico" size="md" className="w-full" onClick={() => setOpen(false)}>
              Solicitar Serviço
            </Button>
            <Button to="/ser-profissional" variant="outline-light" size="md" className="w-full" onClick={() => setOpen(false)}>
              Quero ser Prestador
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
