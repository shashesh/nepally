import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the current time on first render', () => {
    const { result } = renderHook(() => useNow());

    expect(result.current.toISOString()).toBe('2026-09-18T09:00:00.000Z');
  });

  it('refreshes once per minute by default', () => {
    const { result } = renderHook(() => useNow());

    act(() => {
      vi.advanceTimersByTime(59_999);
    });
    expect(result.current.toISOString()).toBe('2026-09-18T09:00:00.000Z');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.toISOString()).toBe('2026-09-18T09:01:00.000Z');
  });

  it('honours a custom refresh interval', () => {
    const { result } = renderHook(() => useNow(1_000));

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.toISOString()).toBe('2026-09-18T09:00:01.000Z');
  });

  it('stops refreshing after unmount', () => {
    const { unmount } = renderHook(() => useNow());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
