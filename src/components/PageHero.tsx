import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

export function PageHero({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="hero-wash relative overflow-hidden px-5 pb-16 pt-32 lg:pb-20 lg:pt-40">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dotgrid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]" />
        <div className="absolute -left-24 top-16 h-72 w-72 animate-blob rounded-full bg-brand-cyan/15 blur-3xl" />
        <div className="absolute -right-16 top-10 h-72 w-72 animate-blob rounded-full bg-lilac-300/40 blur-3xl [animation-delay:3s]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="reveal inline-flex items-center gap-2 rounded-full border border-ink-900/10 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink-700 shadow-soft backdrop-blur">
          <Icon size={14} className="text-brand-cyan" /> {eyebrow}
        </span>
        <h1 className="reveal reveal-delay-1 mt-5 font-display text-4xl font-extrabold leading-[1.18] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="reveal reveal-delay-2 mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">
            {subtitle}
          </p>
        )}
        {children && <div className="reveal reveal-delay-3 mt-8">{children}</div>}
      </div>
    </section>
  );
}
