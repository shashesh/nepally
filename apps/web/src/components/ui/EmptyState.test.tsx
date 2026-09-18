import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('announces title, description and action', () => {
    render(
      <EmptyState
        title="No posts yet"
        description="Be the first to share something."
        action={<button type="button">Create post</button>}
      />
    );
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('No posts yet');
    expect(screen.getByText('Be the first to share something.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create post' })).toBeDefined();
  });

  it('renders the title as a heading', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeDefined();
  });
});
