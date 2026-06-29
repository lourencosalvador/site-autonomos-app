import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from '../router';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'inverted';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  to?: string;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
  secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  accent: 'bg-accent-700 text-white hover:bg-accent-800',
  inverted: 'bg-white text-zinc-900 hover:bg-zinc-100',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-[15px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  to,
  children,
  className = '',
  onClick,
  ...rest
}: Props) {
  const navigate = useNavigate();
  return (
    <button
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (to) navigate(to);
      }}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
