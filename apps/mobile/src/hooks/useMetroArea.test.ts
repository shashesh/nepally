import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('../config/supabase', () => ({ supabase: {} }));

const mockSaveMetroArea = jest.fn().mockResolvedValue(undefined);
const mockGetMetroAreaCached = jest.fn().mockResolvedValue(null);

jest.mock('../utils/storage', () => ({
  saveMetroArea: (...args: unknown[]) => mockSaveMetroArea(...args),
  getMetroArea: (...args: unknown[]) => mockGetMetroAreaCached(...args),
}));

import { getMetroByZip, updateUserLocation } from '@nepally/shared';
import type { User } from '@nepally/shared';

jest.mock('@nepally/shared', () => ({
  getMetroByZip: jest.fn().mockResolvedValue({ data: undefined }),
  updateUserLocation: jest.fn().mockResolvedValue({ data: undefined }),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useMetroArea } from './useMetroArea';

const mockGetMetroByZip = getMetroByZip as jest.MockedFunction<typeof getMetroByZip>;
const mockUpdateUserLocation = updateUserLocation as jest.MockedFunction<typeof updateUserLocation>;

const NYC_METRO = {
  id: '35620',
  name: 'New York-Newark-Jersey City',
  state: 'NY',
  population: 20140470,
};

const DALLAS_METRO = {
  id: '19100',
  name: 'Dallas-Fort Worth-Arlington',
  state: 'TX',
  population: 7637387,
};

describe('useMetroArea', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Initial State ──────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with null metroArea, no loading, no error', () => {
      const { result } = renderHook(() => useMetroArea());
      expect(result.current.metroArea).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // ─── fetchMetroByZip ────────────────────────────────────────────────

  describe('fetchMetroByZip', () => {
    it('fetches metro area by zip and updates state', async () => {
      mockGetMetroByZip.mockResolvedValue({ data: NYC_METRO });
      const { result } = renderHook(() => useMetroArea());

      let returned: unknown;
      await act(async () => {
        returned = await result.current.fetchMetroByZip('10001');
      });

      expect(mockGetMetroByZip).toHaveBeenCalledWith({}, '10001');
      expect(result.current.metroArea).toEqual(NYC_METRO);
      expect(returned).toEqual(NYC_METRO);
      expect(result.current.loading).toBe(false);
    });

    it('saves fetched metro to storage cache', async () => {
      mockGetMetroByZip.mockResolvedValue({ data: NYC_METRO });
      const { result } = renderHook(() => useMetroArea());

      await act(async () => {
        await result.current.fetchMetroByZip('10001');
      });

      expect(mockSaveMetroArea).toHaveBeenCalledWith(NYC_METRO);
    });

    it('returns null and sets error on API error', async () => {
      mockGetMetroByZip.mockResolvedValue({
        error: new Error('Invalid ZIP'),
      } as { error: Error });
      const { result } = renderHook(() => useMetroArea());

      let returned: unknown;
      await act(async () => {
        returned = await result.current.fetchMetroByZip('00000');
      });

      expect(returned).toBeNull();
      expect(result.current.error).toBe('Invalid ZIP');
      expect(result.current.metroArea).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('returns null when no data returned', async () => {
      mockGetMetroByZip.mockResolvedValue({ data: undefined });
      const { result } = renderHook(() => useMetroArea());

      let returned: unknown;
      await act(async () => {
        returned = await result.current.fetchMetroByZip('99999');
      });

      expect(returned).toBeNull();
      expect(result.current.metroArea).toBeNull();
    });

    it('handles thrown exception and sets error', async () => {
      mockGetMetroByZip.mockRejectedValue(new Error('Network timeout'));
      const { result } = renderHook(() => useMetroArea());

      let returned: unknown;
      await act(async () => {
        returned = await result.current.fetchMetroByZip('10001');
      });

      expect(returned).toBeNull();
      expect(result.current.error).toBe('Network timeout');
      expect(result.current.loading).toBe(false);
    });

    it('handles non-Error exception with fallback message', async () => {
      mockGetMetroByZip.mockRejectedValue('unknown error');
      const { result } = renderHook(() => useMetroArea());

      await act(async () => {
        await result.current.fetchMetroByZip('10001');
      });

      expect(result.current.error).toBe('Failed to fetch metro area');
    });

    it('clears previous error on new fetch', async () => {
      mockGetMetroByZip.mockResolvedValueOnce({
        error: new Error('First error'),
      } as { error: Error });
      const { result } = renderHook(() => useMetroArea());

      await act(async () => {
        await result.current.fetchMetroByZip('00000');
      });
      expect(result.current.error).toBe('First error');

      mockGetMetroByZip.mockResolvedValueOnce({ data: NYC_METRO });
      await act(async () => {
        await result.current.fetchMetroByZip('10001');
      });
      expect(result.current.error).toBeNull();
      expect(result.current.metroArea).toEqual(NYC_METRO);
    });
  });

  // ─── updateLocation ─────────────────────────────────────────────────

  describe('updateLocation', () => {
    it('calls updateUserLocation and returns true on success', async () => {
      mockUpdateUserLocation.mockResolvedValue({ data: {} as User });
      const { result } = renderHook(() => useMetroArea());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateLocation('user-1', '10001', '35620');
      });

      expect(mockUpdateUserLocation).toHaveBeenCalledWith({}, 'user-1', '10001', '35620');
      expect(success).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('returns false and sets error on API error', async () => {
      mockUpdateUserLocation.mockResolvedValue({
        error: new Error('Update failed'),
      } as { error: Error });
      const { result } = renderHook(() => useMetroArea());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateLocation('user-1', '10001', '35620');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Update failed');
      expect(result.current.loading).toBe(false);
    });

    it('handles thrown exception and returns false', async () => {
      mockUpdateUserLocation.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useMetroArea());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateLocation('user-1', '10001', '35620');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('handles non-Error exception with fallback message', async () => {
      mockUpdateUserLocation.mockRejectedValue(42);
      const { result } = renderHook(() => useMetroArea());

      await act(async () => {
        await result.current.updateLocation('user-1', '10001', '35620');
      });

      expect(result.current.error).toBe('Failed to update location');
    });
  });

  // ─── getCachedMetroArea ─────────────────────────────────────────────

  describe('getCachedMetroArea', () => {
    it('loads cached metro from storage and fills missing population as null', async () => {
      mockGetMetroAreaCached.mockResolvedValue({
        id: '35620',
        name: 'New York-Newark-Jersey City',
        state: 'NY',
      });
      const { result } = renderHook(() => useMetroArea());

      let cached: unknown;
      await act(async () => {
        cached = await result.current.getCachedMetroArea();
      });

      expect(cached).toEqual({
        id: '35620',
        name: 'New York-Newark-Jersey City',
        state: 'NY',
        population: null,
      });
      expect(result.current.metroArea?.id).toBe('35620');
    });

    it('preserves population if present in cache', async () => {
      mockGetMetroAreaCached.mockResolvedValue({
        id: '19100',
        name: 'Dallas-Fort Worth-Arlington',
        state: 'TX',
        population: 7637387,
      });
      const { result } = renderHook(() => useMetroArea());

      let cached: unknown;
      await act(async () => {
        cached = await result.current.getCachedMetroArea();
      });

      expect(cached).toEqual(DALLAS_METRO);
    });

    it('returns null when no cache exists', async () => {
      mockGetMetroAreaCached.mockResolvedValue(null);
      const { result } = renderHook(() => useMetroArea());

      let cached: unknown;
      await act(async () => {
        cached = await result.current.getCachedMetroArea();
      });

      expect(cached).toBeNull();
      expect(result.current.metroArea).toBeNull();
    });

    it('returns null and logs error on storage failure', async () => {
      mockGetMetroAreaCached.mockRejectedValue(new Error('Storage read error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook(() => useMetroArea());

      let cached: unknown;
      await act(async () => {
        cached = await result.current.getCachedMetroArea();
      });

      expect(cached).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
