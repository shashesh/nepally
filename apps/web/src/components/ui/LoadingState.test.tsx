import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { LoadingState } from './LoadingState';

describe('LoadingState', () => {
  it('is a busy status with an accessible label', () => {
    render(<LoadingState label="Loading posts" />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Loading posts')).toBeDefined();
  });

  it('renders one placeholder per requested row', () => {
    render(<LoadingState variant="list" count={4} />);
    expect(screen.getAllByTestId('loading-row')).toHaveLength(4);
  });

  it('renders a single block for detail pages', () => {
    render(<LoadingState variant="detail" count={4} />);
    expect(screen.getAllByTestId('loading-row')).toHaveLength(1);
  });
});
