import { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import { TextArea } from './Field';
import { useToast } from './Toast';
import { Modal } from './app/profile';
import { Avatar, Btn, cx } from './app/ui';
import { rateClient, rateProvider } from '../lib/hub';

const LABELS = ['', 'Mau', 'Fraco', 'Razoável', 'Bom', 'Excelente'];

export function RatingModal({ open, broadcastId, providerName, avatarUrl, onClose, onDone, target = 'provider' }: {
  target?: 'provider' | 'client';
  open: boolean;
  broadcastId: string;
  providerName: string;
  avatarUrl?: string | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { success } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setRating(0); setHover(0); setComment(''); setError(null); }
  }, [open]);

  const submit = async () => {
    if (rating < 1) { setError('Escolha de 1 a 5 estrelas.'); return; }
    setBusy(true);
    setError(null);
    try {
      await (target === 'client' ? rateClient : rateProvider)(broadcastId, rating, comment.trim() || undefined);
      success('Obrigado pela avaliação', 'A sua opinião ajuda a manter a confiança na plataforma.');
      onDone?.();
      onClose();
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(code.includes('ALREADY_RATED') ? 'Já avaliou este serviço.' : code.includes('NOT_COMPLETED') ? 'Só pode avaliar depois de o serviço estar concluído.' : 'Não foi possível enviar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;
  const isProvider = target === 'provider';

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} className="max-w-md">
      <div className="relative px-6 pb-6 pt-7 text-center sm:px-8">
        <button onClick={onClose} disabled={busy} aria-label="Fechar"
          className="absolute right-3 top-3 rounded-lg p-2 text-ink-400 transition-colors hover:bg-cloud-100 hover:text-ink-700">
          <X size={20} />
        </button>
        <div className="flex justify-center"><Avatar name={providerName} src={avatarUrl} size="lg" /></div>
        <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink-900">{isProvider ? 'Como correu o serviço?' : 'Como foi o cliente?'}</h3>
        <p className="mt-1 text-[15px] text-ink-500">Avalie {providerName}. {isProvider ? 'A avaliação aparece no perfil do profissional.' : 'Só a equipa e outros profissionais a veem.'}</p>

        <div className="mt-6 flex justify-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Classificação">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} estrela${n > 1 ? 's' : ''}: ${LABELS[n]}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => { setRating(n); setError(null); }}
              className="rounded-lg p-1.5 transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan2/60"
            >
              <Star size={36} strokeWidth={1.6} className={cx('transition-colors', n <= shown ? 'fill-amber-400 text-amber-400' : 'text-cloud-300')} />
            </button>
          ))}
        </div>
        <p className={cx('mt-2 h-6 text-[15px] font-semibold transition-opacity', shown ? 'text-ink-900 opacity-100' : 'opacity-0')} aria-live="polite">
          {LABELS[shown]}
        </p>

        <TextArea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={isProvider ? 'Conte como foi (opcional): pontualidade, qualidade, simpatia…' : 'Comentário (opcional)'}
          className="mt-4 min-h-[96px] text-left"
          maxLength={500}
        />
        {error && <p className="mt-2 text-left text-sm font-medium text-red-600">{error}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-line px-6 py-4 sm:px-8">
        <Btn variant="outline" onClick={onClose} disabled={busy}>Agora não</Btn>
        <Btn onClick={submit} loading={busy} disabled={rating < 1}>Enviar</Btn>
      </div>
    </Modal>
  );
}
