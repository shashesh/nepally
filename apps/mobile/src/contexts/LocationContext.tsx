import React, { createContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import {
  getSavedLocations,
  addSavedLocation,
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
  getLocationPermissionStatus,
  detectLocationMetro,
} from '../services/location';
import {
  saveActiveLocation,
  getActiveLocation,
  saveLocationSnoozes,
  getLocationSnoozes,
} from '../utils/storage';

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

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const { user, refreshUser } = useAuth();
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<LocationDetectionResult | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [showChangePrompt, setShowChangePrompt] = useState(false);
  const [snoozes, setSnoozes] = useState<LocationSnooze[]>([]);
  const manualOverrideRef = useRef(false);
  const initializedUserIdRef = useRef<string | null>(null);
  const isInitializingRef = useRef(false);
  const isRefreshingLocationsRef = useRef(false);

  // Load active location and snoozes from storage on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stored, storedSnoozes] = await Promise.all([
        getActiveLocation(),
        getLocationSnoozes(),
      ]);
      if (cancelled) return;

      // Filter out expired snoozes
      const activeSnoozes = storedSnoozes.filter(
        (s) => new Date(s.snoozed_until) > new Date()
      );
      setSnoozes(activeSnoozes);

      // Clear temporary locations on app restart: don't use the temporary
      // location; fall through to user's metro
      if (stored && !stored.is_temporary) {
        setActiveLocation(stored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const initActiveLocationFromUser = useCallback(async () => {
    if (!user?.metro_area_id) return;
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      // Fetch metro name from DB
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
        await saveActiveLocation(loc);
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [user?.metro_area_id]);

  const refreshSavedLocations = useCallback(async () => {
    if (!user) return;
    if (isRefreshingLocationsRef.current) return;
    isRefreshingLocationsRef.current = true;

    try {
      let locationsResult = await getSavedLocations(supabase, user.id);

      if (locationsResult.error) {
        console.error('Failed to fetch saved locations:', locationsResult.error.message);
      }

      let locations = locationsResult.data ?? [];

      if (locations.length === 0 && user.metro_area_id) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        const canWriteSavedLocations = authUser?.id === user.id;

        if (canWriteSavedLocations) {
          const bootstrapResult = await addSavedLocation(
            supabase,
            user.id,
            user.metro_area_id,
            'Home',
            user.zip_code,
            true
          );

          if (bootstrapResult.error) {
            console.error('Failed to bootstrap default saved location:', bootstrapResult.error.message);
          }

          locationsResult = await getSavedLocations(supabase, user.id);
          if (locationsResult.error) {
            console.error('Failed to refetch saved locations:', locationsResult.error.message);
          }
          locations = locationsResult.data ?? [];
        }
      }

      if (locations.length > 0) {
        setSavedLocations(locations);
      } else if (user.metro_area_id) {
        const { data: metroData } = await supabase
          .from('metro_areas')
          .select('id, name, state')
          .eq('id', user.metro_area_id)
          .single();

        if (metroData) {
          const fallbackSavedLocation: SavedLocation = {
            id: `fallback-${user.id}-${metroData.id}`,
            user_id: user.id,
            metro_area_id: metroData.id,
            label: 'Home',
            zip_code: user.zip_code ?? null,
            is_default: true,
            sort_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metro_area: {
              id: metroData.id,
              name: metroData.name,
              state: metroData.state,
            },
          };

          setSavedLocations([fallbackSavedLocation]);
        } else if (activeLocation) {
          setSavedLocations([
            {
              id: `fallback-${user.id}-${activeLocation.metro_area_id}`,
              user_id: user.id,
              metro_area_id: activeLocation.metro_area_id,
              label: activeLocation.is_temporary ? 'Visiting' : 'Home',
              zip_code: user.zip_code ?? null,
              is_default: true,
              sort_order: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              metro_area: {
                id: activeLocation.metro_area_id,
                name: activeLocation.metro_name,
                state: activeLocation.metro_state,
              },
            },
          ]);
        } else {
          setSavedLocations([]);
        }
      } else {
        setSavedLocations([]);
      }

      if (!activeLocation) {
        const preferred =
          locations.find(
            (location) =>
              location.metro_area_id === user.metro_area_id && location.metro_area
          ) ??
          locations.find((location) => location.is_default && location.metro_area) ??
          locations.find((location) => location.metro_area);

        if (preferred?.metro_area) {
          const locationFromSaved: ActiveLocation = {
            metro_area_id: preferred.metro_area_id,
            metro_name: preferred.metro_area.name,
            metro_state: preferred.metro_area.state,
            source: 'saved',
            is_temporary: false,
          };
          setActiveLocation(locationFromSaved);
          await saveActiveLocation(locationFromSaved);
        } else if (user.metro_area_id) {
          const { data: metroData } = await supabase
            .from('metro_areas')
            .select('id, name, state')
            .eq('id', user.metro_area_id)
            .single();

          if (metroData) {
            const fallbackLocation: ActiveLocation = {
              metro_area_id: metroData.id,
              metro_name: metroData.name,
              metro_state: metroData.state,
              source: 'saved',
              is_temporary: false,
            };
            setActiveLocation(fallbackLocation);
            await saveActiveLocation(fallbackLocation);
          }
        }
      }
    } finally {
      isRefreshingLocationsRef.current = false;
    }
  }, [user, activeLocation]);

  const checkLocationChange = useCallback(async () => {
    if (!activeLocation) return;

    const permStatus = await getLocationPermissionStatus();
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

  // When user changes (login/logout), reload locations. The signed-out state
  // reset happens during render above.
  useEffect(() => {
    if (!user) {
      initializedUserIdRef.current = null;
      return;
    }

    refreshSavedLocations();
    const shouldInitForUser = initializedUserIdRef.current !== user.id;
    if (shouldInitForUser) {
      initializedUserIdRef.current = user.id;
    }

    // Initialize from user metro only once per signed-in user to avoid loops
    if (shouldInitForUser && !activeLocation && user.metro_area_id) {
      initActiveLocationFromUser();
    }
  }, [user, activeLocation, refreshSavedLocations, initActiveLocationFromUser]);

  // AppState listener: check location on foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && user && !manualOverrideRef.current) {
        checkLocationChange();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user, checkLocationChange]);

  const browseMetro = useCallback((metro: ActiveLocation) => {
    const tempLocation: ActiveLocation = {
      ...metro,
      is_temporary: true,
      source: 'gps',
    };
    setActiveLocation(tempLocation);
    saveActiveLocation(tempLocation);
    setShowChangePrompt(false);
  }, []);

  const updateMetroPermanent = useCallback(
    async (metroAreaId: string, metroName: string, metroState: string, zipCode?: string) => {
      if (!user) return;

      // Update user's metro in DB
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
      await saveActiveLocation(newLocation);
      setShowChangePrompt(false);
    },
    [user, refreshUser]
  );

  const snoozeMetro = useCallback(
    (metroAreaId: string) => {
      const entry = createSnoozeEntry(metroAreaId);
      const updated = [...snoozes.filter((s) => s.metro_area_id !== metroAreaId), entry];
      setSnoozes(updated);
      saveLocationSnoozes(updated);
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
    saveActiveLocation(loc);
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
