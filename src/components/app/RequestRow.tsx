import { CalendarDays, ChevronRight, MapPin, MessageSquare } from 'lucide-react';
import { navigate } from '../../router';
import { type Broadcast, locationLine } from '../../lib/broadcasts';
import { stageLabel } from '../../lib/requestStage';
import { formatKz } from '../../lib/payments';
import { Avatar, Badge, formatDate, timeAgo } from './ui';

export function RequestRow({ r, asProvider }: { r: Broadcast; asProvider: boolean }) {
  const label = stageLabel(r, asProvider);
  const person = asProvider ? r.client : r.provider;
  const amount = r.quote_status === 'accepted' && r.price_minor
    ? formatKz(asProvider ? r.provider_net_minor ?? r.price_minor : r.price_minor + (r.client_fee_minor ?? 0))
    : r.quote_minor ? formatKz(r.quote_minor) : null;
  const loc = locationLine(r);
  const when = r.visit_at && r.visit_status === 'scheduled'
    ? `Visita ${new Date(r.visit_at).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : r.service_date ? `${formatDate(r.service_date)}${r.service_time ? `, ${r.service_time}` : ''}` : null;
  return (
    <button
      onClick={() => navigate(`/conta/pedido/${r.id}`)}
      className="group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-cloud-50 sm:px-6"
    >
      <Avatar name={person?.name || r.category} src={person?.avatar_url} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-base font-semibold text-ink-900">{r.category}</p>
          <Badge tone={label.tone}>
            {label.action && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            {label.label}
          </Badge>
          {!!r.unread && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-0.5 text-[13px] font-semibold text-red-600">
              <MessageSquare size={13} /> {r.unread}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[15px] text-ink-500">
          {person?.name ? `${person.name} · ` : ''}{r.description}
        </p>
        {(loc || when) && (
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-ink-400">
            {loc && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {loc}</span>}
            {when && <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> {when}</span>}
          </p>
        )}
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        {amount && <p className="text-[15px] font-semibold text-ink-900">{amount}</p>}
        <p className="text-sm text-ink-400">{timeAgo(r.created_at)}</p>
      </div>
      <ChevronRight size={18} className="mt-1 shrink-0 text-ink-300 transition-colors group-hover:text-ink-500" />
    </button>
  );
}
