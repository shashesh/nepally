import { describe, expect, it } from 'vitest';
import { listingCardLabel } from './listingCardLabel';

describe('listingCardLabel', () => {
  it('reads the facts a card shows, in order', () => {
    expect(
      listingCardLabel({
        title: 'Rice cooker',
        category: 'Home',
        price: '$40',
        isVerifiedSeller: true,
        freshness: '2d ago',
        sponsored: true,
      })
    ).toBe('Rice cooker, Home, $40, verified seller, 2d ago, sponsored');
  });

  it('leaves out what the card does not show', () => {
    expect(
      listingCardLabel({ title: 'Rice cooker', category: null, price: null, isVerifiedSeller: false })
    ).toBe('Rice cooker');
  });
});
