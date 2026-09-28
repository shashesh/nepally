import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * `useFocusEffect` that skips the first focus. That one is the screen's first
 * load, which the screen does itself; later focuses mean the member came back,
 * so the screen can refresh what may have changed while it was hidden.
 *
 * Pass a stable callback (`useCallback`), as with `useFocusEffect`: a new
 * identity while focused runs it again. It may return a cleanup for blur.
 */
export function useRefocusEffect(effect: () => void | (() => void)): void {
  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return undefined;
      }
      return effect();
    }, [effect])
  );
}
