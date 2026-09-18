import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { TrustBadge } from './TrustBadge';

describe('TrustBadge', () => {
  it.each([
    [0, 'New Member'],
    [1, 'Verified'],
    [2, 'Contributor'],
  ])('level %i reads "%s"', (level, label) => {
    render(<TrustBadge level={level} />);
    expect(screen.getByText(label)).toBeDefined();
  });

  it.each([
    [3, 'Contributor'],
    [-1, 'New Member'],
  ])('clamps out-of-range level %i to "%s"', (level, label) => {
    render(<TrustBadge level={level} />);
    expect(screen.getByText(label)).toBeDefined();
  });
});
