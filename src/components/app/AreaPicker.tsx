import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { cx } from './ui';

export const MAX_AREAS = 3;

export function AreaPicker({ options, value, onChange, hasError }: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState('');
  const full = value.length >= MAX_AREAS;
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !q || o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (area: string) => {
    if (value.includes(area)) onChange(value.filter((a) => a !== area));
    else if (!full) onChange([...value, area]);
  };

  return (
    <div className={cx('rounded-xl border bg-white', hasError ? 'border-red-400' : 'border-line')}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        {value.length === 0 ? (
          <span className="text-[15px] text-ink-400">Escolha até {MAX_AREAS} áreas</span>
        ) : (
          value.map((a) => (
            <span key={a} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-dark py-1 pl-2.5 pr-1.5 text-sm font-medium text-white">
              {a}
              <button type="button" onClick={() => toggle(a)} aria-label={`Remover ${a}`} className="rounded-md p-0.5 text-white/70 hover:bg-white/10 hover:text-white">
                <X size={14} />
              </button>
            </span>
          ))
        )}
        <span className="ml-auto text-sm tabular-nums text-ink-400">{value.length}/{MAX_AREAS}</span>
      </div>
      <div className="relative border-b border-line">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar área…"
          className="h-11 w-full bg-transparent pl-10 pr-3 text-[15px] text-ink-900 placeholder:text-ink-400/70 focus:outline-none"
        />
      </div>
      <ul className="max-h-60 overflow-y-auto p-1.5" role="listbox" aria-multiselectable="true">
        {list.map((o) => {
          const selected = value.includes(o);
          const disabled = !selected && full;
          return (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => toggle(o)}
                className={cx(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors',
                  selected ? 'bg-brand-cyan/10 font-medium text-ink-900' : 'text-ink-700 hover:bg-cloud-100',
                  disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                )}
              >
                {o}
                <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', selected ? 'border-brand-dark bg-brand-dark text-white' : 'border-line')}>
                  {selected && <Check size={13} strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="px-3 py-4 text-center text-[15px] text-ink-400">Nenhuma área encontrada.</li>}
      </ul>
    </div>
  );
}
