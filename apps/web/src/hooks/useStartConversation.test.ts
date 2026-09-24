import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  push: vi.fn(),
  getOrCreateConversation: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('./useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('../lib/supabase', () => ({ supabase: { tag: 'client' } }));
vi.mock('../components/ui/notify', () => ({ notify: { error: mocks.notifyError, success: vi.fn() } }));
vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getOrCreateConversation: mocks.getOrCreateConversation,
}));

import { useStartConversation } from './useStartConversation';

const VIEWER = { id: 'viewer-1', full_name: 'Asha Gurung' };
const PARTNER = { id: 'partner-1', name: 'Bikal Shrestha' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useStartConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: VIEWER });
    mocks.getOrCreateConversation.mockResolvedValue({ data: { conversationId: 'conv-9' } });
  });

  it('opens the conversation it finds or creates', async () => {
    const { result } = renderHook(() => useStartConversation());

    await act(() => result.current.start(PARTNER));

    expect(mocks.getOrCreateConversation).toHaveBeenCalledWith(
      { tag: 'client' },
      'viewer-1',
      'Asha Gurung',
      'partner-1',
      'Bikal Shrestha'
    );
    expect(mocks.push).toHaveBeenCalledWith('/messages/conv-9');
    expect(mocks.notifyError).not.toHaveBeenCalled();
  });

  it('says so and stays put when the conversation cannot be started', async () => {
    mocks.getOrCreateConversation.mockResolvedValue({ error: new Error('rls') });
    const { result } = renderHook(() => useStartConversation());

    await act(() => result.current.start(PARTNER));

    expect(mocks.notifyError).toHaveBeenCalledWith("Couldn't start a conversation. Please try again.");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to log in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useStartConversation());

    await act(() => result.current.start(PARTNER));

    expect(mocks.push).toHaveBeenCalledWith('/login');
    expect(mocks.getOrCreateConversation).not.toHaveBeenCalled();
  });

  it('does nothing for the viewer themselves', async () => {
    const { result } = renderHook(() => useStartConversation());

    await act(() => result.current.start({ id: 'viewer-1', name: 'Asha Gurung' }));

    expect(mocks.getOrCreateConversation).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('ignores a second press while the first is pending, and reports starting', async () => {
    const pending = deferred<{ data: { conversationId: string } }>();
    mocks.getOrCreateConversation.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useStartConversation());

    let first!: Promise<void>;
    act(() => {
      first = result.current.start(PARTNER);
    });
    expect(result.current.starting).toBe(true);

    await act(() => result.current.start(PARTNER));
    expect(mocks.getOrCreateConversation).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ data: { conversationId: 'conv-9' } });
      await first;
    });
    expect(mocks.push).toHaveBeenCalledTimes(1);
    // Stays busy while the route changes, so the button can't start another.
    expect(result.current.starting).toBe(true);
  });

  it('is ready again after a failure', async () => {
    mocks.getOrCreateConversation.mockResolvedValue({ error: new Error('rls') });
    const { result } = renderHook(() => useStartConversation());

    await act(() => result.current.start(PARTNER));
    expect(result.current.starting).toBe(false);

    await act(() => result.current.start(PARTNER));
    expect(mocks.getOrCreateConversation).toHaveBeenCalledTimes(2);
  });

  it('runs beforeStart once, inside the double-press guard, before starting', async () => {
    const counted = deferred<void>();
    const beforeStart = vi.fn(() => counted.promise);
    const { result } = renderHook(() => useStartConversation());

    let first!: Promise<void>;
    act(() => {
      first = result.current.start(PARTNER, { beforeStart });
    });
    expect(result.current.starting).toBe(true);
    expect(mocks.getOrCreateConversation).not.toHaveBeenCalled();

    await act(() => result.current.start(PARTNER, { beforeStart }));
    expect(beforeStart).toHaveBeenCalledTimes(1);

    await act(async () => {
      counted.resolve();
      await first;
    });
    expect(mocks.getOrCreateConversation).toHaveBeenCalledTimes(1);
    expect(mocks.push).toHaveBeenCalledWith('/messages/conv-9');
  });

  it('still opens the conversation when beforeStart fails', async () => {
    const { result } = renderHook(() => useStartConversation());

    await act(() => result.current.start(PARTNER, { beforeStart: () => Promise.reject(new Error('rpc')) }));

    expect(mocks.push).toHaveBeenCalledWith('/messages/conv-9');
  });

  it('does not create a conversation once the caller has gone', async () => {
    const counted = deferred<void>();
    const { result, unmount } = renderHook(() => useStartConversation());

    let started!: Promise<void>;
    act(() => {
      started = result.current.start(PARTNER, { beforeStart: () => counted.promise });
    });
    unmount();
    counted.resolve();
    await started;

    expect(mocks.getOrCreateConversation).not.toHaveBeenCalled();
  });

  it('drops a result that lands after unmount', async () => {
    const pending = deferred<{ error: Error }>();
    mocks.getOrCreateConversation.mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() => useStartConversation());

    let started!: Promise<void>;
    act(() => {
      started = result.current.start(PARTNER);
    });
    unmount();
    pending.resolve({ error: new Error('late') });
    await started;

    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.notifyError).not.toHaveBeenCalled();
  });
});
