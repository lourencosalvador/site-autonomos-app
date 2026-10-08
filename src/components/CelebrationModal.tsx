import { useMemo } from 'react';
import { Wallet, X } from 'lucide-react';

const COLORS = ['#02E6FF', '#03475E', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'];

export function CelebrationModal({ open, onClose, onWallet }: { open: boolean; onClose: () => void; onWallet: () => void }) {
  const pieces = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({
      left: Math.random() * 100,
      dx: (Math.random() * 2 - 1) * 60,
      delay: Math.random() * 0.6,
      dur: 2.4 + Math.random() * 1.8,
      color: COLORS[i % COLORS.length],
      rot: Math.random() * 360,
    })),
    [],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {pieces.map((p, i) => (
          <span key={i} className="confetti-piece" style={{
            left: `${p.left}%`,
            background: p.color,
            ['--dx']: `${p.dx}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          } as React.CSSProperties} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-cardHover" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-ink-400 hover:bg-cloud-100"><X size={18} /></button>
        <div className="mx-auto mb-3 text-5xl">🎉</div>
        <h3 className="font-display text-xl font-extrabold text-ink-900">Parabéns!</h3>
        <p className="mt-2 text-ink-600">Concluiu um serviço com sucesso. Assim que o cliente confirmar, o valor fica disponível na sua carteira.</p>
        <button
          onClick={onWallet}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3.5 font-semibold text-white transition-colors hover:bg-brand-dark2"
        >
          <Wallet size={18} /> Ir para a carteira
        </button>
      </div>
    </div>
  );
}
