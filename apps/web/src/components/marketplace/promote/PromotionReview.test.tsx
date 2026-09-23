import React from 'react';
import { PROMOTION_TIERS } from '@nepally/shared';
import { render, screen, fireEvent } from '../../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PromotionReview, type PromotionReviewProps } from './PromotionReview';

const BASE: PromotionReviewProps = {
  listing: { title: 'Momo catering', price: '$15' },
  tier: PROMOTION_TIERS[0],
  days: 7,
  startDate: new Date('2026-09-23T12:00:00.000Z'),
  endDate: new Date('2026-09-30T12:00:00.000Z'),
  totalCents: 1393,
  paying: false,
  payError: null,
  onPay: vi.fn(),
};

function terms() {
  const names = screen.getAllByRole('term').map((term) => term.textContent);
  const values = screen.getAllByRole('definition').map((definition) => definition.textContent);
  return Object.fromEntries(names.map((name, index) => [name, values[index]]));
}

describe('PromotionReview', () => {
  it('names the listing being promoted', () => {
    render(<PromotionReview {...BASE} />);

    expect(screen.getByText('Momo catering')).toBeDefined();
    expect(screen.getByText('$15')).toBeDefined();
  });

  it('pairs each detail with its label', () => {
    render(<PromotionReview {...BASE} />);

    expect(terms()).toEqual({
      Promotion: 'Featured Listing',
      Duration: '7 days',
      'Start date': 'Sep 23, 2026',
      'End date': 'Sep 30, 2026',
      Total: '$13.93',
    });
  });

  it('pays the total', () => {
    const onPay = vi.fn();
    render(<PromotionReview {...BASE} onPay={onPay} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pay $13.93' }));

    expect(onPay).toHaveBeenCalledTimes(1);
  });

  it('stays focusable while paying, and ignores clicks', () => {
    const onPay = vi.fn();
    render(<PromotionReview {...BASE} paying onPay={onPay} />);

    const button = screen.getByRole('button', { name: /Processing/ });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(false);
    button.focus();
    expect(document.activeElement).toBe(button);

    fireEvent.click(button);
    expect(onPay).not.toHaveBeenCalled();
  });

  it('shows a payment error as an alert', () => {
    render(<PromotionReview {...BASE} payError="This listing already has an active promotion of this type" />);

    expect(screen.getByRole('alert').textContent).toContain('This listing already has an active promotion of this type');
  });
});
