import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';
import { Logo } from './Logo';
import { Container } from './ui/Container';
import { useNavigate } from '../router';

const COLUMNS = [
  {
    title: 'Produto',
    links: [
      { label: 'Serviços', path: '/services' },
      { label: 'Solicitar serviço', path: '/request' },
      { label: 'Para Profissionais', path: '/become-pro' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre', path: '/about' },
      { label: 'Contato', path: '/contact' },
    ],
  },
];

const SOCIAL = [
  { Icon: Facebook, label: 'Facebook' },
  { Icon: Instagram, label: 'Instagram' },
  { Icon: Linkedin, label: 'LinkedIn' },
];

export function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              A maior rede de profissionais independentes de Angola. De confiança, rápida e simples.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIAL.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-zinc-900">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => navigate(l.path)}
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Contactos</h4>
            <ul className="mt-4 space-y-3 text-sm text-zinc-500">
              <li>
                <a href="mailto:autonomous.ao@gmail.com" className="flex items-center gap-2.5 transition-colors hover:text-zinc-900">
                  <Mail size={16} className="text-zinc-400" /> autonomous.ao@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+244976477097" className="flex items-center gap-2.5 transition-colors hover:text-zinc-900">
                  <Phone size={16} className="text-zinc-400" /> +244 976 477 097
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin size={16} className="text-zinc-400" /> Luanda, Angola
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-8 text-sm text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} AUTONOMOUS. Todos os direitos reservados.</p>
          <p>Construído em Angola, para África.</p>
        </div>
      </Container>
    </footer>
  );
}
