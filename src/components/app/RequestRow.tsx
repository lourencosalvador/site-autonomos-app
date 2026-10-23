import { ChevronRight } from 'lucide-react';
import { navigate } from '../../router';
import type { Broadcast } from '../../lib/broadcasts';
import { stageLabel } from '../../lib/requestStage';
import { formatKz } from '../../lib/payments';
import { Avatar, Badge, timeAgo } from './ui';

export function RequestRow({ r, asProvider }: { r: Broadcast; asProvider: boolean }) {
  const label = stageLabel(r, asProvider);
  const person = asProvider ? r.client : r.provider;
  const amount = r.quote_status === 'accepted' && r.price_minor ? formatKz(r.price_minor) : null;
  return (
    <button
      onClick={() => navigate(`/conta/pedido/${r.id}`)}
      className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-cloud-50 sm:px-6"
    >
      <Avatar name={person?.name || r.category} src={person?.avatar_url} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-base font-semibold text-ink-900">{r.category}</p>
          <Badge tone={label.tone}>
            {label.action && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            {label.label}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-[15px] text-ink-500">
          {person?.name ? `${person.name} · ` : ''}{r.description}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        {amount && <p className="text-[15px] font-semibold text-ink-900">{amount}</p>}
        <p className="text-sm text-ink-400">{timeAgo(r.created_at)}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-ink-300 transition-colors group-hover:text-ink-500" />
    </button>
  );
}
