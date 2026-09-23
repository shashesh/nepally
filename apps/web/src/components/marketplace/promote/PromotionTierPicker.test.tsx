import React, { useState } from 'react';
import { PROMOTION_TIERS, type PromotionTierConfig } from '@nepally/shared';
import { render, screen, fireEvent, within } from '../../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PromotionTierPicker } from './PromotionTierPicker';

function Controlled({ onChange = vi.fn() }: { onChange?: (tier: PromotionTierConfig) => void }) {
  const [value, setValue] = useState<PromotionTierConfig['type'] | null>(null);
  return (
    <PromotionTierPicker
      tiers={PROMOTION_TIERS}
      value={value}
      onChange={(tier) => {
        setValue(tier.type);
        onChange(tier);
      }}
    />
  );
}

describe('PromotionTierPicker', () => {
  it('is a named radio group with one radio per tier', () => {
    render(<PromotionTierPicker tiers={PROMOTION_TIERS} value={null} onChange={vi.fn()} />);

    const group = screen.getByRole('radiogroup', { name: 'Promotion type' });
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'false',
    ]);
    expect(screen.getByRole('radio', { name: 'Featured Listing' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Sponsored Feed' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Sticky Business' })).toBeDefined();
  });

  it('describes each tier by its price and what it does', () => {
    render(<PromotionTierPicker tiers={PROMOTION_TIERS} value={null} onChange={vi.fn()} />);

    const featured = screen.getByRole('radio', { name: 'Featured Listing' });
    const describedBy = featured.getAttribute('aria-describedby') ?? '';
    const description = describedBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .join(' ');
    expect(description).toContain('$1.99/day');
    expect(description).toContain('Boost to top of marketplace search & category pages');
  });

  it('checks the tier it is given, and only that one', () => {
    render(<PromotionTierPicker tiers={PROMOTION_TIERS} value="sponsored_feed" onChange={vi.fn()} />);

    const checked = screen.getAllByRole('radio').filter((radio) => radio.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
    expect(screen.getByRole('radio', { name: 'Sponsored Feed' }).getAttribute('aria-checked')).toBe('true');
  });

  it('reports the tier that was clicked', () => {
    const onChange = vi.fn();
    render(<PromotionTierPicker tiers={PROMOTION_TIERS} value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Sticky Business' }));

    expect(onChange).toHaveBeenCalledWith(PROMOTION_TIERS[2]);
  });

  it('keeps one tab stop: the checked tier, or the first when none is', () => {
    const { rerender } = render(<PromotionTierPicker tiers={PROMOTION_TIERS} value={null} onChange={vi.fn()} />);
    expect(screen.getAllByRole('radio').map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);

    rerender(<PromotionTierPicker tiers={PROMOTION_TIERS} value="sticky_business" onChange={vi.fn()} />);
    expect(screen.getAllByRole('radio').map((radio) => radio.tabIndex)).toEqual([-1, -1, 0]);
  });

  it('moves and selects with the arrow keys', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const featured = screen.getByRole('radio', { name: 'Featured Listing' });
    featured.focus();

    fireEvent.keyDown(featured, { key: 'ArrowDown', code: 'ArrowDown' });

    const sponsored = screen.getByRole('radio', { name: 'Sponsored Feed' });
    expect(document.activeElement).toBe(sponsored);
    expect(sponsored.getAttribute('aria-checked')).toBe('true');
    expect(onChange).toHaveBeenLastCalledWith(PROMOTION_TIERS[1]);
  });
});
