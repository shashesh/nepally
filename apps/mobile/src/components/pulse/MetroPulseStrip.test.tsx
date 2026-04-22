import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { MetroPulseStrip } from './MetroPulseStrip';

// ---------------------------------------------------------------------------
// Mocks — pattern lifted from MarketplaceCategoryScreen.test.tsx, which is
// proven stable on Ubuntu CI. Keeping the render tree shallow (PulseCard is
// stubbed to a flat View+Text) lets React 19's act flush loop converge.
// ---------------------------------------------------------------------------

const mockGetPulseCards = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../config/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@nepally/shared', () => ({
  getPulseCards: (...args: unknown[]) => mockGetPulseCards(...args),
}));

// Flat stub for PulseCard. Real component is exercised by PulseCard.test.tsx.
// Avoids nested hooks/styles in the render tree that destabilise act() on CI.
jest.mock('./PulseCard', () => {
  const ReactLocal = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    PulseCard: ({ card }: { card: { id: string } }) =>
      ReactLocal.createElement(
        View,
        { testID: `pulse-card-${card.id}` },
        ReactLocal.createElement(Text, null, card.id)
      ),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FX_CARD = {
  kind: 'fx_rate' as const,
  id: 'fx_rate',
  pair: 'USD_NPR' as const,
  rate: 133.25,
  fetchedAt: '2026-04-20T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests — each waitFor holds a single positive assertion. Negative/"stays
// null" assertions inside waitFor don't have a convergence point and are the
// documented cause of the 30s CI hang on this component (apps/mobile
// CLAUDE.md rule #6).
// ---------------------------------------------------------------------------

describe('MetroPulseStrip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches pulse cards with the provided metro params', async () => {
    mockGetPulseCards.mockResolvedValue({
      data: { computedAt: '2026-04-20T00:00:00Z', cards: [] },
    });

    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);

    await waitFor(() => {
      expect(mockGetPulseCards).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ metroAreaId: 'm-1', metroLabel: 'DFW' })
      );
    });
  });

  it('renders cards returned by the composer', async () => {
    mockGetPulseCards.mockResolvedValue({
      data: { computedAt: '2026-04-20T00:00:00Z', cards: [FX_CARD] },
    });

    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);

    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-fx_rate')).toBeTruthy();
    });
  });
});
