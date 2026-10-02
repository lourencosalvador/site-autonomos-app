import { forwardRef, useContext, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes, type ReactNode, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { OTPInput, OTPInputContext } from 'input-otp';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';
import { Button } from './button';

/* ---------------- Switch ---------------- */
export const Switch = forwardRef<ElementRef<typeof SwitchPrimitive.Root>, ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan2/50 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-zinc-950 data-[state=unchecked]:bg-zinc-200',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = 'Switch';

/* ---------------- Input OTP (shadcn) ---------------- */
export const InputOTP = forwardRef<ElementRef<typeof OTPInput>, ComponentPropsWithoutRef<typeof OTPInput>>(
  ({ className, containerClassName, ...props }, ref) => (
    <OTPInput
      ref={ref}
      containerClassName={cn('flex items-center gap-2 has-[:disabled]:opacity-50', containerClassName)}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  ),
);
InputOTP.displayName = 'InputOTP';

export function InputOTPGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center', className)} {...props} />;
}

export function InputOTPSlot({ index, className, invalid }: { index: number; className?: string; invalid?: boolean }) {
  const ctx = useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = ctx.slots[index];
  return (
    <div
      className={cn(
        'relative flex h-12 w-10 items-center justify-center border-y border-r border-white/15 bg-zinc-950 font-mono text-lg font-medium text-white transition-all sm:h-14 sm:w-12 sm:text-xl',
        'first:rounded-l-lg first:border-l last:rounded-r-lg',
        isActive && 'z-10 border-brand-cyan/70 bg-zinc-900 ring-1 ring-brand-cyan/70',
        invalid && 'border-red-400/70',
        className,
      )}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-pulse bg-brand-cyan" />
        </div>
      )}
    </div>
  );
}

export function InputOTPSeparator() {
  return <div role="separator" className="h-px w-3 bg-white/25" />;
}

/* ---------------- Tabela ---------------- */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-[13px]', className)} {...props} />
    </div>
  );
}
export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="[&_tr]:border-b [&_tr]:border-zinc-100" {...props} />;
}
export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}
export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-zinc-100 transition-colors', className)} {...props} />;
}
export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('h-10 whitespace-nowrap px-4 text-left align-middle text-xs font-medium text-zinc-500', className)} {...props} />;
}
export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle text-zinc-700', className)} {...props} />;
}

/* ---------------- Separadores (tabs segmentados) ---------------- */
export function Segmented<T extends string>({
  value, onChange, options, className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium transition-colors',
              active ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900',
            )}
          >
            {o.label}
            {typeof o.count === 'number' && (
              <span className={cn('tabular-nums text-xs', active ? 'text-zinc-500' : 'text-zinc-400')}>{formatNumber(o.count)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Paginação ---------------- */
export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-zinc-100 px-4 py-3 text-[13px] text-zinc-500">
      <span className="tabular-nums">
        {formatNumber(from)}–{formatNumber(to)} de {formatNumber(total)}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Página anterior">
          <ChevronLeft />
        </Button>
        <span className="px-2 tabular-nums">
          {page + 1} / {pages}
        </span>
        <Button variant="outline" size="icon-sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="Página seguinte">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Estados vazios / erro ---------------- */
export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm">
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 font-medium underline underline-offset-4">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
