import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ListStates, type ListStatesProps } from './ListStates';

function renderStates(overrides: Partial<ListStatesProps> = {}) {
  const props: ListStatesProps = {
    loading: false,
    loadingLabel: 'Loading posts…',
    error: null,
    onRetry: vi.fn(),
    isEmpty: false,
    empty: <p>Nothing here yet</p>,
    children: <p>The rows</p>,
    ...overrides,
  };
  render(<ListStates {...props} />);
  return props;
}

describe('ListStates', () => {
  it('shows only the loading state while loading', () => {
    renderStates({ loading: true });
    expect(screen.getByRole('status').textContent).toContain('Loading posts…');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Nothing here yet')).toBeNull();
    expect(screen.queryByText('The rows')).toBeNull();
  });

  it('shows only the error, with a retry that calls onRetry', () => {
    const props = renderStates({ error: "Couldn't load posts." });
    expect(screen.getByRole('alert').textContent).toContain("Couldn't load posts.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Nothing here yet')).toBeNull();
    expect(screen.queryByText('The rows')).toBeNull();
  });

  it('shows only the empty content when the list is empty', () => {
    renderStates({ isEmpty: true });
    expect(screen.getByText('Nothing here yet')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('The rows')).toBeNull();
  });

  it('shows only the children when there are rows', () => {
    renderStates();
    expect(screen.getByText('The rows')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('Nothing here yet')).toBeNull();
  });

  it('prefers loading over an error', () => {
    renderStates({ loading: true, error: 'Failed', isEmpty: true });
    expect(screen.getByRole('status').textContent).toContain('Loading posts…');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('prefers an error over empty', () => {
    renderStates({ error: 'Failed', isEmpty: true });
    expect(screen.getByRole('alert').textContent).toContain('Failed');
    expect(screen.queryByText('Nothing here yet')).toBeNull();
  });
});
