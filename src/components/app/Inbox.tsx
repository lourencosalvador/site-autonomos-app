import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../Toast';
import { navigate, useRoute } from '../../router';
import {
  type AppNotification, type Unread, EMPTY_UNREAD, markNotificationsRead, myNotifications, myUnread, subscribeInbox,
} from '../../lib/notifications';
import { Modal } from './profile';
import { Btn, EmptyState, Spinner, cx, timeAgo } from './ui';

type InboxValue = {
  unread: Unread;
  refresh: () => void;
  openNotifications: () => void;
};

const InboxContext = createContext<InboxValue>({ unread: EMPTY_UNREAD, refresh: () => {}, openNotifications: () => {} });

export function useInbox() {
  return useContext(InboxContext);
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const route = useRoute();
  const { info } = useToast();
  const [unread, setUnread] = useState<Unread>(EMPTY_UNREAD);
  const [open, setOpen] = useState(false);
  const section = route.name === 'account' ? route.section : '';
  const sectionRef = useRef(section);
  sectionRef.current = section;

  const refresh = useCallback(() => {
    if (!user) return;
    myUnread().then(setUnread).catch(() => {});
  }, [user]);

  useEffect(() => { refresh(); }, [refresh, section]);

  useEffect(() => {
    if (!user) return;
    const poll = setInterval(refresh, 30000);
    const off = subscribeInbox(user.id, {
      onNotification: (n) => {
        refresh();
        info(n.title, n.body ?? undefined);
      },
      onMessage: (m) => {
        if (m.sender_id === user.id) return;
        if (sectionRef.current === `chat/${m.broadcast_id}`) return;
        refresh();
        info('Nova mensagem', m.body.length > 80 ? `${m.body.slice(0, 80)}…` : m.body);
      },
      onMessageRead: refresh,
    });
    return () => { clearInterval(poll); off(); };
  }, [user, refresh, info]);

  const value = useMemo(() => ({ unread, refresh, openNotifications: () => setOpen(true) }), [unread, refresh]);

  return (
    <InboxContext.Provider value={value}>
      {children}
      {user && <NotificationsPanel open={open} onClose={() => setOpen(false)} onChange={refresh} />}
    </InboxContext.Provider>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const { unread, openNotifications } = useInbox();
  const n = unread.notifications;
  return (
    <button onClick={openNotifications} aria-label={n ? `Notificações (${n} por ler)` : 'Notificações'}
      className={cx('relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-cloud-100 hover:text-ink-900', className)}>
      <Bell size={20} />
      {n > 0 && (
        <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white">
          {n > 9 ? '9+' : n}
        </span>
      )}
    </button>
  );
}

export function UnreadDot({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cx('flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white', className)}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

function NotificationsPanel({ open, onClose, onChange }: { open: boolean; onClose: () => void; onChange: () => void }) {
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    myNotifications().then(setItems).catch(() => setItems([]));
  }, [open]);

  const go = async (n: AppNotification) => {
    if (!n.read_at) { await markNotificationsRead([n.id]); onChange(); }
    onClose();
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await markNotificationsRead();
    setItems((list) => list?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? null);
    onChange();
  };

  const hasUnread = items?.some((n) => !n.read_at);

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-4">
        <h3 className="text-lg font-semibold text-ink-900">Notificações</h3>
        <div className="flex items-center gap-1">
          {hasUnread && <Btn variant="ghost" size="sm" onClick={readAll}><CheckCheck size={16} /> Marcar como lidas</Btn>}
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-ink-400 hover:bg-cloud-100">✕</button>
        </div>
      </div>
      {items === null ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={BellOff} title="Sem notificações" description="Quando houver novidades sobre os seus pedidos, aparecem aqui." />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((n) => (
            <li key={n.id}>
              <button onClick={() => go(n)} className={cx('flex w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-cloud-50', !n.read_at && 'bg-brand-cyan/[0.05]')}>
                <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-brand-cyan2')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink-900">{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-[15px] leading-relaxed text-ink-500">{n.body}</span>}
                  <span className="mt-1 block text-sm text-ink-400">{timeAgo(n.created_at)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
