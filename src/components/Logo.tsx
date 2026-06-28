import { useNavigate } from '../router';

export function Logo({ light = false, className = '' }: { light?: boolean; className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/')}
      className={`group flex items-center gap-2.5 ${className}`}
      aria-label="AUTONOMOUS — início"
    >
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-dark shadow-soft transition-transform duration-300 group-hover:scale-105">
        <svg viewBox="0 0 64 64" className="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M20 44 L32 18 L44 44" stroke="#02E6FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="44" r="4" fill="#02E6FF" />
        </svg>
        <span className="absolute inset-0 rounded-xl ring-1 ring-brand-cyan/30" />
      </span>
      <span className={`font-display text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-brand-dark'}`}>
        AUTONOMOUS
      </span>
    </button>
  );
}
