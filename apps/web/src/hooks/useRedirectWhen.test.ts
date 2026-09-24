import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRedirectWhen } from './useRedirectWhen';

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/router', () => ({ useRouter: () => ({ replace: mocks.replace }) }));

describe('useRedirectWhen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces the route once while its condition holds', () => {
    const { rerender } = renderHook(() => useRedirectWhen(true, '/feed'));

    rerender();
    rerender();

    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith('/feed');
  });

  it('makes no call while its condition is false', () => {
    const { rerender } = renderHook(() => useRedirectWhen(false, '/feed'));

    rerender();

    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('redirects when its condition becomes true', () => {
    const { rerender } = renderHook(({ condition }) => useRedirectWhen(condition, '/login'), {
      initialProps: { condition: false },
    });

    rerender({ condition: true });

    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });

  it('returns its condition', () => {
    const { result, rerender } = renderHook(({ condition }) => useRedirectWhen(condition, '/feed'), {
      initialProps: { condition: false },
    });
    expect(result.current).toBe(false);

    rerender({ condition: true });
    expect(result.current).toBe(true);
  });
});
