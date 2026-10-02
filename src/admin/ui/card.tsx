import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-zinc-950', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[13px] text-zinc-500', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-zinc-100', className)} {...props} />;
}

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'outline' | 'dark';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700',
  brand: 'bg-brand-cyan/15 text-brand-dark',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  outline: 'border border-zinc-200 text-zinc-700',
  dark: 'bg-zinc-900 text-white',
};

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  );
}

/** Ponto + texto, usado para estados nas tabelas. */
export function StatusDot({ tone, children }: { tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'; children: React.ReactNode }) {
  const dot = {
    neutral: 'bg-zinc-400',
    brand: 'bg-brand-cyan2',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-zinc-700">
      <span className={cn('size-1.5 rounded-full', dot)} />
      {children}
    </span>
  );
}
