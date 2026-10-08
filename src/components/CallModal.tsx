import { useEffect } from 'react';
import { Globe, Phone, PhoneCall, X } from 'lucide-react';
import type { BroadcastPerson } from '../lib/broadcasts';

export function CallModal({ open, onClose, person, onInternetCall }: {
  open: boolean;
  onClose: () => void;
  person: BroadcastPerson | null | undefined;
  onInternetCall: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const name = person?.name || 'utilizador';
  const phone = person?.phone || null;
  const telHref = phone ? `tel:${phone.replace(/\s+/g, '')}` : undefined;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-cardHover sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-cyan/12 text-brand-dark"><PhoneCall size={18} /></span>
            <div>
              <h3 className="font-display text-base font-bold text-ink-900">Ligar</h3>
              <p className="text-xs text-ink-400">para {name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-cloud-100 hover:text-ink-700"><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => { onInternetCall(); }}
            className="flex items-center gap-3 rounded-2xl border border-cloud-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-cyan/50 hover:shadow-soft"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-cyan/12 text-brand-dark"><Globe size={20} /></span>
            <div className="flex-1">
              <p className="font-semibold text-ink-900">Chamada pela internet</p>
              <p className="text-sm text-ink-500">Grátis, sem sair do app.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">Grátis</span>
          </button>

          {telHref ? (
            <a
              href={telHref}
              className="flex items-center gap-3 rounded-2xl border border-cloud-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-cyan/50 hover:shadow-soft"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-900/5 text-ink-700"><Phone size={20} /></span>
              <div className="flex-1">
                <p className="font-semibold text-ink-900">Ligar para o telemóvel</p>
                <p className="text-sm text-ink-500">{phone}</p>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-cloud-200 bg-cloud-50 p-4 text-left opacity-70">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-900/5 text-ink-400"><Phone size={20} /></span>
              <div className="flex-1">
                <p className="font-semibold text-ink-700">Ligar para o telemóvel</p>
                <p className="text-sm text-ink-400">Sem número disponível.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
