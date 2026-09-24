import { useCallback, useEffect, useRef, useState } from 'react';
import { getTotalUnreadCount, uniqueChannelTopic } from '@nepally/shared';
import { supabase } from '../lib/supabase';
import { MESSAGES_READ_EVENT } from '../lib/unreadMessages';

const POLL_INTERVAL_MS = 30_000;

/**
 * Total unread chat messages for the signed-in user. Realtime keeps it live;
 * a thread's "messages read" signal, the focus refresh and the 30s poll keep
 * it correct when realtime events are delayed or missed (reconnects,
 * publication hiccups).
 */
export function useUnreadMessageCount(userId: string | null): number {
  const [count, setCount] = useState(0);
  // Refreshes overlap (a message arriving, then the thread marking it read),
  // and their answers can land in either order: only the latest one counts.
  const latestRequestRef = useRef(0);

  // Every load — first, realtime, signal, focus, poll — goes through this.
  const refresh = useCallback(async () => {
    if (!userId) return;
    latestRequestRef.current += 1;
    const request = latestRequestRef.current;
    const result = await getTotalUnreadCount(supabase, userId);
    if (request === latestRequestRef.current) setCount(result.count);
  }, [userId]);

  // Initial load for each user. A previous user's answer is older than this
  // request, so the guard in refresh drops it.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const onMessagesRead = () => {
      void refresh();
    };
    window.addEventListener(MESSAGES_READ_EVENT, onMessagesRead);
    return () => window.removeEventListener(MESSAGES_READ_EVENT, onMessagesRead);
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId) return;

    const participantsChannel = supabase
      .channel(uniqueChannelTopic(`chat-unread:${userId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` },
        () => {
          void refresh();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(uniqueChannelTopic(`chat-messages-unread:${userId}`))
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
