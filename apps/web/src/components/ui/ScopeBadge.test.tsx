import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { ScopeBadge } from './ScopeBadge';

describe('ScopeBadge', () => {
  it('labels global posts', () => {
    render(<ScopeBadge isGlobal />);
    expect(screen.getByText('Global')).toBeDefined();
  });

  it('labels local posts with the metro', () => {
    render(<ScopeBadge isGlobal={false} metroLabel="NYC" />);
    expect(screen.getByText('Local · NYC')).toBeDefined();
  });

  it('labels local posts without a metro', () => {
    render(<ScopeBadge isGlobal={false} />);
    expect(screen.getByText('Local')).toBeDefined();
  });
});
