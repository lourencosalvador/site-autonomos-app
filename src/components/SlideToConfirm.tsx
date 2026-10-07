import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, ChevronsRight, Loader2 } from 'lucide-react';

/**
 * Botão "deslizar para confirmar" (estilo iPhone). Arrasta o puxador até ao fim
 * para disparar `onConfirm`. Funciona com rato e toque (pointer events).
 */
export function SlideToConfirm({
  label = 'Deslize para concluir',
  confirmingLabel = 'A concluir…',
  onConfirm,
  busy = false,
  disabled = false,
  tone = 'brand',
}: {
  label?: string;
  confirmingLabel?: string;
  onConfirm: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'brand' | 'emerald';
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const startX = useRef(0);
  const knob = 52; // largura do puxador

  const maxX = () => (trackRef.current ? trackRef.current.clientWidth - knob - 8 : 0);

  const onDown = (e: ReactPointerEvent) => {
    if (busy || disabled || done) return;
    setDragging(true);
    startX.current = e.clientX - x;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    const next = Math.max(0, Math.min(maxX(), e.clientX - startX.current));
    setX(next);
  };
  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (x >= maxX() - 4) {
      setX(maxX());
      setDone(true);
      onConfirm();
    } else {
      setX(0);
    }
  };

  const pct = maxX() > 0 ? x / maxX() : 0;
  const fillColor = tone === 'emerald' ? 'bg-emerald-500' : 'bg-brand-cyan';
  const knobColor = tone === 'emerald' ? 'text-emerald-600' : 'text-brand-dark';

  return (
    <div
      ref={trackRef}
      className="relative h-14 w-full select-none overflow-hidden rounded-full border border-cloud-200 bg-cloud-50"
    >
      {/* preenchimento */}
      <div className={`absolute inset-y-0 left-0 ${fillColor} opacity-20`} style={{ width: x + knob }} />
      {/* texto */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ opacity: 1 - pct }}>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-500">
          {busy ? <><Loader2 size={16} className="animate-spin" /> {confirmingLabel}</> : <>{label} <ChevronsRight size={16} className="animate-pulse" /></>}
        </span>
      </div>
      {/* puxador */}
      <button
        type="button"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        disabled={busy || disabled}
        aria-label={label}
        className={`absolute top-1 flex h-12 items-center justify-center rounded-full bg-white shadow-card ${knobColor} ${dragging ? '' : 'transition-[left] duration-200'} disabled:opacity-60`}
        style={{ left: x + 4, width: knob, touchAction: 'none' }}
      >
        {done || busy ? (busy ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />) : <ChevronsRight size={20} />}
      </button>
    </div>
  );
}
