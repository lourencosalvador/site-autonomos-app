import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, type LucideIcon } from 'lucide-react';
import { navigate } from '../../router';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-dark text-white hover:bg-brand-dark2',
  accent: 'bg-brand-cyan text-brand-dark hover:bg-brand-cyan2',
  outline: 'border border-line bg-white text-ink-900 hover:bg-cloud-100',
  ghost: 'text-ink-700 hover:bg-cloud-100 hover:text-ink-900',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-3.5 text-sm',
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-12 px-5 text-base',
  icon: 'h-11 w-11',
};

export function Btn({
  variant = 'primary', size = 'lg', to, loading, className, children, onClick, disabled, type = 'button', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; to?: string; loading?: boolean }) {
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || loading}
      onClick={(e) => { onClick?.(e); if (to) navigate(to); }}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan2/60 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-2xl border border-line bg-white', className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6', className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-[15px] text-ink-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { label: string; to: string } }) {
  return (
    <div className="mb-6 sm:mb-8">
      {back && (
        <button onClick={() => navigate(back.to)} className="mb-3 inline-flex items-center gap-1 text-[15px] font-medium text-ink-500 transition-colors hover:text-ink-900">
          <span aria-hidden>←</span> {back.label}
        </button>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[2rem]">{title}</h1>
          {description && <p className="mt-1.5 text-base text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-ink-900">{children}</h2>
      {action}
    </div>
  );
}

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const badgeTones: Record<Tone, string> = {
  neutral: 'bg-cloud-200 text-ink-700',
  brand: 'bg-brand-cyan/15 text-brand-dark',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-red-50 text-red-700',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-0.5 text-[13px] font-medium', badgeTones[tone], className)}>
      {children}
    </span>
  );
}

const noticeTones = {
  info: { box: 'border-brand-cyan/30 bg-brand-cyan/[0.06] text-ink-800', icon: Info, iconCls: 'text-brand-dark' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: AlertCircle, iconCls: 'text-amber-600' },
  danger: { box: 'border-red-200 bg-red-50 text-red-800', icon: AlertCircle, iconCls: 'text-red-600' },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2, iconCls: 'text-emerald-600' },
};

export function Notice({ tone = 'info', title, children, action, className }: { tone?: keyof typeof noticeTones; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const t = noticeTones[tone];
  const Icon = t.icon;
  return (
    <div className={cx('flex gap-3 rounded-2xl border px-4 py-3.5', t.box, className)}>
      <Icon size={20} className={cx('mt-0.5 shrink-0', t.iconCls)} />
      <div className="min-w-0 flex-1">
        {title && <p className="text-[15px] font-semibold">{title}</p>}
        {children && <div className={cx('text-[15px] leading-relaxed', !!title && 'mt-0.5 opacity-90')}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white text-ink-400">
        <Icon size={22} />
      </div>
      <p className="mt-4 text-base font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[15px] leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {Icon && <Icon size={18} className="text-ink-400" />}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink-400">{hint}</p>}
    </Card>
  );
}

export function Avatar({ name, src, size = 'md' }: { name?: string | null; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const s = size === 'sm' ? 'h-9 w-9 text-xs' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-sm';
  return (
    <div className={cx('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dark font-semibold text-white', s)}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('animate-spin text-ink-300', className)} size={24} />;
}

export function PageLoader() {
  return <div className="flex min-h-[40vh] items-center justify-center"><Spinner /></div>;
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-cloud-200/70 p-1" role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[15px] font-medium transition-colors',
              active ? 'bg-white text-ink-900 shadow-[0_1px_2px_rgba(10,31,42,0.08)]' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {o.label}
            {typeof o.count === 'number' && <span className={cx('text-sm tabular-nums', active ? 'text-ink-400' : 'text-ink-400/80')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-[15px] text-ink-500">{label}</dt>
      <dd className="text-right text-[15px] font-medium text-ink-900">{children}</dd>
    </div>
  );
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'agora mesmo';
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} dia${d === 1 ? '' : 's'}`;
  return new Date(iso).toLocaleDateString('pt-PT');
}

export function formatDate(d?: string | null) {
  if (!d) return '';
  const date = new Date(d.length <= 10 ? d + 'T00:00:00' : d);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });
}
