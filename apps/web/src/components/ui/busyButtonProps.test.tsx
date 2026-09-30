import React from 'react';
import { describe, expect, it } from 'vitest';
import { busyButtonProps } from './busyButtonProps';

describe('busyButtonProps', () => {
  it('locks the button focusably and shows a Loader on the running one', () => {
    const props = busyButtonProps(true, true, <span>icon</span>);
    expect(props['aria-disabled']).toBe(true);
    expect(props['data-disabled']).toBe(true);
    expect(props['aria-busy']).toBe(true);
    expect(React.isValidElement(props.leftSection)).toBe(true);
  });

  it('leaves an idle button alone, with its icon', () => {
    const icon = <span>icon</span>;
    const props = busyButtonProps(false, false, icon);
    expect(props['aria-disabled']).toBeUndefined();
    expect(props['data-disabled']).toBeUndefined();
    expect(props['aria-busy']).toBeUndefined();
    expect(props.leftSection).toBe(icon);
  });
});
