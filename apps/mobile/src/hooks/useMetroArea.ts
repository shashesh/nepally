import { useState, useCallback } from 'react';
import { getMetroByZip, updateUserLocation } from '@nusa/shared';
import type { MetroArea } from '@nusa/shared';
import { saveMetroArea, getMetroArea as getCachedMetroArea } from '../utils/storage';
import { supabase } from '../config/supabase';

interface UseMetroAreaReturn {
  metroArea: MetroArea | null;
  loading: boolean;
  error: string | null;
  fetchMetroByZip: (zipCode: string) => Promise<MetroArea | null>;
  updateLocation: (userId: string, zipCode: string, metroAreaId: string) => Promise<boolean>;
  getCachedMetroArea: () => Promise<MetroArea | null>;
}

type CachedMetroArea = Pick<MetroArea, 'id' | 'name' | 'state'> & {
  population?: number | null;
};

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
      const result = await getMetroByZip(supabase, zipCode);

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
        const result = await updateUserLocation(supabase, userId, zipCode, metroAreaId);

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
      const cached = (await getCachedMetroArea()) as CachedMetroArea | null;
      if (cached) {
        // AsyncStorage caches {id, name, state} — add population for type compat
        const full: MetroArea = { ...cached, population: cached.population ?? null };
        setMetroArea(full);
        return full;
      }
      return null;
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
