import React, { useEffect } from 'react';
import { act, render, screen } from '../test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFocusAfterUpdate, type ArmFocus } from './useFocusAfterUpdate';

/**
 * A key, two targets and an outside button; `onArm` hands the test the
 * hook's `arm` so it can arm and then change the key, as a caller would.
 */
function Harness({ updateKey, onArm }: { updateKey: number; onArm: (arm: ArmFocus) => void }) {
  const arm = useFocusAfterUpdate(updateKey);
  useEffect(() => onArm(arm), [arm, onArm]);
  return (
    <>
      <button type="button">First target</button>
      <button type="button">Second target</button>
      <button type="button">Elsewhere</button>
    </>
  );
}

function setup() {
  let current: ArmFocus | null = null;
  const onArm = (arm: ArmFocus) => {
    current = arm;
  };
  const { rerender } = render(<Harness updateKey={0} onArm={onArm} />);
  const update = (key: number) => rerender(<Harness updateKey={key} onArm={onArm} />);
  const target = (name: string) => screen.getByRole('button', { name });
  const arm: ArmFocus = (getTarget, options) => current?.(getTarget, options);
  return { arm, update, target };
}

describe('useFocusAfterUpdate', () => {
  afterEach(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });

  it('focuses the armed target once the key changes while focus is on <body>', () => {
    const { arm, update, target } = setup();
    const first = target('First target');
    const focus = vi.spyOn(first, 'focus');

    arm(() => first);
    act(() => update(1));

    expect(document.activeElement).toBe(first);
    expect(focus).toHaveBeenCalledTimes(1);

    // Spent: a further change focuses nothing again.
    first.blur();
    act(() => update(2));
    expect(document.activeElement).toBe(document.body);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('leaves focus that is elsewhere alone, and spends the arm', () => {
    const { arm, update, target } = setup();
    const elsewhere = target('Elsewhere');

    arm(() => target('First target'));
    elsewhere.focus();
    act(() => update(1));

    expect(document.activeElement).toBe(elsewhere);

    // The arm was spent on that change, not kept for a later one.
    elsewhere.blur();
    act(() => update(2));
    expect(document.activeElement).toBe(document.body);
  });

  it('uses the later of two arms', () => {
    const { arm, update, target } = setup();

    arm(() => target('First target'));
    arm(() => target('Second target'));
    act(() => update(1));

    expect(document.activeElement).toBe(target('Second target'));
  });

  it('does nothing when the key changes without an arm', () => {
    const { update } = setup();

    act(() => update(1));

    expect(document.activeElement).toBe(document.body);
  });

  it('does nothing while armed until the key actually changes', () => {
    const { arm, update, target } = setup();

    arm(() => target('First target'));
    act(() => update(0));

    expect(document.activeElement).toBe(document.body);

    act(() => update(1));
    expect(document.activeElement).toBe(target('First target'));
  });

  it('passes the focus options through', () => {
    const { arm, update, target } = setup();
    const first = target('First target');
    const focus = vi.spyOn(first, 'focus');

    arm(() => first, { preventScroll: true });
    act(() => update(1));

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('tolerates a target that is gone', () => {
    const { arm, update } = setup();

    arm(() => null);
    act(() => update(1));

    expect(document.activeElement).toBe(document.body);
  });
});
