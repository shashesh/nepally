import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PulseCard } from './PulseCard';
import type { PulseCard as PulseCardType } from '@nepally/shared';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('PulseCard (mobile)', () => {
  const makeFx = (): PulseCardType => ({
    kind: 'fx_rate',
    id: 'fx_rate',
    pair: 'USD_NPR',
    rate: 133.25,
    fetchedAt: '2026-04-20T00:00:00Z',
  });

  it('renders an FX card with rate formatted to 2 decimals', () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();
    render(<PulseCard card={makeFx()} onPress={onPress} onDismiss={onDismiss} />);

    expect(screen.getByText('1 USD = 133.25 NPR')).toBeTruthy();
  });

  it('fires onPress with the card payload', () => {
    const onPress = jest.fn();
    render(<PulseCard card={makeFx()} onPress={onPress} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByTestId('pulse-card-fx_rate'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress.mock.calls[0][0].id).toBe('fx_rate');
  });

  it('fires onDismiss with the card payload', () => {
    const onDismiss = jest.fn();
    render(<PulseCard card={makeFx()} onPress={jest.fn()} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByTestId('pulse-card-dismiss-fx_rate'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss.mock.calls[0][0].id).toBe('fx_rate');
  });

  it('renders a cultural card with relative-day detail', () => {
    const card: PulseCardType = {
      kind: 'cultural_calendar',
      id: 'buddha-jayanti-2026',
      title: 'Buddha Jayanti',
      startsAt: '2026-05-02T00:00:00Z',
      daysUntil: 12,
      deepLink: '/events',
    };
    render(<PulseCard card={card} onPress={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.getByText('Buddha Jayanti')).toBeTruthy();
    expect(screen.getByText('Starts in 12 days')).toBeTruthy();
  });
});
