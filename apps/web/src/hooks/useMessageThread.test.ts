import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, ConversationWithParticipant } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  getMessages: vi.fn(),
  getConversations: vi.fn(),
  markAsRead: vi.fn(),
  sendMessage: vi.fn(),
  subscribeToMessages: vi.fn(),
  removeChannel: vi.fn(),
  announceMessagesRead: vi.fn(),
}));

vi.mock('../lib/unreadMessages', () => ({ announceMessagesRead: mocks.announceMessagesRead }));

vi.mock('../lib/supabase', () => ({ supabase: { removeChannel: mocks.removeChannel } }));
vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMessages: mocks.getMessages,
  getConversations: mocks.getConversations,
  markAsRead: mocks.markAsRead,
  sendMessage: mocks.sendMessage,
  subscribeToMessages: mocks.subscribeToMessages,
}));

import { THREAD_MESSAGE_LIMIT, useMessageThread } from './useMessageThread';

const VIEWER = 'viewer-1';
const PARTNER_ID = 'partner-1';

function message(id: string, senderId: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    conversation_id: 'conv-1',
    sender_id: senderId,
    text: `text ${id}`,
    type: 'text',
    read: false,
    read_at: null,
    timestamp: '2026-09-23T10:00:00Z',
    ...overrides,
  };
}

function conversation(id: string): ConversationWithParticipant {
  return {
    id,
    last_message: null,
    last_message_time: null,
    created_at: '2026-09-20T10:00:00Z',
    other_user_id: PARTNER_ID,
    other_user_name: 'Bikal Shrestha',
    unread_count: 0,
  };
}

interface Subscription {
  onInsert: (message: ChatMessage) => void;
  onUpdate: (message: ChatMessage) => void;
}

let subscription: Subscription | null;
const CHANNEL = { name: 'channel' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function renderLoaded(conversationId = 'conv-1', userId = VIEWER) {
  const hook = renderHook(({ id, user }) => useMessageThread(id, user), {
    initialProps: { id: conversationId as string | null, user: userId as string | null },
  });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('useMessageThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscription = null;
    mocks.getMessages.mockResolvedValue({ data: [message('m1', PARTNER_ID), message('m2', VIEWER)] });
    mocks.getConversations.mockResolvedValue({ data: [conversation('conv-0'), conversation('conv-1')] });
    mocks.markAsRead.mockResolvedValue({});
    mocks.subscribeToMessages.mockImplementation(
      (_client: unknown, _id: string, onInsert: Subscription['onInsert'], onUpdate: Subscription['onUpdate']) => {
        subscription = { onInsert, onUpdate };
        return CHANNEL;
      }
    );
  });

  describe('loading', () => {
    it('loads the newest messages and the partner, then marks the thread read', async () => {
      const { result } = await renderLoaded();

      expect(mocks.getMessages).toHaveBeenCalledWith(expect.anything(), 'conv-1', THREAD_MESSAGE_LIMIT);
      expect(THREAD_MESSAGE_LIMIT).toBe(100);
      expect(mocks.getConversations).toHaveBeenCalledWith(expect.anything(), VIEWER);
      expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
      expect(result.current.partner?.id).toBe('conv-1');
      expect(result.current.error).toBeNull();
      expect(result.current.notFound).toBe(false);
      expect(mocks.markAsRead).toHaveBeenCalledWith(expect.anything(), 'conv-1', VIEWER);
      expect(mocks.subscribeToMessages).toHaveBeenCalledTimes(1);
    });

    it('reports a failed message load as an error', async () => {
      mocks.getMessages.mockResolvedValue({ error: new Error('boom') });
      const { result } = await renderLoaded();

      expect(result.current.error).toBe("Couldn't load this conversation.");
      expect(result.current.notFound).toBe(false);
      expect(result.current.messages).toEqual([]);
    });

    it('reports a failed conversation lookup as an error, not as not-found', async () => {
      mocks.getConversations.mockResolvedValue({ error: new Error('boom') });
      const { result } = await renderLoaded();

      expect(result.current.error).toBe("Couldn't load this conversation.");
      expect(result.current.notFound).toBe(false);
    });

    it("is not found when the viewer's conversations don't include it", async () => {
      mocks.getConversations.mockResolvedValue({ data: [conversation('conv-0')] });
      const { result } = await renderLoaded();

      expect(result.current.notFound).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.partner).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(mocks.markAsRead).not.toHaveBeenCalled();
      expect(mocks.removeChannel).toHaveBeenCalledWith(CHANNEL);
    });

    it('waits for both ids before asking for anything', () => {
      const { result } = renderHook(() => useMessageThread(null, VIEWER));

      expect(result.current.loading).toBe(false);
      expect(mocks.getMessages).not.toHaveBeenCalled();
    });

    it('leaves the channel when the load fails', async () => {
      mocks.getMessages.mockResolvedValue({ error: new Error('boom') });
      await renderLoaded();

      expect(mocks.removeChannel).toHaveBeenCalledWith(CHANNEL);
    });

    it('keeps a message that arrives while the thread is still loading', async () => {
      const conversations = deferred<{ data: ConversationWithParticipant[] }>();
      mocks.getConversations.mockReturnValue(conversations.promise);
      const { result } = renderHook(() => useMessageThread('conv-1', VIEWER));

      // Subscribed before the load finishes, so nothing sent meanwhile is lost.
      expect(mocks.subscribeToMessages).toHaveBeenCalledTimes(1);
      act(() => subscription!.onInsert(message('m3', PARTNER_ID, { timestamp: '2026-09-23T10:05:00Z' })));

      await act(async () => {
        conversations.resolve({ data: [conversation('conv-1')] });
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    });

    it('tells the unread badge once the thread is marked read', async () => {
      await renderLoaded();

      await waitFor(() => expect(mocks.announceMessagesRead).toHaveBeenCalledTimes(1));
    });

    it('does not tell the badge when marking the thread read fails', async () => {
      mocks.markAsRead.mockResolvedValue({ error: new Error('rls') });
      await renderLoaded();
      await act(async () => {});

      expect(mocks.markAsRead).toHaveBeenCalled();
      expect(mocks.announceMessagesRead).not.toHaveBeenCalled();
    });

    it('marks the thread read only once the viewer is known to be in it', async () => {
      const conversations = deferred<{ data: ConversationWithParticipant[] }>();
      mocks.getConversations.mockReturnValue(conversations.promise);
      renderHook(() => useMessageThread('conv-1', VIEWER));
      await act(async () => {});

      expect(mocks.markAsRead).not.toHaveBeenCalled();

      await act(async () => {
        conversations.resolve({ data: [conversation('conv-1')] });
      });

      expect(mocks.markAsRead).toHaveBeenCalledWith(expect.anything(), 'conv-1', VIEWER);
    });

    it("drops a load that lands after the conversation changed", async () => {
      const firstMessages = deferred<{ data: ChatMessage[] }>();
      mocks.getMessages.mockReturnValueOnce(firstMessages.promise);
      mocks.getConversations.mockResolvedValue({ data: [conversation('conv-1'), conversation('conv-2')] });
      const { result, rerender } = renderHook(({ id }) => useMessageThread(id, VIEWER), {
        initialProps: { id: 'conv-1' },
      });

      mocks.getMessages.mockResolvedValue({ data: [message('x1', PARTNER_ID, { conversation_id: 'conv-2' })] });
      rerender({ id: 'conv-2' });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        firstMessages.resolve({ data: [message('m1', PARTNER_ID)] });
      });

      expect(result.current.partner?.id).toBe('conv-2');
      expect(result.current.messages.map((m) => m.id)).toEqual(['x1']);
    });

    it('reload clears the error and loads again', async () => {
      mocks.getMessages.mockResolvedValueOnce({ error: new Error('boom') });
      const { result } = await renderLoaded();
      expect(result.current.error).not.toBeNull();

      act(() => result.current.reload());
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.messages).toHaveLength(2);
    });
  });

  describe('realtime', () => {
    it("appends the partner's new message and marks it read", async () => {
      const { result } = await renderLoaded();
      mocks.markAsRead.mockClear();
      mocks.announceMessagesRead.mockClear();

      await act(async () => subscription!.onInsert(message('m3', PARTNER_ID)));

      expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
      expect(mocks.markAsRead).toHaveBeenCalledWith(expect.anything(), 'conv-1', VIEWER);
      expect(mocks.announceMessagesRead).toHaveBeenCalledTimes(1);
    });

    it("appends the viewer's own message without marking anything read", async () => {
      const { result } = await renderLoaded();
      mocks.markAsRead.mockClear();

      act(() => subscription!.onInsert(message('m3', VIEWER)));

      expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
      expect(mocks.markAsRead).not.toHaveBeenCalled();
    });

    it('ignores a message it already has', async () => {
      const { result } = await renderLoaded();

      act(() => subscription!.onInsert(message('m2', VIEWER)));

      expect(result.current.messages).toHaveLength(2);
    });

    it('replaces an updated message in place', async () => {
      const { result } = await renderLoaded();

      act(() => subscription!.onUpdate(message('m2', VIEWER, { read: true })));

      expect(result.current.messages[1].read).toBe(true);
    });

    it('does not reload or resubscribe when re-rendered with the same ids', async () => {
      const { rerender } = await renderLoaded();

      rerender({ id: 'conv-1', user: VIEWER });

      expect(mocks.getMessages).toHaveBeenCalledTimes(1);
      expect(mocks.subscribeToMessages).toHaveBeenCalledTimes(1);
    });

    it('ignores an event that arrives after leaving the thread', async () => {
      const { result, unmount } = await renderLoaded();
      const late = subscription!;
      const before = result.current.messages;
      unmount();
      mocks.markAsRead.mockClear();

      act(() => late.onInsert(message('m3', PARTNER_ID)));

      expect(mocks.markAsRead).not.toHaveBeenCalled();
      expect(result.current.messages).toBe(before);
    });

    it("ignores an event for another conversation", async () => {
      const { result } = await renderLoaded();

      act(() => subscription!.onInsert(message('x1', PARTNER_ID, { conversation_id: 'conv-9' })));

      expect(result.current.messages).toHaveLength(2);
    });

    it('keeps messages in time order when they arrive out of order', async () => {
      const { result } = await renderLoaded();

      act(() => subscription!.onInsert(message('m4', PARTNER_ID, { timestamp: '2026-09-23T10:10:00Z' })));
      act(() => subscription!.onInsert(message('m3', VIEWER, { timestamp: '2026-09-23T10:05:00Z' })));

      expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    });

    it('unsubscribes on unmount', async () => {
      const { unmount } = await renderLoaded();

      unmount();

      expect(mocks.removeChannel).toHaveBeenCalledWith(CHANNEL);
    });

    it('unsubscribes and starts over when the conversation changes', async () => {
      mocks.getConversations.mockResolvedValue({ data: [conversation('conv-1'), conversation('conv-2')] });
      const { result, rerender } = await renderLoaded();

      mocks.getMessages.mockResolvedValue({ data: [message('x1', PARTNER_ID)] });
      rerender({ id: 'conv-2', user: VIEWER });

      expect(mocks.removeChannel).toHaveBeenCalledWith(CHANNEL);
      expect(result.current.loading).toBe(true);
      expect(result.current.messages).toEqual([]);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.messages.map((m) => m.id)).toEqual(['x1']);
    });
  });

  describe('send', () => {
    it('sends trimmed text and appends the result', async () => {
      mocks.sendMessage.mockResolvedValue({ data: message('m3', VIEWER, { text: 'hi' }) });
      const { result } = await renderLoaded();

      let sent = false;
      await act(async () => {
        sent = await result.current.send('  hi  ');
      });

      expect(sent).toBe(true);
      expect(mocks.sendMessage).toHaveBeenCalledWith(expect.anything(), 'conv-1', VIEWER, 'hi');
      expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    });

    it('does not duplicate a message realtime delivered first', async () => {
      mocks.sendMessage.mockResolvedValue({ data: message('m3', VIEWER) });
      const { result } = await renderLoaded();

      act(() => subscription!.onInsert(message('m3', VIEWER)));
      await act(async () => {
        await result.current.send('hi');
      });

      expect(result.current.messages).toHaveLength(3);
    });

    it('resolves false and leaves the messages alone when sending fails', async () => {
      mocks.sendMessage.mockResolvedValue({ error: new Error('rls') });
      const { result } = await renderLoaded();
      const before = result.current.messages;

      let sent = true;
      await act(async () => {
        sent = await result.current.send('hi');
      });

      expect(sent).toBe(false);
      expect(result.current.messages).toBe(before);
    });

    it('does not add a send that lands after the conversation changed', async () => {
      const pending = deferred<{ data: ChatMessage }>();
      mocks.sendMessage.mockReturnValue(pending.promise);
      mocks.getConversations.mockResolvedValue({ data: [conversation('conv-1'), conversation('conv-2')] });
      const { result, rerender } = await renderLoaded();

      let sending!: Promise<boolean>;
      act(() => {
        sending = result.current.send('hi');
      });
      mocks.getMessages.mockResolvedValue({ data: [] });
      rerender({ id: 'conv-2', user: VIEWER });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let sent = false;
      await act(async () => {
        pending.resolve({ data: message('m3', VIEWER) });
        sent = await sending;
      });

      expect(sent).toBe(true);
      expect(result.current.messages).toEqual([]);
    });

    it('resolves false without a request for blank text', async () => {
      const { result } = await renderLoaded();

      let sent = true;
      await act(async () => {
        sent = await result.current.send('   ');
      });

      expect(sent).toBe(false);
      expect(mocks.sendMessage).not.toHaveBeenCalled();
    });
  });
});
