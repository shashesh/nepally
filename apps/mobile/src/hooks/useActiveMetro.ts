import { useAuth } from './useAuth';
import { useLocation } from './useLocation';

export interface ActiveMetro {
  /** The metro the feeds show: the active location's, else the member's home metro. */
  metroAreaId: string | null;
  /** "City, ST" for display, "Your Metro Area" when unnamed, null without a metro. */
  metroName: string | null;
  /** "Visiting" for a temporary location, else the saved location's label or "Home". */
  locationLabel: string;
}

/** The metro the member is looking at, shared by Home and the marketplace. */
export function useActiveMetro(): ActiveMetro {
  const { user } = useAuth();
  const { activeLocation, savedLocations } = useLocation();

  const metroAreaId = activeLocation?.metro_area_id ?? user?.metro_area_id ?? null;
  const matchedSavedLocation = savedLocations.find(
    (location) => location.metro_area_id === metroAreaId && location.metro_area
  );
  const metroName = activeLocation
    ? `${activeLocation.metro_name}, ${activeLocation.metro_state}`
    : matchedSavedLocation?.metro_area
      ? `${matchedSavedLocation.metro_area.name}, ${matchedSavedLocation.metro_area.state}`
      : metroAreaId
        ? 'Your Metro Area'
        : null;
  const locationLabel = activeLocation?.is_temporary
    ? 'Visiting'
    : matchedSavedLocation?.label || 'Home';

  return { metroAreaId, metroName, locationLabel };
}
