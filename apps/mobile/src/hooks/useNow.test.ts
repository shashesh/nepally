import { renderHook, act } from '@testing-library/react-native';
import { useNow } from './useNow';

describe('useNow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-18T09:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the current time on first render', () => {
    const { result } = renderHook(() => useNow());

    expect(result.current.toISOString()).toBe('2026-09-18T09:00:00.000Z');
  });

  it('refreshes once per minute by default', () => {
    const { result } = renderHook(() => useNow());

    act(() => {
      jest.advanceTimersByTime(59_999);
    });
    expect(result.current.toISOString()).toBe('2026-09-18T09:00:00.000Z');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.toISOString()).toBe('2026-09-18T09:01:00.000Z');
  });

  it('honours a custom refresh interval', () => {
    const { result } = renderHook(() => useNow(1_000));

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(result.current.toISOString()).toBe('2026-09-18T09:00:01.000Z');
  });

  it('stops refreshing after unmount', () => {
    const { unmount } = renderHook(() => useNow());

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
