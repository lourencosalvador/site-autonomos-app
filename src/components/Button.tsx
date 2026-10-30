import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from '../router';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline-light' | 'dark' | 'outline-dark';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  to?: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-cyan text-brand-dark hover:bg-brand-cyan2',
  secondary: 'bg-brand-dark text-white hover:bg-brand-dark2',
  ghost: 'bg-white/10 text-white hover:bg-white/20 border border-white/20',
  'outline-light': 'bg-transparent text-white border border-white/30 hover:bg-white/10',
  dark: 'bg-ink-900 text-white hover:bg-ink-800',
  'outline-dark': 'bg-white text-ink-900 border border-line hover:bg-cloud-100',
};

const sizes = {
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-12 px-6 text-base',
  xl: 'h-14 px-7 text-base',
};

export function Button({ variant = 'primary', to, children, size = 'lg', className = '', onClick, type = 'button', ...rest }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type={type}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (to) navigate(to);
      }}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan2/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
