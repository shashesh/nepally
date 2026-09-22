import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('../lib/supabase', () => ({ supabase: {} }));

import { useUserList } from './useUserList';
import type { ListFetcher } from './useUserList';

interface Item {
  id: string;
}

const mockItems: Item[] = [{ id: 'item-1' }, { id: 'item-2' }];
const FALLBACK = 'Failed to load the list';

describe('useUserList', () => {
  let fetchList: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchList = vi.fn().mockResolvedValue({ data: mockItems });
  });

  it('starts loading when there is a user', () => {
    fetchList.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useUserList<Item>('user-1', fetchList as ListFetcher<Item>, FALLBACK)
    );

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('does not start loading and requests nothing when userId is null', () => {
    const { result } = renderHook(() =>
      useUserList<Item>(null, fetchList as ListFetcher<Item>, FALLBACK)
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(fetchList).not.toHaveBeenCalled();
  });

  it('reload does nothing when there is no user', () => {
    const { result } = renderHook(() =>
      useUserList<Item>(null, fetchList as ListFetcher<Item>, FALLBACK)
    );

    act(() => result.current.reload());

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(fetchList).not.toHaveBeenCalled();
  });

  it('loads items on success', async () => {
    const { result } = renderHook(() =>
      useUserList<Item>('user-1', fetchList as ListFetcher<Item>, FALLBACK)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual(mockItems);
    expect(result.current.error).toBeNull();
    expect(fetchList).toHaveBeenCalledWith({}, 'user-1');
  });

  it('reports the error message and clears items on failure', async () => {
    fetchList.mockResolvedValue({ error: new Error('boom') });
    const { result } = renderHook(() =>
      useUserList<Item>('user-1', fetchList as ListFetcher<Item>, FALLBACK)
    );

    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('falls back to the given message when the error has none', async () => {
    fetchList.mockResolvedValue({ error: new Error('') });
    const { result } = renderHook(() =>
      useUserList<Item>('user-1', fetchList as ListFetcher<Item>, FALLBACK)
    );

    await waitFor(() => expect(result.current.error).toBe(FALLBACK));
  });

  it('reload clears an existing error and refetches', async () => {
    fetchList.mockResolvedValueOnce({ error: new Error('boom') });
    const { result } = renderHook(() =>
      useUserList<Item>('user-1', fetchList as ListFetcher<Item>, FALLBACK)
    );

    await waitFor(() => expect(result.current.error).toBe('boom'));

    fetchList.mockResolvedValueOnce({ data: mockItems });
    act(() => result.current.reload());

    // Loading resumes and the stale error clears synchronously, in the event
    // handler, before the refetch has even resolved.
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual(mockItems);
    expect(result.current.error).toBeNull();
    expect(fetchList).toHaveBeenCalledTimes(2);
  });

  it('a failing reload replaces prior items with an empty list', async () => {
    const { result } = renderHook(() =>
      useUserList<Item>('user-1', fetchList as ListFetcher<Item>, FALLBACK)
    );

    await waitFor(() => expect(result.current.items).toEqual(mockItems));

    fetchList.mockResolvedValueOnce({ error: new Error('reload failed') });
    act(() => result.current.reload());

    await waitFor(() => expect(result.current.error).toBe('reload failed'));
    expect(result.current.items).toEqual([]);
  });

  it('drops a stale response for the previous user after userId changes', async () => {
    const itemsB: Item[] = [{ id: 'item-b-1' }];
    let resolveA: (value: { data: Item[] }) => void = () => {};
    fetchList.mockImplementation((_client: unknown, requestedId: string) => {
      if (requestedId === 'user-a') {
        return new Promise((resolve) => {
          resolveA = resolve;
        });
      }
      return Promise.resolve({ data: itemsB });
    });

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useUserList<Item>(id, fetchList as ListFetcher<Item>, FALLBACK),
      { initialProps: { id: 'user-a' } }
    );

    rerender({ id: 'user-b' });

    await waitFor(() => expect(result.current.items).toEqual(itemsB));

    // A's request finally resolves after B's has already landed; it must be dropped.
    await act(async () => {
      resolveA({ data: mockItems });
    });

    expect(result.current.items).toEqual(itemsB);
  });

  it('resets to idle with no request when userId goes from a value to null', async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) =>
        useUserList<Item>(id, fetchList as ListFetcher<Item>, FALLBACK),
      { initialProps: { id: 'user-a' as string | null } }
    );

    await waitFor(() => expect(result.current.items).toEqual(mockItems));
    expect(fetchList).toHaveBeenCalledTimes(1);

    rerender({ id: null });

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchList).toHaveBeenCalledTimes(1);
  });

  it('starts loading on the first render when userId goes from null to a value', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) =>
        useUserList<Item>(id, fetchList as ListFetcher<Item>, FALLBACK),
      { initialProps: { id: null as string | null } }
    );

    expect(result.current.loading).toBe(false);

    rerender({ id: 'user-a' });

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('clears an existing error on the first render after userId changes', async () => {
    fetchList.mockImplementation((_client: unknown, requestedId: string) =>
      requestedId === 'user-a'
        ? Promise.resolve({ error: new Error('user-a failed') })
        : Promise.resolve({ data: mockItems })
    );

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useUserList<Item>(id, fetchList as ListFetcher<Item>, FALLBACK),
      { initialProps: { id: 'user-a' } }
    );

    await waitFor(() => expect(result.current.error).toBe('user-a failed'));

    rerender({ id: 'user-b' });

    expect(result.current.error).toBeNull();
  });
});
