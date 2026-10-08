import { useState } from 'react';
import { Loader2, Star, X } from 'lucide-react';
import { TextArea } from './Field';
import { rateProvider } from '../lib/hub';

export function RatingModal({ open, broadcastId, providerName, onClose, onDone }: {
  open: boolean;
  broadcastId: string;
  providerName: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    if (rating < 1) { setError('Escolha de 1 a 5 estrelas.'); return; }
    setBusy(true);
    setError(null);
    try {
      await rateProvider(broadcastId, rating, comment.trim() || undefined);
      onDone?.();
      onClose();
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(code.includes('ALREADY_RATED') ? 'Já avaliou este serviço.' : 'Não foi possível enviar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-cardHover sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mb-1 flex items-start justify-between">
          <h3 className="font-display text-lg font-bold text-ink-900">Como correu o serviço?</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-cloud-100"><X size={18} /></button>
        </div>
        <p className="text-sm text-ink-500">Avalie {providerName}.</p>

        <div className="mt-4 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => { setRating(n); setError(null); }}
              aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star size={34} className={n <= shown ? 'fill-amber-400 text-amber-400' : 'text-cloud-300'} />
            </button>
          ))}
        </div>

        <div className="mt-4">
          <TextArea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Deixe um comentário (opcional)…" className="min-h-[90px]" />
        </div>

        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-cloud-200 px-4 py-3 text-sm font-semibold text-ink-600 hover:bg-cloud-100">Agora não</button>
          <button onClick={submit} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-dark px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark2 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : 'Enviar avaliação'}
          </button>
        </div>
      </div>
    </div>
  );
}
