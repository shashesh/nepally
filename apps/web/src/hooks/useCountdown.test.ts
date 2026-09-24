import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at the given seconds', () => {
    const { result } = renderHook(() => useCountdown(60));

    expect(result.current.remaining).toBe(60);
  });

  it('counts down once a second', () => {
    const { result } = renderHook(() => useCountdown(60));

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.remaining).toBe(57);
  });

  it('stops at 0 and clears its timer', () => {
    const { result } = renderHook(() => useCountdown(5));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.remaining).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('goes back to the given seconds on restart', () => {
    const { result } = renderHook(() => useCountdown(5));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    act(() => {
      result.current.restart();
    });
    expect(result.current.remaining).toBe(5);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current.remaining).toBe(3);
  });

  it('leaves no timer after unmount', () => {
    const { unmount } = renderHook(() => useCountdown(60));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
