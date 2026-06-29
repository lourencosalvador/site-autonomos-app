import { useRef, type MouseEvent } from 'react';

/**
 * Returns an onClick handler that spawns a ripple at the click position.
 * Apply the `btn-ripple` class to the element for overflow clipping.
 */
export function useRipple() {
  const ref = useRef<HTMLElement | null>(null);

  const onClick = (e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    el.appendChild(span);
    window.setTimeout(() => span.remove(), 650);
  };

  return { ref, onClick };
}
