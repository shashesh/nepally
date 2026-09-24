import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import type { RsvpStatus } from '@nepally/shared';
import { EventResponseControl } from './EventResponseControl';

function renderControl(
  value: RsvpStatus | null,
  props: Partial<React.ComponentProps<typeof EventResponseControl>> = {}
) {
  const onChange = vi.fn();
  render(<EventResponseControl value={value} onChange={onChange} {...props} />);
  return {
    onChange,
    interested: screen.getByRole('button', { name: 'Interested' }),
    going: screen.getByRole('button', { name: 'Going' }),
  };
}

describe('EventResponseControl', () => {
  it('names the group "Your response" by default', () => {
    renderControl(null);
    expect(screen.getByRole('group', { name: 'Your response' })).toBeDefined();
  });

  it('names the group by its label', () => {
    renderControl(null, { label: 'Your response to Dashain Celebration' });
    expect(
      screen.getByRole('group', { name: 'Your response to Dashain Celebration' })
    ).toBeDefined();
  });

  it.each([
    [null, 'false', 'false'],
    ['interested', 'true', 'false'],
    ['going', 'false', 'true'],
  ] as const)('with value %s, marks Interested %s and Going %s', (value, interested, going) => {
    const buttons = renderControl(value);
    expect(buttons.interested.getAttribute('aria-pressed')).toBe(interested);
    expect(buttons.going.getAttribute('aria-pressed')).toBe(going);
  });

  it.each([null, 'interested'] as const)('passes going when Going is pressed from %s', (value) => {
    const { going, onChange } = renderControl(value);
    fireEvent.click(going);
    expect(onChange).toHaveBeenCalledWith('going');
  });

  it('passes null when the pressed Going is pressed again', () => {
    const { going, onChange } = renderControl('going');
    fireEvent.click(going);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it.each([null, 'going'] as const)(
    'passes interested when Interested is pressed from %s',
    (value) => {
      const { interested, onChange } = renderControl(value);
      fireEvent.click(interested);
      expect(onChange).toHaveBeenCalledWith('interested');
    }
  );

  it('passes null when the pressed Interested is pressed again', () => {
    const { interested, onChange } = renderControl('interested');
    fireEvent.click(interested);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('ignores presses while busy, and keeps focus on the pressed button', () => {
    const { interested, going, onChange } = renderControl('going', { busy: true });
    going.focus();

    fireEvent.click(going);
    fireEvent.click(interested);

    expect(onChange).not.toHaveBeenCalled();
    for (const button of [interested, going]) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect((button as HTMLButtonElement).disabled).toBe(false);
    }
    expect(document.activeElement).toBe(going);
  });

  it('keeps the pressed state while busy: aria-disabled, never natively disabled', () => {
    const { interested, going } = renderControl('going', { busy: true });

    // A disabled Mantine button repaints flat grey and hides the choice the
    // member just made (FollowButton is the same exception), so busy is
    // aria-disabled only and the pressed state survives it. The colour
    // itself is covered by the visual baseline.
    for (const button of [interested, going]) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect((button as HTMLButtonElement).disabled).toBe(false);
    }
    expect(going.getAttribute('aria-pressed')).toBe('true');
    expect(interested.getAttribute('aria-pressed')).toBe('false');
  });

  it('is not aria-disabled when idle', () => {
    const { interested, going } = renderControl(null);
    expect(interested.getAttribute('aria-disabled')).toBeNull();
    expect(going.getAttribute('aria-disabled')).toBeNull();
  });
});
