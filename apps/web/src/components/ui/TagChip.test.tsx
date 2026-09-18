import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { TagChip } from './TagChip';

describe('TagChip', () => {
  it('shows the tag label', () => {
    render(<TagChip slug="housing" label="Housing" />);
    expect(screen.getByText('Housing')).toBeDefined();
  });

  it('marks emergency tags for assistive tech', () => {
    render(<TagChip slug="emergency" label="Emergency" />);
    expect(screen.getByText('Emergency').closest('[data-emergency="true"]')).not.toBeNull();
  });

  it('accepts unknown slugs', () => {
    render(<TagChip slug="politics-local" label="Local politics" />);
    expect(screen.getByText('Local politics')).toBeDefined();
  });
});
