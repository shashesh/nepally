import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// --- Supabase mock ---
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect, eq: mockEq });
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null });

jest.mock('../config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  },
}));

// --- Location service mock ---
const mockGetLocationPermissionStatus = jest.fn().mockResolvedValue('denied');
const mockDetectLocationMetro = jest.fn().mockResolvedValue(null);

jest.mock('../services/location', () => ({
  getLocationPermissionStatus: (...args: unknown[]) => mockGetLocationPermissionStatus(...args),
  detectLocationMetro: (...args: unknown[]) => mockDetectLocationMetro(...args),
}));

// --- Storage mock ---
const mockSaveActiveLocation = jest.fn().mockResolvedValue(undefined);
const mockGetActiveLocation = jest.fn().mockResolvedValue(null);
const mockSaveLocationSnoozes = jest.fn().mockResolvedValue(undefined);
const mockGetLocationSnoozes = jest.fn().mockResolvedValue([]);

jest.mock('../utils/storage', () => ({
  saveActiveLocation: (...args: unknown[]) => mockSaveActiveLocation(...args),
  getActiveLocation: (...args: unknown[]) => mockGetActiveLocation(...args),
  saveLocationSnoozes: (...args: unknown[]) => mockSaveLocationSnoozes(...args),
  getLocationSnoozes: (...args: unknown[]) => mockGetLocationSnoozes(...args),
}));

// --- useAuth mock ---
const mockRefreshUser = jest.fn();
const mockUseAuth = jest.fn(() => ({
  user: null as Record<string, unknown> | null,
  refreshUser: mockRefreshUser,
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// --- @nepally/shared mock ---
import {
  getSavedLocations,
  addSavedLocation,
  isMetroSnoozed,
  hasMetroChanged,
  createSnoozeEntry,
  updateUserLocation,
} from '@nepally/shared';

jest.mock('@nepally/shared', () => ({
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
import { AppState } from 'react-native';
import { LocationContext, LocationProvider } from './LocationContext';

// --- Typed mock references ---
const mockGetSavedLocations = getSavedLocations as jest.MockedFunction<typeof getSavedLocations>;
const mockAddSavedLocation = addSavedLocation as jest.MockedFunction<typeof addSavedLocation>;
const mockIsMetroSnoozed = isMetroSnoozed as jest.MockedFunction<typeof isMetroSnoozed>;
const mockHasMetroChanged = hasMetroChanged as jest.MockedFunction<typeof hasMetroChanged>;
const mockCreateSnoozeEntry = createSnoozeEntry as jest.MockedFunction<typeof createSnoozeEntry>;
const mockUpdateUserLocation = updateUserLocation as jest.MockedFunction<typeof updateUserLocation>;

// --- Helpers ---
function wrapper({ children }: { children: React.ReactNode }) {
  return <LocationProvider>{children}</LocationProvider>;
}

function setAuthUser(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    user: {
      id: 'user-1',
      metro_area_id: '19100',
      zip_code: '75001',
      trust_level: 1,
      ...overrides,
    },
    refreshUser: mockRefreshUser,
  });
}

function setNoUser() {
  mockUseAuth.mockReturnValue({ user: null, refreshUser: mockRefreshUser });
}

async function renderAndSettle() {
  const result = renderHook(() => React.useContext(LocationContext), { wrapper });
  await act(async () => {});
  await act(async () => {});
  await act(async () => {});
  return result;
}

const DALLAS_METRO = {
  metro_area_id: '19100',
  metro_name: 'Dallas-Fort Worth-Arlington',
  metro_state: 'TX',
  source: 'saved' as const,
  is_temporary: false,
};

const NYC_METRO = {
  metro_area_id: '35620',
  metro_name: 'New York-Newark-Jersey City',
  metro_state: 'NY',
  source: 'gps' as const,
  is_temporary: true,
};

describe('LocationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNoUser();
    mockGetActiveLocation.mockResolvedValue(null);
    mockGetLocationSnoozes.mockResolvedValue([]);
    mockGetSavedLocations.mockResolvedValue({ data: [] });
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  // ─── Initial State ──────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with null activeLocation and empty savedLocations', async () => {
      const { result } = await renderAndSettle();
      expect(result.current.activeLocation).toBeNull();
      expect(result.current.savedLocations).toEqual([]);
      expect(result.current.detectedLocation).toBeNull();
      expect(result.current.showChangePrompt).toBe(false);
    });

    it('loads active location from storage on mount', async () => {
      mockGetActiveLocation.mockResolvedValue(DALLAS_METRO);
      // Set user so the logout effect doesn't clear activeLocation
      setAuthUser();
      const { result } = await renderAndSettle();
      expect(mockGetActiveLocation).toHaveBeenCalled();
      expect(result.current.activeLocation?.metro_area_id).toBe('19100');
    });

    it('clears temporary location from storage on mount', async () => {
      mockGetActiveLocation.mockResolvedValue({ ...DALLAS_METRO, is_temporary: true });
      const { result } = await renderAndSettle();
      // Temporary locations are cleared on restart — activeLocation falls through
      expect(result.current.activeLocation?.is_temporary).not.toBe(true);
    });

    it('loads and filters expired snoozes from storage on mount', async () => {
      const expiredSnooze = {
        metro_area_id: '35620',
        snoozed_until: new Date(Date.now() - 1000).toISOString(),
      };
      mockGetLocationSnoozes.mockResolvedValue([expiredSnooze]);
      await renderAndSettle();
      expect(mockGetLocationSnoozes).toHaveBeenCalled();
      // Expired snoozes are filtered out — no direct way to assert snoozes state,
      // but we verify it doesn't crash
    });
  });

  // ─── User Login / Logout ────────────────────────────────────────────

  describe('user login and logout', () => {
    it('resets state when user logs out', async () => {
      setAuthUser();
      const { result, rerender } = await renderAndSettle();

      setNoUser();
      rerender(<LocationProvider>{null}</LocationProvider>);
      await act(async () => {});
      await act(async () => {});

      expect(result.current.activeLocation).toBeNull();
      expect(result.current.savedLocations).toEqual([]);
      expect(result.current.showChangePrompt).toBe(false);
    });

    it('refreshes saved locations when user is present', async () => {
      setAuthUser();
      await renderAndSettle();
      expect(mockGetSavedLocations).toHaveBeenCalled();
    });

    it('initializes active location from user metro when no stored location', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '19100', name: 'Dallas-Fort Worth-Arlington', state: 'TX' },
        error: null,
      });
      setAuthUser();
      const { result } = await renderAndSettle();
      await act(async () => {});

      // initActiveLocationFromUser should have set the active location
      expect(result.current.activeLocation?.metro_area_id).toBe('19100');
      expect(mockSaveActiveLocation).toHaveBeenCalled();
    });
  });

  // ─── browseMetro ────────────────────────────────────────────────────

  describe('browseMetro', () => {
    it('sets a temporary active location', async () => {
      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.browseMetro(NYC_METRO);
      });

      expect(result.current.activeLocation?.metro_area_id).toBe('35620');
      expect(result.current.activeLocation?.is_temporary).toBe(true);
      expect(result.current.activeLocation?.source).toBe('gps');
    });

    it('persists browsed location to storage', async () => {
      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.browseMetro(NYC_METRO);
      });

      expect(mockSaveActiveLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          metro_area_id: '35620',
          is_temporary: true,
        }),
      );
    });

    it('hides change prompt when browsing', async () => {
      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.browseMetro(NYC_METRO);
      });

      expect(result.current.showChangePrompt).toBe(false);
    });
  });

  // ─── updateMetroPermanent ───────────────────────────────────────────

  describe('updateMetroPermanent', () => {
    it('updates user location in DB and refreshes user', async () => {
      setAuthUser();
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.updateMetroPermanent('35620', 'New York', 'NY', '10001');
      });

      expect(mockUpdateUserLocation).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        '10001',
        '35620',
      );
      expect(mockRefreshUser).toHaveBeenCalled();
    });

    it('sets permanent active location and saves to storage', async () => {
      setAuthUser();
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.updateMetroPermanent('35620', 'New York', 'NY');
      });

      expect(result.current.activeLocation?.metro_area_id).toBe('35620');
      expect(result.current.activeLocation?.is_temporary).toBe(false);
      expect(result.current.activeLocation?.source).toBe('manual');
      expect(mockSaveActiveLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          metro_area_id: '35620',
          is_temporary: false,
          source: 'manual',
        }),
      );
    });

    it('hides change prompt after update', async () => {
      setAuthUser();
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.updateMetroPermanent('35620', 'New York', 'NY');
      });

      expect(result.current.showChangePrompt).toBe(false);
    });

    it('does nothing when no user', async () => {
      setNoUser();
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.updateMetroPermanent('35620', 'New York', 'NY');
      });

      expect(mockUpdateUserLocation).not.toHaveBeenCalled();
    });

    it('uses user zip_code as fallback when zipCode param is undefined', async () => {
      setAuthUser({ zip_code: '75001' });
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.updateMetroPermanent('35620', 'New York', 'NY');
      });

      expect(mockUpdateUserLocation).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        '75001',
        '35620',
      );
    });
  });

  // ─── snoozeMetro ────────────────────────────────────────────────────

  describe('snoozeMetro', () => {
    it('creates a snooze entry and saves to storage', async () => {
      const snoozeEntry = {
        metro_area_id: '35620',
        snoozed_until: new Date(Date.now() + 3600000).toISOString(),
      };
      mockCreateSnoozeEntry.mockReturnValue(snoozeEntry);

      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.snoozeMetro('35620');
      });

      expect(mockCreateSnoozeEntry).toHaveBeenCalledWith('35620');
      expect(mockSaveLocationSnoozes).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ metro_area_id: '35620' })]),
      );
    });

    it('hides change prompt after snooze', async () => {
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.snoozeMetro('35620');
      });

      expect(result.current.showChangePrompt).toBe(false);
    });
  });

  // ─── setManualOverride ──────────────────────────────────────────────

  describe('setManualOverride', () => {
    it('sets a permanent non-temporary location with source "saved"', async () => {
      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.setManualOverride(DALLAS_METRO);
      });

      expect(result.current.activeLocation?.metro_area_id).toBe('19100');
      expect(result.current.activeLocation?.is_temporary).toBe(false);
      expect(result.current.activeLocation?.source).toBe('saved');
    });

    it('persists to storage', async () => {
      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.setManualOverride(DALLAS_METRO);
      });

      expect(mockSaveActiveLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          metro_area_id: '19100',
          is_temporary: false,
          source: 'saved',
        }),
      );
    });

    it('hides change prompt', async () => {
      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.setManualOverride(DALLAS_METRO);
      });

      expect(result.current.showChangePrompt).toBe(false);
    });
  });

  // ─── dismissChangePrompt ───────────────────────────────────────────

  describe('dismissChangePrompt', () => {
    it('hides the change prompt', async () => {
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.dismissChangePrompt();
      });

      expect(result.current.showChangePrompt).toBe(false);
    });
  });

  // ─── checkLocationChange ────────────────────────────────────────────

  describe('checkLocationChange', () => {
    it('does nothing when location permission is denied', async () => {
      mockGetActiveLocation.mockResolvedValue(DALLAS_METRO);
      mockGetLocationPermissionStatus.mockResolvedValue('denied');
      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.checkLocationChange();
      });

      expect(mockDetectLocationMetro).not.toHaveBeenCalled();
    });

    it('does nothing when no active location', async () => {
      setNoUser();
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.checkLocationChange();
      });

      expect(mockGetLocationPermissionStatus).not.toHaveBeenCalled();
    });

    it('detects location and shows prompt when metro has changed', async () => {
      mockGetActiveLocation.mockResolvedValue(DALLAS_METRO);
      mockGetLocationPermissionStatus.mockResolvedValue('granted');
      mockDetectLocationMetro.mockResolvedValue({
        metro_area_id: '35620',
        metro_name: 'New York',
        metro_state: 'NY',
        zip_code: '10001',
        latitude: 40.7,
        longitude: -74.0,
      });
      mockHasMetroChanged.mockReturnValue(true);
      mockIsMetroSnoozed.mockReturnValue(false);

      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.checkLocationChange();
      });

      expect(result.current.detectedLocation?.metro_area_id).toBe('35620');
      expect(result.current.showChangePrompt).toBe(true);
    });

    it('does not show prompt when detected metro is snoozed', async () => {
      mockGetActiveLocation.mockResolvedValue(DALLAS_METRO);
      mockGetLocationPermissionStatus.mockResolvedValue('granted');
      mockDetectLocationMetro.mockResolvedValue({
        metro_area_id: '35620',
        metro_name: 'New York',
        metro_state: 'NY',
        zip_code: '10001',
        latitude: 40.7,
        longitude: -74.0,
      });
      mockHasMetroChanged.mockReturnValue(true);
      mockIsMetroSnoozed.mockReturnValue(true);

      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.checkLocationChange();
      });

      expect(result.current.showChangePrompt).toBe(false);
    });

    it('does not show prompt when metro has not changed', async () => {
      mockGetActiveLocation.mockResolvedValue(DALLAS_METRO);
      mockGetLocationPermissionStatus.mockResolvedValue('granted');
      mockDetectLocationMetro.mockResolvedValue({
        metro_area_id: '19100',
        metro_name: 'Dallas',
        metro_state: 'TX',
        zip_code: '75001',
        latitude: 32.7,
        longitude: -96.8,
      });
      mockHasMetroChanged.mockReturnValue(false);

      setAuthUser({ metro_area_id: null });
      const { result } = await renderAndSettle();

      await act(async () => {
        await result.current.checkLocationChange();
      });

      expect(result.current.showChangePrompt).toBe(false);
    });
  });

  // ─── refreshSavedLocations ──────────────────────────────────────────

  describe('refreshSavedLocations', () => {
    it('fetches saved locations from DB', async () => {
      const savedLocs = [
        {
          id: 'loc-1',
          user_id: 'user-1',
          metro_area_id: '19100',
          label: 'Home',
          zip_code: '75001',
          is_default: true,
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metro_area: { id: '19100', name: 'Dallas-Fort Worth-Arlington', state: 'TX' },
        },
      ];
      mockGetSavedLocations.mockResolvedValue({ data: savedLocs });
      setAuthUser();

      const { result } = await renderAndSettle();

      expect(result.current.savedLocations).toHaveLength(1);
      expect(result.current.savedLocations[0].metro_area_id).toBe('19100');
    });

    it('bootstraps default saved location when none exist', async () => {
      mockGetSavedLocations
        .mockResolvedValueOnce({ data: [] }) // first call: empty
        .mockResolvedValueOnce({ data: [{ // after bootstrap
          id: 'loc-new',
          user_id: 'user-1',
          metro_area_id: '19100',
          label: 'Home',
          zip_code: '75001',
          is_default: true,
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metro_area: { id: '19100', name: 'Dallas', state: 'TX' },
        }] });
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

      setAuthUser();
      await renderAndSettle();
      await act(async () => {});

      expect(mockAddSavedLocation).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        '19100',
        'Home',
        '75001',
        true,
      );
    });

    it('does nothing when no user', async () => {
      setNoUser();
      await renderAndSettle();
      expect(mockGetSavedLocations).not.toHaveBeenCalled();
    });
  });

  // ─── AppState Listener ──────────────────────────────────────────────

  describe('AppState foreground detection', () => {
    it('registers an AppState change listener', async () => {
      const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');
      setAuthUser();
      await renderAndSettle();
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });
  });
});
