import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  searchMetroAreasMock: vi.fn(),
  getMetroByZipMock: vi.fn(),
  isValidZipCodeMock: vi.fn(),
  logClientEventMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  searchMetroAreas: mocks.searchMetroAreasMock,
  getMetroByZip: mocks.getMetroByZipMock,
  isValidZipCode: mocks.isValidZipCodeMock,
  logClientEvent: mocks.logClientEventMock,
}));

import { useMetroSearch, SEARCH_FAILED_MESSAGE, NO_MATCH_MESSAGE } from './useMetroSearch';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useMetroSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.searchMetroAreasMock.mockReset();
    mocks.getMetroByZipMock.mockReset();
    mocks.logClientEventMock.mockReset();
    mocks.isValidZipCodeMock.mockReset();
    mocks.isValidZipCodeMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits 250ms after typing before searching', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [{ id: '1', name: 'San Jose', state: 'CA' }] });
    const { result, rerender } = renderHook(({ input }) => useMetroSearch(input, 'user-1'), {
      initialProps: { input: '' },
    });

    rerender({ input: 'san' });
    expect(mocks.searchMetroAreasMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(249);
    });
    expect(mocks.searchMetroAreasMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(mocks.searchMetroAreasMock).toHaveBeenCalledWith({}, 'san');
    expect(result.current.results).toEqual([{ id: '1', name: 'San Jose', state: 'CA' }]);
    expect(result.current.statusMessage).toBe('');
  });

  it('does not search below two characters', async () => {
    const { result } = renderHook(() => useMetroSearch('s', 'user-1'));
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(mocks.searchMetroAreasMock).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.statusMessage).toBe('');
  });

  it('looks up by ZIP code, not by name, for a valid ZIP', async () => {
    mocks.isValidZipCodeMock.mockReturnValue(true);
    mocks.getMetroByZipMock.mockResolvedValue({ data: { id: '19100', name: 'Dallas', state: 'TX' } });
    const { result } = renderHook(() => useMetroSearch('75001', 'user-1'));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(mocks.getMetroByZipMock).toHaveBeenCalledWith({}, '75001');
    expect(mocks.searchMetroAreasMock).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([{ id: '19100', name: 'Dallas', state: 'TX' }]);
  });

  it('normalizes the input before checking ZIP format (leading/trailing whitespace)', async () => {
    // isValidZipCode only recognizes a clean 5-digit string; without
    // normalizing first, ' 75001 ' would fail that check and be routed to
    // searchMetroAreas instead of getMetroByZip.
    mocks.isValidZipCodeMock.mockImplementation((value: string) => value === '75001');
    mocks.getMetroByZipMock.mockResolvedValue({ data: { id: '19100', name: 'Dallas', state: 'TX' } });
    const { result } = renderHook(() => useMetroSearch(' 75001 ', 'user-1'));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.query).toBe('75001');
    expect(mocks.isValidZipCodeMock).toHaveBeenCalledWith('75001');
    expect(mocks.getMetroByZipMock).toHaveBeenCalledWith({}, '75001');
    expect(mocks.searchMetroAreasMock).not.toHaveBeenCalled();
  });

  it('treats "ZIP code not found" as no match, not a failure', async () => {
    mocks.isValidZipCodeMock.mockReturnValue(true);
    mocks.getMetroByZipMock.mockResolvedValue({ error: new Error('ZIP code not found') });
    const { result } = renderHook(() => useMetroSearch('99999', 'user-1'));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.statusMessage).toBe(NO_MATCH_MESSAGE);
    expect(mocks.logClientEventMock).not.toHaveBeenCalled();
  });

  it('treats "Metro area not found for ZIP code" as no match, not a failure', async () => {
    mocks.isValidZipCodeMock.mockReturnValue(true);
    mocks.getMetroByZipMock.mockResolvedValue({ error: new Error('Metro area not found for ZIP code') });
    const { result } = renderHook(() => useMetroSearch('99999', 'user-1'));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.statusMessage).toBe(NO_MATCH_MESSAGE);
    expect(mocks.logClientEventMock).not.toHaveBeenCalled();
  });

  it('treats a PGRST116-coded ZIP error (PostgREST .single() on 0 rows) as no match', async () => {
    mocks.isValidZipCodeMock.mockReturnValue(true);
    const notFound = Object.assign(new Error('JSON object requested, multiple (or no) rows returned'), {
      code: 'PGRST116',
    });
    mocks.getMetroByZipMock.mockResolvedValue({ error: notFound });
    const { result } = renderHook(() => useMetroSearch('99999', 'user-1'));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.statusMessage).toBe(NO_MATCH_MESSAGE);
    expect(mocks.logClientEventMock).not.toHaveBeenCalled();
  });

  it('treats "Failed to fetch metro area" as no match too', async () => {
    // What a real PGRST116 "no rows" response collapses into by the time it
    // reaches here — getMetroByZip doesn't use .throwOnError(), so
    // supabase-js's default mode never actually throws an Error/PostgrestError
    // instance; getMetroByZip's own catch wraps the plain error object it
    // re-throws into this generic message, losing `code`. Verified against a
    // live PGRST116 response in the pw620 browser harness.
    mocks.isValidZipCodeMock.mockReturnValue(true);
    mocks.getMetroByZipMock.mockResolvedValue({ error: new Error('Failed to fetch metro area') });
    const { result } = renderHook(() => useMetroSearch('99999', 'user-1'));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.statusMessage).toBe(NO_MATCH_MESSAGE);
    expect(mocks.logClientEventMock).not.toHaveBeenCalled();
  });

  it('treats a genuine network/exception failure as a failure, not a match, and logs it', async () => {
    // A real fetch-level failure throws an actual Error/TypeError before
    // getMetroByZip's instanceof check ever runs, so it keeps its own
    // message instead of collapsing into 'Failed to fetch metro area'.
    mocks.isValidZipCodeMock.mockReturnValue(true);
    mocks.getMetroByZipMock.mockResolvedValue({ error: new Error('NetworkError when attempting to fetch resource.') });
    const { result } = renderHook(() => useMetroSearch('75001', 'user-1'));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.statusMessage).toBe(SEARCH_FAILED_MESSAGE);
    expect(mocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_location_search_failed' })
    );
  });

  it('shows the failure message and logs a real search failure', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ error: new Error('network down') });
    const { result } = renderHook(() => useMetroSearch('boston', 'user-1'));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.statusMessage).toBe(SEARCH_FAILED_MESSAGE);
    expect(mocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_location_search_failed', context: { platform: 'web', userId: 'user-1' } })
    );
  });

  it('shows "No metros match." for a query with no results', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useMetroSearch('zzz', 'user-1'));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.statusMessage).toBe(NO_MATCH_MESSAGE);
  });

  it('ignores a slow response that arrives after a newer one', async () => {
    const slow = deferred<{ data: { id: string; name: string; state: string }[] }>();
    const fast = deferred<{ data: { id: string; name: string; state: string }[] }>();
    mocks.searchMetroAreasMock.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);

    const { result, rerender } = renderHook(({ input }) => useMetroSearch(input, 'user-1'), {
      initialProps: { input: 'bo' },
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    rerender({ input: 'bos' });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    await act(async () => {
      fast.resolve({ data: [{ id: 'bos', name: 'Boston', state: 'MA' }] });
    });
    await act(async () => {
      slow.resolve({ data: [{ id: 'bal', name: 'Baltimore', state: 'MD' }] });
    });

    expect(result.current.results).toEqual([{ id: 'bos', name: 'Boston', state: 'MA' }]);
  });

  it('keeps the previous message on screen while the next query is debouncing/loading', async () => {
    mocks.searchMetroAreasMock.mockResolvedValueOnce({ data: [] });
    const { result, rerender } = renderHook(({ input }) => useMetroSearch(input, 'user-1'), {
      initialProps: { input: 'zzz' },
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.statusMessage).toBe(NO_MATCH_MESSAGE);

    // A new keystroke starts debouncing again; the old message must not
    // disappear (and the field must not flash empty) until it resolves.
    rerender({ input: 'zzzz' });
    expect(result.current.statusMessage).toBe(NO_MATCH_MESSAGE);
  });

  it('clears everything once the query becomes too short again', async () => {
    mocks.searchMetroAreasMock.mockResolvedValueOnce({ data: [{ id: '1', name: 'San Jose', state: 'CA' }] });
    const { result, rerender } = renderHook(({ input }) => useMetroSearch(input, 'user-1'), {
      initialProps: { input: 'san' },
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.results.length).toBe(1);

    rerender({ input: 's' });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.results).toEqual([]);
    expect(result.current.statusMessage).toBe('');
  });
});
