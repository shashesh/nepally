import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getConversations, getMessages, markAsRead, sendMessage, subscribeToMessages } from '@nepally/shared';
import type { ChatMessage, ConversationWithParticipant } from '@nepally/shared';
import { supabase } from '../lib/supabase';

export const THREAD_MESSAGE_LIMIT = 100;

const LOAD_ERROR = "Couldn't load this conversation.";

interface ThreadData {
  messages: ChatMessage[];
  /** From getConversations; null until found. */
  partner: ConversationWithParticipant | null;
  loading: boolean;
  error: string | null;
  /** getConversations succeeded and this id is not among them. */
  notFound: boolean;
}

export interface MessageThreadState extends ThreadData {
  reload: () => void;
  /** Resolves false on failure, leaving the messages as they were. */
  send: (text: string) => Promise<boolean>;
}

function startState(active: boolean): ThreadData {
  return { messages: [], partner: null, loading: active, error: null, notFound: false };
}

function threadKey(conversationId: string | null, userId: string | null): string | null {
  return conversationId && userId ? `${conversationId}:${userId}` : null;
}

/** Adds a message unless it is already there (a send and its realtime echo race). */
function withMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return messages.some((existing) => existing.id === message.id) ? messages : [...messages, message];
}

/**
 * One conversation: its newest messages, the other participant, live updates
 * and sending. The conversation list doubles as the access check — a thread
 * the viewer isn't in, or one with a member they've blocked, isn't in it, so
 * it is reported as not found rather than opened with a composer that would
 * fail on RLS.
 *
 * Keyed on the two ids, never the user object, so an AuthContext refresh
 * doesn't reload the thread or resubscribe. State resets during render when
 * the key changes (useUserList's pattern), and the effect only sets state
 * after an await, guarded by `cancelled`.
 */
export function useMessageThread(conversationId: string | null, userId: string | null): MessageThreadState {
  const key = threadKey(conversationId, userId);
  const [state, setState] = useState<ThreadData>(() => startState(key !== null));
  const [attempt, setAttempt] = useState(0);

  const [requestedKey, setRequestedKey] = useState(key);
  if (key !== requestedKey) {
    setRequestedKey(key);
    setState(startState(key !== null));
  }

  // The thread a send belongs to, checked when its result lands.
  const keyRef = useRef(key);
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  useEffect(() => {
    if (!conversationId || !userId) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const id = conversationId;
    const viewerId = userId;

    async function load(): Promise<void> {
      const [messagesResult, conversationsResult] = await Promise.all([
        getMessages(supabase, id, THREAD_MESSAGE_LIMIT),
        getConversations(supabase, viewerId),
      ]);
      if (cancelled) return;

      if (messagesResult.error || conversationsResult.error) {
        setState({ ...startState(false), error: LOAD_ERROR });
        return;
      }

      const partner = conversationsResult.data?.find((conversation) => conversation.id === id) ?? null;
      if (!partner) {
        setState({ ...startState(false), notFound: true });
        return;
      }

      setState({ messages: messagesResult.data ?? [], partner, loading: false, error: null, notFound: false });
      void markAsRead(supabase, id, viewerId);

      channel = subscribeToMessages(
        supabase,
        id,
        (incoming) => {
          setState((previous) => ({ ...previous, messages: withMessage(previous.messages, incoming) }));
          if (incoming.sender_id !== viewerId) void markAsRead(supabase, id, viewerId);
        },
        (updated) => {
          setState((previous) => ({
            ...previous,
            messages: previous.messages.map((message) => (message.id === updated.id ? updated : message)),
          }));
        }
      );
    }

    void load();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, userId, attempt]);

  const reload = useCallback((): void => {
    if (!conversationId || !userId) return;
    setState((previous) => ({ ...previous, loading: true, error: null, notFound: false }));
    setAttempt((count) => count + 1);
  }, [conversationId, userId]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || !conversationId || !userId) return false;

      const sentFrom = threadKey(conversationId, userId);
      const result = await sendMessage(supabase, conversationId, userId, trimmed);
      if (!result.data) return false;

      // Sent, but the view has moved to another thread: don't add it there.
      if (keyRef.current !== sentFrom) return true;
      const sent = result.data;
      setState((previous) => ({ ...previous, messages: withMessage(previous.messages, sent) }));
      return true;
    },
    [conversationId, userId]
  );

  return { ...state, reload, send };
}
