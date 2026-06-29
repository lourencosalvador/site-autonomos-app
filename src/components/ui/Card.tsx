import { type ReactNode } from 'react';

/**
 * shadcn-style surface: clean border, subtle contrast, generous padding.
 * Elevation comes from the border + spacing, not shadows.
 */
export function Card({
  children,
  className = '',
  interactive = false,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: 'div' | 'article' | 'li';
}) {
  return (
    <Tag
      className={`rounded-2xl border border-zinc-200 bg-white ${
        interactive ? 'transition-colors duration-200 hover:border-zinc-300' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
