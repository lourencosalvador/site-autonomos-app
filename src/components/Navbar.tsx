import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';
import { Container } from './ui/Container';
import { useRoute, useNavigate, type Route } from '../router';

const LINKS: { label: string; route: Route['name']; path: string }[] = [
  { label: 'Serviços', route: 'services', path: '/services' },
  { label: 'Para Profissionais', route: 'become-pro', path: '/become-pro' },
  { label: 'Sobre', route: 'about', path: '/about' },
  { label: 'Contato', route: 'contact', path: '/contact' },
];

export function Navbar() {
  const route = useRoute();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-zinc-200 bg-white/80 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <Container>
        <nav className="flex h-16 items-center justify-between">
          <Logo />

          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active = route.name === l.route;
              return (
                <button
                  key={l.path}
                  onClick={() => navigate(l.path)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="primary" size="sm" to="/request">Solicitar Serviço</Button>
          </div>

          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-900 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </Container>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-b border-zinc-200 bg-white transition-[max-height] duration-300 md:hidden ${
          open ? 'max-h-[28rem]' : 'max-h-0 border-transparent'
        }`}
      >
        <Container className="py-4">
          <div className="flex flex-col">
            {LINKS.map((l) => (
              <button
                key={l.path}
                onClick={() => { navigate(l.path); setOpen(false); }}
                className={`rounded-lg px-3 py-3 text-left text-[15px] font-medium transition-colors ${
                  route.name === l.route ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-4">
            <Button variant="primary" size="md" className="w-full" to="/request" onClick={() => setOpen(false)}>
              Solicitar Serviço
            </Button>
          </div>
        </Container>
      </div>
    </header>
  );
}
