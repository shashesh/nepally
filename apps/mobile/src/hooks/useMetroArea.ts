import { useState, useCallback } from 'react';
import { getMetroByZip } from '../services/api/metroArea';
import { updateUserLocation } from '../services/api/users';
import { saveMetroArea, getMetroArea as getCachedMetroArea } from '../utils/storage';

interface MetroArea {
  id: string;
  name: string;
  state: string;
}

interface UseMetroAreaReturn {
  metroArea: MetroArea | null;
  loading: boolean;
  error: string | null;
  fetchMetroByZip: (zipCode: string) => Promise<MetroArea | null>;
  updateLocation: (userId: string, zipCode: string, metroAreaId: string) => Promise<boolean>;
  getCachedMetroArea: () => Promise<MetroArea | null>;
}

/**
 * Hook for metro area operations
 */
export function useMetroArea(): UseMetroAreaReturn {
  const [metroArea, setMetroArea] = useState<MetroArea | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetroByZip = useCallback(async (zipCode: string): Promise<MetroArea | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await getMetroByZip(zipCode);

      if (result.error) {
        setError(result.error.message);
        return null;
      }

      if (result.data) {
        setMetroArea(result.data);
        await saveMetroArea(result.data);
        return result.data;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metro area';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLocation = useCallback(
    async (userId: string, zipCode: string, metroAreaId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const result = await updateUserLocation(userId, zipCode, metroAreaId);

        if (result.error) {
          setError(result.error.message);
          return false;
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update location';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadCachedMetroArea = useCallback(async (): Promise<MetroArea | null> => {
    try {
      const cached = await getCachedMetroArea();
      if (cached) {
        setMetroArea(cached);
      }
      return cached;
    } catch (err) {
      console.error('Failed to load cached metro area:', err);
      return null;
    }
  }, []);

  return {
    metroArea,
    loading,
    error,
    fetchMetroByZip,
    updateLocation,
    getCachedMetroArea: loadCachedMetroArea,
  };
}
