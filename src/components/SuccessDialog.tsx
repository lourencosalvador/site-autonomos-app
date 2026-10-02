import { useEffect, useRef, type ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

/**
 * Pop-up de confirmação mostrado depois de uma ação bem-sucedida
 * (pedido de serviço, registo de profissional). Fecha no botão ou com Esc.
 */
export function SuccessDialog({
  open,
  title,
  children,
  confirmLabel,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onClose: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fadeIn bg-brand-dark3/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-dialog-title"
        className="relative w-full max-w-md animate-scaleIn overflow-hidden rounded-3xl bg-white text-center shadow-cardDark"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#02E6FF] via-[#0AC8E0] to-[#03475E]" />
        <div className="px-7 pb-7 pt-9 sm:px-9">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-cyan/15 animate-pulseGlow">
            <CheckCircle2 className="h-11 w-11 text-brand-cyan2" />
          </div>
          <h2 id="success-dialog-title" className="mt-6 font-display text-2xl font-extrabold text-brand-dark">
            {title}
          </h2>
          <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-700/80">{children}</div>
          <button
            ref={buttonRef}
            type="button"
            onClick={onClose}
            className="mt-8 w-full rounded-full bg-brand-dark py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-brand-cyan hover:text-brand-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-cyan/40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
