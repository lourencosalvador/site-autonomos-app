import { type ReactNode } from 'react';

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = false,
  center = true,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-xl text-left'}>
      {eyebrow && (
        <p className={`reveal inline-flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.14em] ${light ? 'text-white/70' : 'text-brand-dark'}`}>
          <span className="h-0.5 w-5 rounded-full bg-brand-cyan2" />
          {eyebrow}
        </p>
      )}
      <h2 className={`reveal reveal-delay-1 mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.12] ${
        light ? 'text-white' : 'text-ink-900'
      }`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`reveal reveal-delay-2 mt-4 text-base leading-relaxed sm:text-lg ${light ? 'text-white/70' : 'text-ink-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
