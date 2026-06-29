import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type AccordionItem = { q: string; a: string };

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="border-t border-zinc-200">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="border-b border-zinc-200">
            <h3>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="text-base font-medium text-zinc-900">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </h3>
            <div
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pr-8 text-[15px] leading-relaxed text-zinc-600">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
