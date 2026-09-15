import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows the message in an alert', () => {
    render(<ErrorState message="Couldn't load posts" />);
    expect(screen.getByRole('alert').textContent).toContain("Couldn't load posts");
  });

  it('offers retry when a handler is given', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no retry button without a handler', () => {
    render(<ErrorState message="Failed" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
