import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows the message in an alert', () => {
    render(<ErrorState message="Couldn't load posts" />);
    expect(screen.getByRole('alert').textContent).toContain("Couldn't load posts");
  });

  it('does not repeat a message that only restates its title', () => {
    render(<ErrorState title="Couldn't load events" message="Couldn't load events." />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent?.match(/Couldn't load events/g)).toHaveLength(1);
  });

  it('keeps a message that adds to its title', () => {
    render(<ErrorState title="Couldn't load events" message="Couldn't reach Nepally. Check your connection and try again." />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain("Couldn't load events");
    expect(alert.textContent).toContain("Couldn't reach Nepally.");
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
