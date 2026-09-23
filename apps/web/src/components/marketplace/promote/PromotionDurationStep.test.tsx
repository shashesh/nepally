import React from 'react';
import { PROMOTION_TIERS } from '@nepally/shared';
import { render, screen, fireEvent } from '../../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PromotionDurationStep } from './PromotionDurationStep';

const FEATURED = PROMOTION_TIERS[0];
const END = new Date('2026-09-30T12:00:00.000Z');

function terms() {
  const names = screen.getAllByRole('term').map((term) => term.textContent);
  const values = screen.getAllByRole('definition').map((definition) => definition.textContent);
  return Object.fromEntries(names.map((name, index) => [name, values[index]]));
}

describe('PromotionDurationStep', () => {
  it('is a spin button named for its unit, bounded to the allowed days', () => {
    render(<PromotionDurationStep tier={FEATURED} days={7} onDaysChange={vi.fn()} totalCents={1393} endDate={END} />);

    const input = screen.getByRole('spinbutton', { name: 'Duration in days' });
    expect(input.getAttribute('aria-valuemin')).toBe('1');
    expect(input.getAttribute('aria-valuemax')).toBe('90');
    expect(input.getAttribute('aria-valuenow')).toBe('7');
  });

  it('reports a typed duration', () => {
    const onDaysChange = vi.fn();
    render(<PromotionDurationStep tier={FEATURED} days={7} onDaysChange={onDaysChange} totalCents={1393} endDate={END} />);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Duration in days' }), { target: { value: '12' } });

    expect(onDaysChange).toHaveBeenLastCalledWith(12);
  });

  it('lets the member clear the field and type a new number', () => {
    function Clamped() {
      const [days, setDays] = React.useState(7);
      return (
        <PromotionDurationStep
          tier={FEATURED}
          days={days}
          onDaysChange={(value) => setDays(Math.max(1, Number(value) || 1))}
          totalCents={days * FEATURED.daily_cost_cents}
          endDate={END}
        />
      );
    }
    render(<Clamped />);
    const input = screen.getByRole('spinbutton', { name: 'Duration in days' }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: '3' } });

    expect(input.value).toBe('3');
    expect(input.getAttribute('aria-valuenow')).toBe('3');
  });

  it('puts the last duration back when the field is left empty', () => {
    const onDaysChange = vi.fn();
    render(<PromotionDurationStep tier={FEATURED} days={7} onDaysChange={onDaysChange} totalCents={1393} endDate={END} />);
    const input = screen.getByRole('spinbutton', { name: 'Duration in days' }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(input.value).toBe('7');
    expect(onDaysChange).not.toHaveBeenCalled();
  });

  it('steps the duration with Arrow Up', () => {
    const onDaysChange = vi.fn();
    render(<PromotionDurationStep tier={FEATURED} days={7} onDaysChange={onDaysChange} totalCents={1393} endDate={END} />);

    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Duration in days' }), { key: 'ArrowUp' });

    expect(onDaysChange).toHaveBeenLastCalledWith(8);
  });

  it('pairs each cost with its label', () => {
    render(<PromotionDurationStep tier={FEATURED} days={7} onDaysChange={vi.fn()} totalCents={1393} endDate={END} />);

    expect(terms()).toEqual({
      'Daily rate': '$1.99',
      Duration: '7 days',
      'Total cost': '$13.93',
      'Ends on': 'Sep 30, 2026',
    });
  });

  it('says "1 day", not "1 days"', () => {
    render(<PromotionDurationStep tier={FEATURED} days={1} onDaysChange={vi.fn()} totalCents={199} endDate={END} />);

    expect(terms().Duration).toBe('1 day');
  });
});
