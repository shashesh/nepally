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

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<LocationDetectionResult | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [showChangePrompt, setShowChangePrompt] = useState(false);
  const [snoozes, setSnoozes] = useState<LocationSnooze[]>([]);
  const manualOverrideRef = useRef(false);

  // Load initial state from localStorage
  useEffect(() => {
    const stored = loadFromStorage<ActiveLocation | null>('@nusa:web_active_location', null);
    const storedSnoozes = loadFromStorage<LocationSnooze[]>('@nusa:web_snoozes', []);

    // Filter expired snoozes
    const activeSnoozes = storedSnoozes.filter(
      (s) => new Date(s.snoozed_until) > new Date()
    );
    setSnoozes(activeSnoozes);

    // Clear temporary locations on page load
    if (stored && !stored.is_temporary) {
      setActiveLocation(stored);
    }
  }, []);

  const initActiveLocationFromUser = useCallback(async () => {
    if (!user?.metro_area_id) return;

    const { data } = await supabase
      .from('metro_areas')
      .select('id, name, state')
      .eq('id', user.metro_area_id)
      .single();

    if (data) {
      const loc: ActiveLocation = {
        metro_area_id: data.id,
        metro_name: data.name,
        metro_state: data.state,
        source: 'saved',
        is_temporary: false,
      };
      setActiveLocation(loc);
      saveToStorage('@nusa:web_active_location', loc);
    }
  }, [user?.metro_area_id]);

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

  // When user changes, reload
  useEffect(() => {
    if (user) {
      refreshSavedLocations();
      if (!activeLocation && user.metro_area_id) {
        initActiveLocationFromUser();
      }
    } else {
      setActiveLocation(null);
      setSavedLocations([]);
      setDetectedLocation(null);
      setShowChangePrompt(false);
    }
  }, [user, activeLocation, refreshSavedLocations, initActiveLocationFromUser]);

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
