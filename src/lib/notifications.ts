import { supabase } from './supabase';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  broadcast_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type Unread = { notifications: number; messages: number; by_broadcast: Record<string, number> };

export const EMPTY_UNREAD: Unread = { notifications: 0, messages: 0, by_broadcast: {} };

export async function myNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase.rpc('my_notifications', { p_limit: limit });
  if (error) throw error;
  return (data as AppNotification[] | null) ?? [];
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  await supabase.rpc('mark_notifications_read', { p_ids: ids ?? null });
}

export async function myUnread(): Promise<Unread> {
  const { data, error } = await supabase.rpc('my_unread');
  if (error) throw error;
  const d = (data as Unread | null) ?? EMPTY_UNREAD;
  return { notifications: Number(d.notifications) || 0, messages: Number(d.messages) || 0, by_broadcast: d.by_broadcast ?? {} };
}

export function subscribeInbox(userId: string, handlers: {
  onNotification: (n: AppNotification) => void;
  onMessage: (m: { broadcast_id: string; sender_id: string; body: string }) => void;
  onMessageRead: () => void;
}): () => void {
  const channel = supabase
    .channel(`inbox:${userId}:${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (p) => handlers.onNotification(p.new as AppNotification))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_messages' },
      (p) => handlers.onMessage(p.new as { broadcast_id: string; sender_id: string; body: string }))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'broadcast_messages' }, () => handlers.onMessageRead())
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
