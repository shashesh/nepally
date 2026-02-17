import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useLocation } from '../hooks/useLocation';
import { getShortMetroName, hasMetroChanged, MAX_SAVED_LOCATIONS } from '@nusa/shared';
import type { SavedLocation } from '@nusa/shared';
import styles from './LocationSwitcher.module.css';

export default function LocationSwitcher() {
  const router = useRouter();
  const {
    activeLocation,
    detectedLocation,
    savedLocations,
    setManualOverride,
    browseMetro,
  } = useLocation();
  const [open, setOpen] = useState(false);

  if (!activeLocation) return null;

  const showDetected =
    detectedLocation &&
    hasMetroChanged(activeLocation.metro_area_id, detectedLocation.metro_area_id);

  const handleSelectSaved = (loc: SavedLocation) => {
    setOpen(false);
    if (loc.metro_area) {
      setManualOverride({
        metro_area_id: loc.metro_area_id,
        metro_name: loc.metro_area.name,
        metro_state: loc.metro_area.state,
        source: 'saved',
        is_temporary: false,
      });
    }
  };

  const handleSelectDetected = () => {
    setOpen(false);
    if (detectedLocation) {
      browseMetro({
        metro_area_id: detectedLocation.metro_area_id,
        metro_name: detectedLocation.metro_name,
        metro_state: detectedLocation.metro_state,
        source: 'gps',
        is_temporary: true,
      });
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={styles.locationTrigger}
        onClick={() => setOpen(!open)}
        aria-label={`Current location: ${activeLocation.metro_name}. Tap to switch locations`}
      >
        <span className={styles.locationIcon}>📍</span>
        <span className={styles.locationName}>
          {getShortMetroName(activeLocation.metro_name)}
        </span>
        <span className={styles.chevron}>▼</span>
        {activeLocation.is_temporary && (
          <span className={styles.visitingBadge}>Visiting</span>
        )}
      </button>

      {open && (
        <>
          <div className={styles.dropdownOverlay} onClick={() => setOpen(false)} />
          <div className={styles.dropdown}>
            <div className={styles.sectionHeader}>Your Locations</div>

            {savedLocations.map((loc) => {
              const isActive =
                activeLocation.metro_area_id === loc.metro_area_id;
              const metroDisplay = loc.metro_area
                ? `${loc.metro_area.name}, ${loc.metro_area.state}`
                : loc.metro_area_id;

              return (
                <div
                  key={loc.id}
                  className={styles.locationItem}
                  onClick={() => handleSelectSaved(loc)}
                >
                  <div className={styles.locationItemLeft}>
                    {loc.is_default ? (
                      <span className={styles.starIcon}>⭐</span>
                    ) : (
                      <span className={styles.starPlaceholder} />
                    )}
                    <div>
                      <div className={styles.locationLabel}>{loc.label}</div>
                      <div className={styles.locationMetro}>{metroDisplay}</div>
                    </div>
                  </div>
                  {isActive && <span className={styles.checkmark}>✓</span>}
                </div>
              );
            })}

            {showDetected && (
              <>
                <div className={styles.divider} />
                <div className={styles.sectionHeader}>Detected Location</div>
                <div
                  className={styles.detectedItem}
                  onClick={handleSelectDetected}
                >
                  <div className={styles.detectedLeft}>
                    <span className={styles.detectedIcon}>📡</span>
                    <div>
                      <div className={styles.detectedSubtext}>
                        You&apos;re currently near
                      </div>
                      <div className={styles.detectedMetro}>
                        {getShortMetroName(detectedLocation!.metro_name)},{' '}
                        {detectedLocation!.metro_state}
                      </div>
                    </div>
                  </div>
                  <span>→</span>
                </div>
              </>
            )}

            <div className={styles.divider} />

            {savedLocations.length < MAX_SAVED_LOCATIONS && (
              <button
                className={styles.addButton}
                onClick={() => {
                  setOpen(false);
                  router.push('/profile/locations?add=true');
                }}
              >
                ＋ Add a Location
              </button>
            )}

            <button
              className={styles.manageLink}
              onClick={() => {
                setOpen(false);
                router.push('/profile/locations');
              }}
            >
              Manage Locations
            </button>
          </div>
        </>
      )}
    </div>
  );
}
