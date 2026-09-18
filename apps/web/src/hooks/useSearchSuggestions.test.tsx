import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchSuggestionsResult } from '@nepally/shared';

const searchSuggestionsMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  searchSuggestions: searchSuggestionsMock,
}));

import { useSearchSuggestions } from './useSearchSuggestions';

const empty = { items: [], totalCount: 0, hasMore: false };
const result = (title: string): SearchSuggestionsResult => ({
  data: { posts: { items: [{ id: title, title } as never], totalCount: 1, hasMore: false }, listings: empty, people: empty },
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const scope = { metroId: 'metro-nyc', allMetros: false };

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchSuggestionsMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits 250ms after typing before searching', async () => {
    searchSuggestionsMock.mockResolvedValue(result('Room'));
    const { result: hook, rerender } = renderHook(({ input }) => useSearchSuggestions(input, scope), {
      initialProps: { input: '' },
    });

    rerender({ input: 'ro' });
    expect(searchSuggestionsMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(249);
    });
    expect(searchSuggestionsMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(searchSuggestionsMock).toHaveBeenCalledWith({}, 'ro', scope);
    expect(hook.current.data?.posts.items[0].title).toBe('Room');
    expect(hook.current.loading).toBe(false);
  });

  it('does not search below two characters', async () => {
    const { result: hook } = renderHook(() => useSearchSuggestions('r', scope));
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(searchSuggestionsMock).not.toHaveBeenCalled();
    expect(hook.current.query).toBeNull();
    expect(hook.current.data).toBeNull();
  });

  it('ignores a slow response that arrives after a newer one', async () => {
    const slow = deferred<SearchSuggestionsResult>();
    const fast = deferred<SearchSuggestionsResult>();
    searchSuggestionsMock.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);

    const { result: hook, rerender } = renderHook(({ input }) => useSearchSuggestions(input, scope), {
      initialProps: { input: 'tha' },
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    rerender({ input: 'thapa' });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    await act(async () => {
      fast.resolve(result('Newest'));
    });
    await act(async () => {
      slow.resolve(result('Stale'));
    });

    expect(hook.current.query).toBe('thapa');
    expect(hook.current.data?.posts.items[0].title).toBe('Newest');
  });

  it('keeps the previous results on screen while the next query loads', async () => {
    const next = deferred<SearchSuggestionsResult>();
    searchSuggestionsMock.mockResolvedValueOnce(result('Room')).mockReturnValueOnce(next.promise);
    const { result: hook, rerender } = renderHook(({ input }) => useSearchSuggestions(input, scope), {
      initialProps: { input: 'room' },
    });
    await act(async () => {});

    rerender({ input: 'rooms' });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(hook.current.query).toBe('rooms');
    expect(hook.current.loading).toBe(true);
    expect(hook.current.resultsQuery).toBe('room');
    expect(hook.current.data?.posts.items[0].title).toBe('Room');

    await act(async () => {
      next.resolve(result('Rooms'));
    });
    expect(hook.current.loading).toBe(false);
    expect(hook.current.resultsQuery).toBe('rooms');
    expect(hook.current.data?.posts.items[0].title).toBe('Rooms');
  });

  it('clears results once the query becomes too short, even if a response is still in flight', async () => {
    const pending = deferred<SearchSuggestionsResult>();
    searchSuggestionsMock.mockReturnValueOnce(pending.promise);
    const { result: hook, rerender } = renderHook(({ input }) => useSearchSuggestions(input, scope), {
      initialProps: { input: 'room' },
    });
    expect(hook.current.loading).toBe(true);

    rerender({ input: 'r' });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await act(async () => {
      pending.resolve(result('Room'));
    });
    expect(hook.current.query).toBeNull();
    expect(hook.current.resultsQuery).toBeNull();
    expect(hook.current.data).toBeNull();
    expect(hook.current.loading).toBe(false);
  });

  it('exposes errors', async () => {
    searchSuggestionsMock.mockResolvedValue({ error: new Error('offline') });
    const { result: hook } = renderHook(() => useSearchSuggestions('room', scope));
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(hook.current.error?.message).toBe('offline');
  });
});
