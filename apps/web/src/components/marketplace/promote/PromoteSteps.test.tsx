import React from 'react';
import { render, screen, within } from '../../../test-utils';
import { describe, expect, it } from 'vitest';
import { PromoteSteps } from './PromoteSteps';

const LABELS = ['Type', 'Duration', 'Review & pay'] as const;

describe('PromoteSteps', () => {
  it('is an ordered list named Progress, one item per step', () => {
    render(<PromoteSteps labels={LABELS} current={1} />);

    const list = screen.getByRole('list', { name: 'Progress' });
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('marks only the current step', () => {
    render(<PromoteSteps labels={LABELS} current={2} />);

    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('aria-current'))).toEqual([null, 'step', null]);
  });

  it('says which earlier steps are completed', () => {
    render(<PromoteSteps labels={LABELS} current={3} />);

    const [first, second, third] = screen.getAllByRole('listitem');
    expect(first.textContent).toContain('completed');
    expect(second.textContent).toContain('completed');
    expect(third.textContent).not.toContain('completed');
  });
});
