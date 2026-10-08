import { useEffect, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useRoute, navigate } from '../router';
import { type IncomingCall, subscribeIncomingCalls, notifyCallEvent } from '../lib/call';

export function IncomingCallOverlay() {
  const { user } = useAuth();
  const route = useRoute();
  const [call, setCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeIncomingCalls(user.id, {
      onRing: (c) => setCall(c),
      onCancel: (broadcastId) => setCall((cur) => (cur?.broadcastId === broadcastId ? null : cur)),
    });
  }, [user?.id]);

  useEffect(() => {
    if (!call) return;
    const t = setTimeout(() => setCall(null), 45000);
    return () => clearTimeout(t);
  }, [call]);

  if (!call || !user) return null;

  if (route.name === 'account' && route.section === `chamada/${call.broadcastId}`) return null;

  const initials = (call.fromName || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const answer = () => { const id = call.broadcastId; setCall(null); navigate(`/conta/chamada/${id}`); };
  const decline = () => { void notifyCallEvent(call.fromId, 'decline', { broadcastId: call.broadcastId }); setCall(null); };

  return (
    <div className="fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-3">
      <div className="w-full max-w-sm animate-[slideDown_0.25s_ease-out] rounded-3xl border border-cloud-200 bg-white p-4 shadow-cardHover">
        <div className="flex items-center gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dark text-base font-bold text-white">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-cyan/30" />
            {call.fromAvatar ? <img src={call.fromAvatar} alt="" className="relative h-full w-full object-cover" /> : <span className="relative">{initials}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold text-ink-900">{call.fromName}</p>
            <p className="text-sm text-ink-500">Chamada a receber…</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={decline} className="flex items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-2.5 font-semibold text-red-600 transition-colors hover:bg-red-100">
            <PhoneOff size={18} /> Recusar
          </button>
          <button onClick={answer} className="flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-600">
            <Phone size={18} /> Atender
          </button>
        </div>
      </div>
    </div>
  );
}
