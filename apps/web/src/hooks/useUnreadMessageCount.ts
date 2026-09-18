import { useCallback, useEffect, useState } from 'react';
import { getTotalUnreadCount } from '@nepally/shared';
import { supabase } from '../lib/supabase';

const POLL_INTERVAL_MS = 30_000;

/**
 * Total unread chat messages for the signed-in user. Realtime keeps it live;
 * the focus refresh and 30s poll keep it correct when realtime events are
 * delayed or missed (reconnects, publication hiccups).
 */
export function useUnreadMessageCount(userId: string | null): number {
  const [count, setCount] = useState(0);

  // Realtime events and the poll refresh through this.
  const refresh = useCallback(async () => {
    if (!userId) return;
    const result = await getTotalUnreadCount(supabase, userId);
    setCount(result.count);
  }, [userId]);

  // Initial load for each user; a response for a previous user is dropped.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getTotalUnreadCount(supabase, userId).then((result) => {
      if (!cancelled) setCount(result.count);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const participantsChannel = supabase
      .channel(`chat-unread:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` },
        () => {
          void refresh();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`chat-messages-unread:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const message = payload.new as { sender_id?: string };
        if (message.sender_id !== userId) void refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId) return;

    const onVisibilityChange = () => {
      if (!document.hidden) void refresh();
    };
    const intervalId = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId, refresh]);

  return userId ? count : 0;
}
