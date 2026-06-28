import { useEffect, useRef } from 'react';

/**
 * Adds the `in-view` class to any `.reveal` element when it enters the viewport.
 * Runs once on mount and observes all current `.reveal` nodes.
 */
export function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (!('IntersectionObserver' in window) || els.length === 0) {
      els.forEach((el) => el.classList.add('in-view'));
      return;
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
    observerRef.current = io;
    els.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);
}

/** Re-scans the DOM for new `.reveal` elements (call after route change / dynamic content). */
export function refreshReveal() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.in-view)'));
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in-view'));
    return;
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
}
