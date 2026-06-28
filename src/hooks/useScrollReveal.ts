import { useEffect } from 'react';

const SELECTOR = '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur';

function observe(els: HTMLElement[]) {
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in-view'));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/**
 * Adds the `in-view` class to any reveal element when it enters the viewport.
 * Supports .reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur.
 */
export function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
    return observe(els);
  }, []);
}

/** Re-scans the DOM for new reveal elements (call after route change / dynamic content). */
export function refreshReveal() {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>(SELECTOR)
  ).filter((el) => !el.classList.contains('in-view'));
  observe(els);
}
