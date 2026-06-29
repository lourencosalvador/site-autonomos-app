import { type ReactNode } from 'react';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  light = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  light?: boolean;
}) {
  const center = align === 'center';
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className={`reveal text-sm font-semibold uppercase tracking-wide ${light ? 'text-accent-300' : 'text-accent-700'}`}>
          {eyebrow}
        </p>
      )}
      <h2
        className={`reveal reveal-delay-1 mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl ${
          light ? 'text-white' : 'text-zinc-900'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`reveal reveal-delay-2 mt-4 text-lg leading-relaxed ${
            light ? 'text-zinc-300' : 'text-zinc-600'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
