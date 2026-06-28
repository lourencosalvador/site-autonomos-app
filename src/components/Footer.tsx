import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';
import { Logo } from './Logo';
import { useNavigate } from '../router';

const COLS = [
  {
    title: 'Empresa',
    links: [
      { label: 'Início', path: '/' },
      { label: 'Sobre', path: '/sobre' },
      { label: 'Contato', path: '/contato' },
    ],
  },
  {
    title: 'Serviços',
    links: [
      { label: 'Todos os serviços', path: '/services' },
      { label: 'Solicitar serviço', path: '/solicitar-servico' },
    ],
  },
  {
    title: 'Profissionais',
    links: [
      { label: 'Ser profissional', path: '/ser-profissional' },
    ],
  },
];

export function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="relative overflow-hidden bg-brand-dark3 text-white">
      <div className="absolute inset-0 bg-grid-dark opacity-40" />
      <div className="absolute -top-24 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-full bg-brand-cyan/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/65">
              A maior rede de profissionais independentes de Angola. Simples, rápido e de confiança.
            </p>
            <div className="mt-5 flex gap-3">
              {[
                { Icon: Facebook, label: 'Facebook' },
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Linkedin, label: 'LinkedIn' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white/80 transition-all duration-300 hover:border-brand-cyan hover:text-brand-cyan hover:-translate-y-0.5"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => navigate(l.path)}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
          <a href="mailto:geral@autonomous.ao" className="flex items-center gap-3 text-sm text-white/75 hover:text-brand-cyan transition-colors">
            <Mail size={18} className="text-brand-cyan" /> geral@autonomous.ao
          </a>
          <a href="tel:+244900000000" className="flex items-center gap-3 text-sm text-white/75 hover:text-brand-cyan transition-colors">
            <Phone size={18} className="text-brand-cyan" /> +244 900 000 000
          </a>
          <div className="flex items-center gap-3 text-sm text-white/75">
            <MapPin size={18} className="text-brand-cyan" /> Luanda, Angola
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} AUTONOMOUS. Todos os direitos reservados.</p>
          <p>Construído em Angola, para África.</p>
        </div>
      </div>
    </footer>
  );
}
