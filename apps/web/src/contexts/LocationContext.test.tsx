import React, { useContext } from 'react';
import { act, render, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const locationMocks = vi.hoisted(() => ({
  getSavedLocationsMock: vi.fn(),
  isMetroSnoozedMock: vi.fn(),
  hasMetroChangedMock: vi.fn(),
  createSnoozeEntryMock: vi.fn(),
  updateUserLocationMock: vi.fn(),
  requestLocationPermissionMock: vi.fn(),
  detectLocationMetroMock: vi.fn(),
  refreshUserMock: vi.fn(),
  metroSingleMock: vi.fn(),
  signedOut: false,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: locationMocks.signedOut
      ? null
      : {
          id: 'user-1',
          metro_area_id: '19100',
          zip_code: '75001',
        },
    refreshUser: locationMocks.refreshUserMock,
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: locationMocks.metroSingleMock,
        })),
      })),
    })),
  },
}));

vi.mock('../lib/location', () => ({
  requestLocationPermission: locationMocks.requestLocationPermissionMock,
  detectLocationMetro: locationMocks.detectLocationMetroMock,
}));

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getSavedLocations: locationMocks.getSavedLocationsMock,
    isMetroSnoozed: locationMocks.isMetroSnoozedMock,
    hasMetroChanged: locationMocks.hasMetroChangedMock,
    createSnoozeEntry: locationMocks.createSnoozeEntryMock,
    updateUserLocation: locationMocks.updateUserLocationMock,
  };
});

import { LocationContext, LocationProvider } from './LocationContext';

function ContextProbe({ onSnapshot }: { onSnapshot: (value: React.ContextType<typeof LocationContext>) => void }) {
  const value = useContext(LocationContext);
  onSnapshot(value);
  return null;
}

describe('LocationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    locationMocks.signedOut = false;

    locationMocks.metroSingleMock.mockResolvedValue({
      data: { id: '19100', name: 'Dallas-Fort Worth-Arlington', state: 'TX' },
      error: null,
    });

    locationMocks.getSavedLocationsMock.mockResolvedValue({ data: [] });
    locationMocks.requestLocationPermissionMock.mockResolvedValue('granted');
    locationMocks.detectLocationMetroMock.mockResolvedValue({
      metro_area_id: '35620',
      metro_name: 'New York-Newark-Jersey City',
      metro_state: 'NY',
      zip_code: '10001',
      source: 'gps',
    });
    locationMocks.hasMetroChangedMock.mockReturnValue(true);
    locationMocks.isMetroSnoozedMock.mockReturnValue(false);
    locationMocks.createSnoozeEntryMock.mockReturnValue({
      metro_area_id: '35620',
      snoozed_until: '2026-02-25T00:00:00.000Z',
    });
    locationMocks.updateUserLocationMock.mockResolvedValue({ data: { id: 'user-1' } });
    locationMocks.refreshUserMock.mockResolvedValue(undefined);
  });

  it('initializes active location from user metro and loads saved locations', async () => {
    const snapshots: Array<React.ContextType<typeof LocationContext>> = [];

    render(
      <LocationProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </LocationProvider>
    );

    await waitFor(() => {
      const latest = snapshots[snapshots.length - 1];
      expect(latest.activeLocation?.metro_area_id).toBe('19100');
      expect(latest.activeLocation?.source).toBe('saved');
    });

    expect(locationMocks.getSavedLocationsMock).toHaveBeenCalled();
  });

  it('updates metro permanently via shared updateUserLocation', async () => {
    const snapshots: Array<React.ContextType<typeof LocationContext>> = [];

    render(
      <LocationProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </LocationProvider>
    );

    await waitFor(() => {
      const latest = snapshots[snapshots.length - 1];
      expect(latest.activeLocation?.metro_area_id).toBe('19100');
    });

    await snapshots[snapshots.length - 1].updateMetroPermanent(
      '35620',
      'New York-Newark-Jersey City',
      'NY',
      '10001'
    );

    await waitFor(() => {
      const latest = snapshots[snapshots.length - 1];
      expect(locationMocks.updateUserLocationMock).toHaveBeenCalled();
      expect(latest.activeLocation?.metro_area_id).toBe('35620');
      expect(latest.activeLocation?.source).toBe('manual');
    });
  });

  it('shows change prompt when detected metro differs and is not snoozed', async () => {
    const snapshots: Array<React.ContextType<typeof LocationContext>> = [];

    render(
      <LocationProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </LocationProvider>
    );

    await waitFor(() => {
      const latest = snapshots[snapshots.length - 1];
      expect(latest.activeLocation?.metro_area_id).toBe('19100');
    });

    await snapshots[snapshots.length - 1].checkLocationChange();

    await waitFor(() => {
      const latest = snapshots[snapshots.length - 1];
      expect(locationMocks.requestLocationPermissionMock).toHaveBeenCalled();
      expect(locationMocks.detectLocationMetroMock).toHaveBeenCalled();
      expect(locationMocks.hasMetroChangedMock).toHaveBeenCalled();
      expect(latest.showChangePrompt).toBe(true);
    });
  });

  it('checks the detected metro against unexpired snoozes from localStorage', async () => {
    const activeSnooze = { metro_area_id: '35620', snoozed_until: new Date(Date.now() + 3_600_000).toISOString() };
    const expiredSnooze = { metro_area_id: '31080', snoozed_until: new Date(Date.now() - 1_000).toISOString() };
    localStorage.setItem('@nusa:web_snoozes', JSON.stringify([activeSnooze, expiredSnooze]));
    locationMocks.isMetroSnoozedMock.mockReturnValue(true);
    const snapshots: Array<React.ContextType<typeof LocationContext>> = [];

    render(
      <LocationProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </LocationProvider>
    );

    await waitFor(() => {
      expect(snapshots[snapshots.length - 1].activeLocation?.metro_area_id).toBe('19100');
    });

    await act(async () => {
      await snapshots[snapshots.length - 1].checkLocationChange();
    });

    expect(locationMocks.isMetroSnoozedMock).toHaveBeenCalledWith('35620', [activeSnooze]);
    expect(snapshots[snapshots.length - 1].showChangePrompt).toBe(false);
  });

  it('keeps a location picked while the home metro is still loading', async () => {
    let resolveMetro!: (value: unknown) => void;
    locationMocks.metroSingleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveMetro = resolve;
      })
    );
    const snapshots: Array<React.ContextType<typeof LocationContext>> = [];

    render(
      <LocationProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </LocationProvider>
    );

    await waitFor(() => {
      expect(locationMocks.metroSingleMock).toHaveBeenCalled();
    });

    act(() => {
      snapshots[snapshots.length - 1].browseMetro({
        metro_area_id: '35620',
        metro_name: 'New York-Newark-Jersey City',
        metro_state: 'NY',
        source: 'gps',
        is_temporary: true,
      });
    });

    await act(async () => {
      resolveMetro({ data: { id: '19100', name: 'Dallas-Fort Worth-Arlington', state: 'TX' }, error: null });
    });

    // The late home-metro lookup must not replace the metro the user picked.
    expect(snapshots[snapshots.length - 1].activeLocation?.metro_area_id).toBe('35620');
  });

  it('clears location state on sign-out before rendering any of it', async () => {
    locationMocks.getSavedLocationsMock.mockResolvedValue({
      data: [{ id: 'loc-1', user_id: 'user-1', metro_area_id: '19100', label: 'Home' }],
    });
    const snapshots: Array<React.ContextType<typeof LocationContext>> = [];
    const tree = () => (
      <LocationProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </LocationProvider>
    );

    const view = render(tree());

    await waitFor(() => {
      const latest = snapshots[snapshots.length - 1];
      expect(latest.activeLocation?.metro_area_id).toBe('19100');
      expect(latest.savedLocations).toHaveLength(1);
    });

    const renderedBeforeSignOut = snapshots.length;
    locationMocks.signedOut = true;
    view.rerender(tree());

    const afterSignOut = snapshots.slice(renderedBeforeSignOut);
    expect(afterSignOut.length).toBeGreaterThan(0);
    for (const snapshot of afterSignOut) {
      expect(snapshot.activeLocation).toBeNull();
      expect(snapshot.savedLocations).toEqual([]);
      expect(snapshot.detectedLocation).toBeNull();
      expect(snapshot.showChangePrompt).toBe(false);
    }
  });
});
