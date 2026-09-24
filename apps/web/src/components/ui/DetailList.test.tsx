import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { DetailList, DetailRow } from './DetailList';

describe('DetailList', () => {
  it('renders rows as term/definition pairs, label then value', () => {
    render(
      <DetailList>
        <DetailRow label="Email">ram@example.com</DetailRow>
        <DetailRow label="ZIP Code">10001</DetailRow>
      </DetailList>
    );

    const terms = screen.getAllByRole('term');
    const definitions = screen.getAllByRole('definition');
    expect(terms.map((term) => term.textContent)).toEqual(['Email', 'ZIP Code']);
    expect(definitions.map((definition) => definition.textContent)).toEqual(['ram@example.com', '10001']);
    terms.forEach((term, index) => {
      // The label comes first in reading order, then its value.
      expect(term.compareDocumentPosition(definitions[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('keeps every pair inside one description list', () => {
    render(
      <DetailList divided>
        <DetailRow label="Posts">12</DetailRow>
      </DetailList>
    );

    expect(screen.getByRole('term').closest('dl')).toBe(screen.getByRole('definition').closest('dl'));
    expect(screen.getByRole('term').closest('dl')).not.toBeNull();
  });

  it('accepts a node as the label', () => {
    render(
      <DetailList>
        <DetailRow label={<span>Trust level</span>}>Verified</DetailRow>
      </DetailList>
    );

    expect(screen.getByRole('term').textContent).toBe('Trust level');
    expect(screen.getByRole('definition').textContent).toBe('Verified');
  });
});
