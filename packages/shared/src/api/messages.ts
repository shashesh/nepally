/**
 * Shared Messages API functions
 * All Supabase query logic — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage } from '../types/chat';

/**
 * Get messages for a conversation in chronological order
 */
export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = 50
): Promise<{ data?: ChatMessage[]; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { data: (data || []) as ChatMessage[] };
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to fetch messages'),
    };
  }
}

/**
 * Send a message and update conversation metadata
 */
export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  text: string
): Promise<{ data?: ChatMessage; error?: Error }> {
  try {
    const now = new Date().toISOString();

    // Insert message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        text,
        type: 'text',
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update conversation last_message and last_message_time
    await supabase
      .from('conversations')
      .update({
        last_message: text.substring(0, 100),
        last_message_time: now,
      })
      .eq('id', conversationId);

    // Increment unread_count for the OTHER participant
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('id, user_id, unread_count')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId);

    if (participants && participants.length > 0) {
      const otherPart = participants[0];
      await supabase
        .from('conversation_participants')
        .update({ unread_count: (otherPart.unread_count || 0) + 1 })
        .eq('id', otherPart.id);
    }

    return { data: message as ChatMessage };
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to send message'),
    };
  }
}

/**
 * Mark all unread messages in a conversation as read for a user
 */
export async function markAsRead(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<{ error?: Error }> {
  try {
    const now = new Date().toISOString();

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ read: true, read_at: now })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false);

    // Reset unread_count
    await supabase
      .from('conversation_participants')
      .update({ unread_count: 0 })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    return {};
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to mark as read'),
    };
  }
}

/**
 * Subscribe to new messages in a conversation via Supabase Realtime.
 * Returns a RealtimeChannel that the caller should unsubscribe when done.
 */
export function subscribeToMessages(
  supabase: SupabaseClient,
  conversationId: string,
  onNewMessage: (message: ChatMessage) => void,
  onMessageUpdate?: (message: ChatMessage) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as ChatMessage);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessageUpdate?.(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Get total unread message count across all conversations for a user
 */
export async function getTotalUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ count: number; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('unread_count')
      .eq('user_id', userId)
      .gt('unread_count', 0);

    if (error) throw error;

    const count = (data || []).reduce(
      (sum, p) => sum + (p.unread_count || 0),
      0
    );
    return { count };
  } catch (error) {
    return {
      count: 0,
      error: error instanceof Error
        ? error
        : new Error('Failed to get unread count'),
    };
  }
}
