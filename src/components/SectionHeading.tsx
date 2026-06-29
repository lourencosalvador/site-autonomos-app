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
    <div className={`${center ? 'mx-auto text-center' : 'text-left'} max-w-2xl ${center ? '' : 'max-w-none'}`}>
      {eyebrow && (
        <span className={`reveal inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider ${
          light ? 'bg-white/10 text-brand-cyan' : 'bg-brand-cyan/10 text-brand-dark'
        }`}>
          <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
          {eyebrow}
        </span>
      )}
      <h2 className={`reveal reveal-delay-1 mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1] ${
        light ? 'text-white' : 'text-brand-dark'
      }`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`reveal reveal-delay-2 mt-4 text-base leading-relaxed sm:text-lg ${
          light ? 'text-white/70' : 'text-ink-700/80'
        }`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
