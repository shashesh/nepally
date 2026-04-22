import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import { MetroPulseStrip } from './MetroPulseStrip';

const pushMock = vi.fn();
const getPulseCardsMock = vi.fn();

vi.mock('next/router', () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}));
vi.mock('@nepally/shared', () => ({
  getPulseCards: (...args: unknown[]) => getPulseCardsMock(...args),
}));

describe('MetroPulseStrip (web)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    getPulseCardsMock.mockReset();
  });

  it('renders cards from the composer', async () => {
    getPulseCardsMock.mockResolvedValue({
      data: {
        computedAt: '2026-04-20T00:00:00Z',
        cards: [
          { kind: 'fx_rate', id: 'fx_rate', pair: 'USD_NPR', rate: 133.25, fetchedAt: '2026-04-20T00:00:00Z' },
        ],
      },
    });
    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" viewerId="viewer-1" />);
    await waitFor(() => {
      expect(screen.getByTestId('metro-pulse-strip')).toBeDefined();
    });
  });

  it('navigates to /events when the events card is clicked', async () => {
    getPulseCardsMock.mockResolvedValue({
      data: {
        computedAt: '2026-04-20T00:00:00Z',
        cards: [
          {
            kind: 'events_this_week',
            id: 'events_this_week',
            count: 2,
            nextEventTitle: 'Dashain Meetup',
            nextEventStartsAt: '2026-04-22T18:00:00Z',
            deepLink: '/events',
          },
        ],
      },
    });
    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" viewerId="viewer-1" />);
    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-events_this_week')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('pulse-card-events_this_week'));
    expect(pushMock).toHaveBeenCalledWith('/events');
  });

  it('hides the strip when no cards are returned', async () => {
    getPulseCardsMock.mockResolvedValue({
      data: { computedAt: '2026-04-20T00:00:00Z', cards: [] },
    });
    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" viewerId="viewer-1" />);
    await waitFor(() => {
      expect(screen.queryByTestId('metro-pulse-strip')).toBeNull();
    });
  });
});
