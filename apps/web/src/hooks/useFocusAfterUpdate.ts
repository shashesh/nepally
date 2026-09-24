import { useCallback, useEffect, useRef } from 'react';
import { isFocusStranded } from '../lib/focus';

/**
 * Arms one focus restore: `getTarget` is called only when the restore runs,
 * so it can read a ref that the update itself fills in. Arming again replaces
 * the previous arm; `arm(() => null)` cancels one.
 */
export type ArmFocus = (getTarget: () => HTMLElement | null | undefined, options?: FocusOptions) => void;

interface ArmedFocus {
  getTarget: () => HTMLElement | null | undefined;
  options?: FocusOptions;
}

/**
 * Puts focus back after an update removes the element that held it: a
 * deleted row, an unsaved post, a Remove button that goes with the photo.
 *
 * Call `arm(getTarget)` before the action. The next time `key` changes
 * (`Object.is`, after that render commits) the arm is spent, and if focus is
 * stranded (on `<body>`, or inside a closing modal: `isFocusStranded`) the
 * target is focused. Focus the member has already moved elsewhere is never
 * taken back.
 */
export function useFocusAfterUpdate(key: unknown): ArmFocus {
  const armedRef = useRef<ArmedFocus | null>(null);

  useEffect(() => {
    const armed = armedRef.current;
    if (!armed) return;
    armedRef.current = null;
    if (isFocusStranded()) armed.getTarget()?.focus(armed.options);
  }, [key]);

  return useCallback<ArmFocus>((getTarget, options) => {
    armedRef.current = { getTarget, options };
  }, []);
}
