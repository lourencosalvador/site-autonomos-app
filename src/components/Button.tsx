import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useRipple } from '../hooks/useRipple';
import { useNavigate } from '../router';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline-light' | 'dark' | 'outline-dark';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  to?: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-cyan text-brand-dark hover:bg-brand-cyan2 shadow-glow hover:shadow-[0_0_0_1px_rgba(2,230,255,0.4),0_12px_44px_-8px_rgba(2,230,255,0.5)]',
  secondary:
    'bg-brand-dark text-white hover:bg-brand-dark2 shadow-card',
  ghost:
    'bg-white/10 text-white hover:bg-white/20 backdrop-blur border border-white/20',
  'outline-light':
    'bg-transparent text-white border border-white/30 hover:bg-white/10 backdrop-blur',
  dark:
    'bg-ink-900 text-white hover:bg-ink-800 shadow-pill hover:-translate-y-0.5',
  'outline-dark':
    'bg-white/70 text-ink-900 border border-ink-900/12 hover:bg-white hover:border-ink-900/25 backdrop-blur shadow-soft',
};

const sizes = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
  xl: 'px-8 py-4 text-base',
};

export function Button({ variant = 'primary', to, children, size = 'lg', className = '', onClick, ...rest }: Props) {
  const ripple = useRipple();
  const navigate = useNavigate();

  return (
    <button
      {...rest}
      ref={ripple.ref as never}
      onClick={(e) => {
        ripple.onClick(e);
        onClick?.(e);
        if (to) navigate(to);
      }}
      className={`btn-ripple inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
