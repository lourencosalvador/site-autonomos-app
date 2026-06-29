import { Check } from 'lucide-react';
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
    <div className="mx-auto max-w-xl animate-scaleIn rounded-2xl border border-zinc-200 bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-700 text-white">
        <Check size={26} strokeWidth={2.5} />
      </div>
      <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-zinc-900">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">{message}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button to={primaryTo} size="md">{primaryLabel}</Button>
        {secondaryLabel && secondaryTo && (
          <Button to={secondaryTo} variant="secondary" size="md">{secondaryLabel}</Button>
        )}
      </div>
    </div>
  );
}
