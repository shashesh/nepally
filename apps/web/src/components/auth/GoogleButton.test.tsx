import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import { GoogleButton } from './GoogleButton';

describe('GoogleButton', () => {
  it('is named "Continue with Google" with its icon hidden', () => {
    render(<GoogleButton onClick={vi.fn()} busy={false} />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    const icon = button.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('calls onClick when pressed', () => {
    const onClick = vi.fn();
    render(<GoogleButton onClick={onClick} busy={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('stays focusable and ignores presses while busy', () => {
    const onClick = vi.fn();
    render(<GoogleButton onClick={onClick} busy />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });
});
