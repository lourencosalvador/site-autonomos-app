import { supabase } from './supabase';

export type Message = {
  id: string;
  broadcast_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export async function listMessages(broadcastId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('broadcast_messages')
    .select('*')
    .eq('broadcast_id', broadcastId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Message[] | null) ?? [];
}

export async function sendMessage(broadcastId: string, body: string): Promise<Message> {
  const { data, error } = await supabase.rpc('send_message', { p_broadcast: broadcastId, p_body: body });
  if (error) throw error;
  return data as Message;
}

export async function markRead(broadcastId: string): Promise<void> {
  await supabase.rpc('mark_messages_read', { p_broadcast: broadcastId });
}

export function subscribeMessages(broadcastId: string, onInsert: (m: Message) => void): () => void {
  const channel = supabase
    .channel('msg:' + broadcastId + ':' + Math.random().toString(36).slice(2, 8))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'broadcast_messages', filter: `broadcast_id=eq.${broadcastId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
