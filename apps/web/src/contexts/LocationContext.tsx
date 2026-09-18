'use client';

import React, { createContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  getSavedLocations,
  isMetroSnoozed,
  hasMetroChanged,
  createSnoozeEntry,
  updateUserLocation,
} from '@nepally/shared';
import type {
  ActiveLocation,
  LocationDetectionResult,
  SavedLocation,
  LocationSnooze,
} from '@nepally/shared';
import {
  requestLocationPermission,
  detectLocationMetro,
} from '../lib/location';

interface LocationContextType {
  activeLocation: ActiveLocation | null;
  detectedLocation: LocationDetectionResult | null;
  savedLocations: SavedLocation[];
  showChangePrompt: boolean;
  browseMetro: (metro: ActiveLocation) => void;
  updateMetroPermanent: (metroAreaId: string, metroName: string, metroState: string, zipCode?: string) => Promise<void>;
  snoozeMetro: (metroAreaId: string) => void;
  setManualOverride: (metro: ActiveLocation) => void;
  dismissChangePrompt: () => void;
  refreshSavedLocations: () => Promise<void>;
  checkLocationChange: () => Promise<void>;
}

export const LocationContext = createContext<LocationContextType>({
  activeLocation: null,
  detectedLocation: null,
  savedLocations: [],
  showChangePrompt: false,
  browseMetro: () => {},
  updateMetroPermanent: async () => {},
  snoozeMetro: () => {},
  setManualOverride: () => {},
  dismissChangePrompt: () => {},
  refreshSavedLocations: async () => {},
  checkLocationChange: async () => {},
});

// localStorage helpers
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

// Snoozes are never rendered, so reading them while rendering cannot cause a
// hydration mismatch; on the server localStorage is missing and this is [].
function loadActiveSnoozes(): LocationSnooze[] {
  const storedSnoozes = loadFromStorage<LocationSnooze[]>('@nusa:web_snoozes', []);
  // Filter expired snoozes
  return storedSnoozes.filter((s) => new Date(s.snoozed_until) > new Date());
}

/** The user's home metro as an active location, or null when it can't be loaded. */
async function fetchHomeMetroLocation(metroAreaId: string): Promise<ActiveLocation | null> {
  const { data } = await supabase
    .from('metro_areas')
    .select('id, name, state')
    .eq('id', metroAreaId)
    .single();

  if (!data) return null;
  return {
    metro_area_id: data.id,
    metro_name: data.name,
    metro_state: data.state,
    source: 'saved',
    is_temporary: false,
  };
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  // The active location is not restored from localStorage: this provider always
  // mounts signed out (AuthProvider starts with user = null), and the signed-out
  // reset below would clear it before it is shown. Once signed in it starts
  // from the user's home metro (effect below).
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<LocationDetectionResult | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [showChangePrompt, setShowChangePrompt] = useState(false);
  const [snoozes, setSnoozes] = useState<LocationSnooze[]>(loadActiveSnoozes);
  const manualOverrideRef = useRef(false);

  // Signed out: drop the previous user's location state during render
  // (react.dev "Adjusting some state when a prop changes"), before any of it
  // is shown.
  if (
    !user &&
    (activeLocation !== null ||
      savedLocations.length > 0 ||
      detectedLocation !== null ||
      showChangePrompt)
  ) {
    setActiveLocation(null);
    setSavedLocations([]);
    setDetectedLocation(null);
    setShowChangePrompt(false);
  }

  const refreshSavedLocations = useCallback(async () => {
    if (!user) return;
    const result = await getSavedLocations(supabase, user.id);
    if (result.data) {
      setSavedLocations(result.data);
    }
  }, [user]);

  const checkLocationChange = useCallback(async () => {
    if (!activeLocation) return;

    const permStatus = await requestLocationPermission();
    if (permStatus !== 'granted') return;

    const detected = await detectLocationMetro();
    if (!detected) return;

    setDetectedLocation(detected);

    if (
      hasMetroChanged(activeLocation.metro_area_id, detected.metro_area_id) &&
      !isMetroSnoozed(detected.metro_area_id, snoozes)
    ) {
      setShowChangePrompt(true);
    }
  }, [activeLocation, snoozes]);

  // When the user or the active location changes, reload saved locations, and
  // start from the user's home metro while there is no active location. The
  // signed-out reset happens during render above.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void getSavedLocations(supabase, user.id).then((result) => {
      if (!cancelled && result.data) setSavedLocations(result.data);
    });

    if (!activeLocation && user.metro_area_id) {
      void fetchHomeMetroLocation(user.metro_area_id).then((loc) => {
        // Dropped if a location was picked (or the user changed) meanwhile.
        if (cancelled || !loc) return;
        setActiveLocation(loc);
        saveToStorage('@nusa:web_active_location', loc);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [user, activeLocation]);

  // Visibility change listener (foreground detection for web)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !manualOverrideRef.current) {
        checkLocationChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, checkLocationChange]);

  const browseMetro = useCallback((metro: ActiveLocation) => {
    const tempLocation: ActiveLocation = {
      ...metro,
      is_temporary: true,
      source: 'gps',
    };
    setActiveLocation(tempLocation);
    saveToStorage('@nusa:web_active_location', tempLocation);
    setShowChangePrompt(false);
  }, []);

  const updateMetroPermanent = useCallback(
    async (metroAreaId: string, metroName: string, metroState: string, zipCode?: string) => {
      if (!user) return;

      await updateUserLocation(supabase, user.id, zipCode ?? user.zip_code ?? '', metroAreaId);
      await refreshUser();

      const newLocation: ActiveLocation = {
        metro_area_id: metroAreaId,
        metro_name: metroName,
        metro_state: metroState,
        source: 'manual',
        is_temporary: false,
      };
      setActiveLocation(newLocation);
      saveToStorage('@nusa:web_active_location', newLocation);
      setShowChangePrompt(false);
    },
    [user, refreshUser]
  );

  const snoozeMetro = useCallback(
    (metroAreaId: string) => {
      const entry = createSnoozeEntry(metroAreaId);
      const updated = [...snoozes.filter((s) => s.metro_area_id !== metroAreaId), entry];
      setSnoozes(updated);
      saveToStorage('@nusa:web_snoozes', updated);
      setShowChangePrompt(false);
    },
    [snoozes]
  );

  const setManualOverride = useCallback((metro: ActiveLocation) => {
    manualOverrideRef.current = true;
    const loc: ActiveLocation = {
      ...metro,
      is_temporary: false,
      source: 'saved',
    };
    setActiveLocation(loc);
    saveToStorage('@nusa:web_active_location', loc);
    setShowChangePrompt(false);
  }, []);

  const dismissChangePrompt = useCallback(() => {
    setShowChangePrompt(false);
  }, []);

  return (
    <LocationContext.Provider
      value={{
        activeLocation,
        detectedLocation,
        savedLocations,
        showChangePrompt,
        browseMetro,
        updateMetroPermanent,
        snoozeMetro,
        setManualOverride,
        dismissChangePrompt,
        refreshSavedLocations,
        checkLocationChange,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
