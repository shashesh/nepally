jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
}));

jest.mock('../services/location', () => ({
  getLocationPermissionStatus: jest.fn().mockResolvedValue('denied'),
  detectLocationMetro: jest.fn().mockResolvedValue(null),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    refreshUser: jest.fn(),
  })),
}));

jest.mock('@nusa/shared', () => ({
  getSavedLocations: jest.fn().mockResolvedValue({ data: [], error: null }),
  addSavedLocation: jest.fn().mockResolvedValue({ data: null, error: null }),
  isMetroSnoozed: jest.fn().mockReturnValue(false),
  hasMetroChanged: jest.fn().mockReturnValue(false),
  createSnoozeEntry: jest.fn().mockReturnValue({
    metro_area_id: 'test',
    snoozed_until: new Date(Date.now() + 3600000).toISOString(),
  }),
  updateUserLocation: jest.fn().mockResolvedValue({ data: null, error: null }),
}));

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { LocationContext, LocationProvider } from './LocationContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <LocationProvider>{children}</LocationProvider>;
}

describe('LocationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with null activeLocation and empty savedLocations', async () => {
    const { result } = renderHook(() => React.useContext(LocationContext), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.activeLocation).toBeNull();
    expect(result.current.savedLocations).toEqual([]);
  });

  it('browseMetro sets a temporary active location', async () => {
    // Use a user with no metro_area_id so initActiveLocationFromUser is skipped,
    // but user is non-null so the effect doesn't reset activeLocation to null.
    const { useAuth } = require('../hooks/useAuth');
    useAuth.mockReturnValue({
      user: { id: 'user-1', metro_area_id: null },
      refreshUser: jest.fn(),
    });

    const { result } = renderHook(() => React.useContext(LocationContext), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      result.current.browseMetro({
        metro_area_id: '35620',
        metro_name: 'New York-Newark-Jersey City',
        metro_state: 'NY',
        source: 'gps',
        is_temporary: true,
      });
    });
    expect(result.current.activeLocation?.metro_area_id).toBe('35620');
    expect(result.current.activeLocation?.is_temporary).toBe(true);
  });

  it('snoozeMetro hides the change prompt', async () => {
    const { result } = renderHook(() => React.useContext(LocationContext), { wrapper });
    await act(async () => {
      result.current.snoozeMetro('35620');
    });
    expect(result.current.showChangePrompt).toBe(false);
  });

  it('dismissChangePrompt hides the prompt', async () => {
    const { result } = renderHook(() => React.useContext(LocationContext), { wrapper });
    await act(async () => {
      result.current.dismissChangePrompt();
    });
    expect(result.current.showChangePrompt).toBe(false);
  });
});
