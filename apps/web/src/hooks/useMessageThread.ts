import { useCallback, useEffect, useState } from 'react';
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

/**
 * Adds a message in time order unless it is already there: a send races its
 * own realtime echo, and a send and an incoming message can land in either
 * order. buildThreadDays needs chronological input.
 */
function withMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (messages.some((existing) => existing.id === message.id)) return messages;
  const at = messages.findIndex((existing) => existing.timestamp > message.timestamp);
  return at === -1 ? [...messages, message] : [...messages.slice(0, at), message, ...messages.slice(at)];
}

/**
 * One conversation: its newest messages, the other participant, live updates
 * and sending. The conversation list doubles as the access check — a thread
 * the viewer isn't in, or one with a member they've blocked, isn't in it, so
 * it is reported as not found rather than opened with a composer that would
 * fail on RLS.
 *
 * It subscribes before loading, so a message sent while the load is in
 * flight is kept rather than missed, and merges the load into anything that
 * arrived meanwhile. RLS only delivers a conversation's rows to its members,
 * so subscribing before the access check leaks nothing; the channel is left
 * as soon as the check fails.
 *
 * Keyed on the two ids, never the user object, so an AuthContext refresh
 * doesn't reload the thread or resubscribe. State resets during render when
 * the key changes (useUserList's pattern), and the effect only sets state
 * after an await or from a realtime callback, both guarded by `cancelled`.
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

  useEffect(() => {
    if (!conversationId || !userId) return;

    let cancelled = false;
    const id = conversationId;
    const viewerId = userId;

    // `removeChannel` is a round trip, and events already in flight for this
    // channel can still arrive while it leaves: drop them.
    const channel: RealtimeChannel = subscribeToMessages(
      supabase,
      id,
      (incoming) => {
        if (cancelled || incoming.conversation_id !== id) return;
        setState((previous) => ({ ...previous, messages: withMessage(previous.messages, incoming) }));
        if (incoming.sender_id !== viewerId) void markAsRead(supabase, id, viewerId);
      },
      (updated) => {
        if (cancelled || updated.conversation_id !== id) return;
        setState((previous) => ({
          ...previous,
          messages: previous.messages.map((message) => (message.id === updated.id ? updated : message)),
        }));
      }
    );

    async function load(): Promise<void> {
      const [messagesResult, conversationsResult] = await Promise.all([
        getMessages(supabase, id, THREAD_MESSAGE_LIMIT),
        getConversations(supabase, viewerId),
      ]);
      if (cancelled) return;

      if (messagesResult.error || conversationsResult.error) {
        void supabase.removeChannel(channel);
        setState({ ...startState(false), error: LOAD_ERROR });
        return;
      }

      const partner = conversationsResult.data?.find((conversation) => conversation.id === id) ?? null;
      if (!partner) {
        void supabase.removeChannel(channel);
        setState({ ...startState(false), notFound: true });
        return;
      }

      const loaded = messagesResult.data ?? [];
      setState((previous) => ({
        messages: previous.messages.reduce(withMessage, loaded),
        partner,
        loading: false,
        error: null,
        notFound: false,
      }));
      void markAsRead(supabase, id, viewerId);
    }

    void load();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
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

      const result = await sendMessage(supabase, conversationId, userId, trimmed);
      if (!result.data) return false;

      // Sent, but the view may have moved to another thread since: only add
      // it to the thread it belongs to.
      const sent = result.data;
      setState((previous) =>
        previous.partner?.id === sent.conversation_id
          ? { ...previous, messages: withMessage(previous.messages, sent) }
          : previous
      );
      return true;
    },
    [conversationId, userId]
  );

  return { ...state, reload, send };
}
