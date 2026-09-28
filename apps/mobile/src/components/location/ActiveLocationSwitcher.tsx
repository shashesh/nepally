import React from 'react';
import { useLocation } from '../../hooks/useLocation';
import { LocationSwitcherSheet } from './LocationSwitcherSheet';

interface ActiveLocationSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The location switcher wired to the member's locations: a saved location
 * becomes the active one, and the detected metro is browsed as a visit.
 * Shared by Home and the marketplace.
 */
export function ActiveLocationSwitcher({ visible, onClose }: ActiveLocationSwitcherProps) {
  const { activeLocation, detectedLocation, savedLocations, setManualOverride, browseMetro } =
    useLocation();

  return (
    <LocationSwitcherSheet
      visible={visible}
      onClose={onClose}
      savedLocations={savedLocations}
      activeLocation={activeLocation}
      detectedLocation={detectedLocation}
      onSelectSaved={(loc) => {
        onClose();
        if (loc.metro_area) {
          setManualOverride({
            metro_area_id: loc.metro_area_id,
            metro_name: loc.metro_area.name,
            metro_state: loc.metro_area.state,
            source: 'saved',
            is_temporary: false,
          });
        }
      }}
      onSelectDetected={() => {
        onClose();
        if (detectedLocation) {
          browseMetro({
            metro_area_id: detectedLocation.metro_area_id,
            metro_name: detectedLocation.metro_name,
            metro_state: detectedLocation.metro_state,
            source: 'gps',
            is_temporary: true,
          });
        }
      }}
    />
  );
}
