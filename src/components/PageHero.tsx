import { type ReactNode } from 'react';
import { Container } from './ui/Container';

const DASHED_GRID: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(to right, #e7e5e4 1px, transparent 1px),
    linear-gradient(to bottom, #e7e5e4 1px, transparent 1px)
  `,
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 0',
  maskImage: `
    repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px),
    repeating-linear-gradient(to bottom, black 0px, black 3px, transparent 3px, transparent 8px),
    radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%)
  `,
  WebkitMaskImage: `
    repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px),
    repeating-linear-gradient(to bottom, black 0px, black 3px, transparent 3px, transparent 8px),
    radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%)
  `,
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
};

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-white pb-16 pt-32 lg:pb-20 lg:pt-40">
      <div className="absolute inset-0 z-0" style={DASHED_GRID} aria-hidden="true" />
      <Container className="relative z-10 text-center">
        {eyebrow && (
          <p className="reveal text-sm font-semibold uppercase tracking-wide text-accent-700">{eyebrow}</p>
        )}
        <h1 className="reveal reveal-delay-1 mx-auto mt-3 max-w-3xl font-display text-4xl font-bold tracking-tightest text-zinc-900 sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="reveal reveal-delay-2 mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600">
            {description}
          </p>
        )}
        {children && <div className="reveal reveal-delay-3 mt-8">{children}</div>}
      </Container>
    </section>
  );
}
