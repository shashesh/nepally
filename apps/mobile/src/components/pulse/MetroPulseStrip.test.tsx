import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { MetroPulseStrip } from './MetroPulseStrip';

const mockGetPulseCards = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../config/supabase', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('@nepally/shared', () => ({
  getPulseCards: (...args: unknown[]) => mockGetPulseCards(...args),
}));

describe('MetroPulseStrip', () => {
  beforeEach(() => {
    mockGetPulseCards.mockReset();
  });

  it('renders nothing when the composer returns no cards', async () => {
    mockGetPulseCards.mockResolvedValue({
      data: { computedAt: '2026-04-20T00:00:00Z', cards: [] },
    });

    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);

    // Wait for the async IIFE to fire so the eventual setCards([]) no-op
    // lands inside waitFor's act scope. Without this, the effect resolves
    // after the test ends and React logs an act() warning. Initial cards
    // state is already [], so the assertion passes on the first check.
    await waitFor(() => {
      expect(mockGetPulseCards).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('metro-pulse-strip')).toBeNull();
    });
  });

  it('renders cards returned by the composer', async () => {
    mockGetPulseCards.mockResolvedValue({
      data: {
        computedAt: '2026-04-20T00:00:00Z',
        cards: [
          {
            kind: 'fx_rate',
            id: 'fx_rate',
            pair: 'USD_NPR',
            rate: 133.25,
            fetchedAt: '2026-04-20T00:00:00Z',
          },
        ],
      },
    });

    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);

    // render() + waitFor() is the prescribed pattern for async-useEffect
    // components (apps/mobile CLAUDE.md rule #6). Default RNTL timeout of
    // 1000ms has been flaky under Ubuntu CI load, so give the mock promise
    // a bit more headroom.
    await waitFor(
      () => {
        expect(screen.getByTestId('pulse-card-fx_rate')).toBeTruthy();
      },
      { timeout: 3000 }
    );
    expect(screen.getByTestId('metro-pulse-strip')).toBeTruthy();
  });
});
