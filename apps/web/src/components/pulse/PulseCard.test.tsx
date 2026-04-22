import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import { PulseCard } from './PulseCard';
import type { PulseCard as PulseCardType } from '@nepally/shared';

const fx: PulseCardType = {
  kind: 'fx_rate',
  id: 'fx_rate',
  pair: 'USD_NPR',
  rate: 133.25,
  fetchedAt: '2026-04-20T00:00:00Z',
};

describe('PulseCard (web)', () => {
  it('renders an FX card with rate formatted to 2 decimals', () => {
    render(<PulseCard card={fx} onPress={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('1 USD = 133.25 NPR')).toBeDefined();
  });

  it('fires onPress when the card is clicked', () => {
    const onPress = vi.fn();
    render(<PulseCard card={fx} onPress={onPress} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTestId('pulse-card-fx_rate'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('stops propagation on dismiss and calls onDismiss', () => {
    const onPress = vi.fn();
    const onDismiss = vi.fn();
    render(<PulseCard card={fx} onPress={onPress} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('pulse-card-dismiss-fx_rate'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('PulseCard (web) — PR 3 cards', () => {
  it('renders a find_your_people card with featured name + reason', () => {
    const card = {
      kind: 'find_your_people',
      id: 'find_your_people',
      suggestionCount: 3,
      featured: {
        userId: 'u-1', displayName: 'Anish S.', photo: null, reason: 'Both from Pokhara',
      },
      deepLink: '/users/u-1',
    } as const;
    render(<PulseCard card={card} onPress={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Anish S\./)).toBeDefined();
    expect(screen.getByText(/Both from Pokhara/)).toBeDefined();
  });

  it('renders a top_helper card with score metadata', () => {
    const card = {
      kind: 'top_helper',
      id: 'top_helper',
      helper: { userId: 'h-1', displayName: 'Deepak G.', photo: null, helperScore: 84 },
      metroLabel: 'DFW',
      deepLink: '/users/h-1',
    } as const;
    render(<PulseCard card={card} onPress={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Deepak G\./)).toBeDefined();
    expect(screen.getByText(/Top helper in DFW/)).toBeDefined();
  });
});
