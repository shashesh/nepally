import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
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
    await waitFor(() => {
      expect(screen.getByTestId('metro-pulse-strip')).toBeTruthy();
    }, { timeout: 5000 });
    expect(screen.getByTestId('pulse-card-fx_rate')).toBeTruthy();
  });

  it('removes a card when its dismiss button is tapped', async () => {
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
    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-fx_rate')).toBeTruthy();
    });

    // Next fetch (triggered by dismiss) returns an empty list
    mockGetPulseCards.mockResolvedValue({
      data: { computedAt: '2026-04-20T00:00:00Z', cards: [] },
    });

    fireEvent.press(screen.getByTestId('pulse-card-dismiss-fx_rate'));

    await waitFor(() => {
      expect(screen.queryByTestId('metro-pulse-strip')).toBeNull();
    });
  });

  it('renders nothing when the composer returns no cards', async () => {
    mockGetPulseCards.mockResolvedValue({
      data: { computedAt: '2026-04-20T00:00:00Z', cards: [] },
    });
    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);
    await waitFor(() => {
      expect(screen.queryByTestId('metro-pulse-strip')).toBeNull();
    });
  });
});
