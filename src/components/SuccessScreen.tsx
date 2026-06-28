import { CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

export function SuccessScreen({
  title,
  message,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
}: {
  title: string;
  message: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel?: string;
  secondaryTo?: string;
}) {
  return (
    <div className="mx-auto max-w-xl animate-scaleIn rounded-3xl border border-brand-cyan/20 bg-white p-10 text-center shadow-card">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-cyan/15 animate-pulseGlow">
        <CheckCircle2 className="h-11 w-11 text-brand-cyan2" />
      </div>
      <h2 className="mt-6 font-display text-2xl font-extrabold text-brand-dark">{title}</h2>
      <p className="mt-3 text-base leading-relaxed text-ink-700/75">{message}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button to={primaryTo} size="md">{primaryLabel}</Button>
        {secondaryLabel && secondaryTo && (
          <Button to={secondaryTo} variant="outline-light" size="md" className="border-brand-dark/20 text-brand-dark hover:bg-brand-dark/5">
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
