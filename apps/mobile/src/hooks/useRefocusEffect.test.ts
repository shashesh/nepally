import { renderHook } from '@testing-library/react-native';
import { useRefocusEffect } from './useRefocusEffect';

// The focus callback is captured, not run: a test calls it to stand in for the
// screen gaining focus.
let mockFocusCallback: (() => void | (() => void)) | null = null;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    mockFocusCallback = callback;
  },
}));

describe('useRefocusEffect', () => {
  beforeEach(() => {
    mockFocusCallback = null;
  });

  it('skips the first focus, which is the first load', () => {
    const effect = jest.fn();
    renderHook(() => useRefocusEffect(effect));

    mockFocusCallback?.();

    expect(effect).not.toHaveBeenCalled();
  });

  it('runs on every later focus', () => {
    const effect = jest.fn();
    renderHook(() => useRefocusEffect(effect));

    mockFocusCallback?.();
    mockFocusCallback?.();
    mockFocusCallback?.();

    expect(effect).toHaveBeenCalledTimes(2);
  });

  it("hands back the effect's cleanup, to run on blur", () => {
    const cleanup = jest.fn();
    renderHook(() => useRefocusEffect(() => cleanup));

    expect(mockFocusCallback?.()).toBeUndefined();
    expect(mockFocusCallback?.()).toBe(cleanup);
  });
});
