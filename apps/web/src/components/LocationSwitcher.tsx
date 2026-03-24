import React from 'react';
import { useRouter } from 'next/router';
import { Badge, Menu, Text, UnstyledButton } from '@mantine/core';
import { useLocation } from '../hooks/useLocation';
import { getShortMetroName, hasMetroChanged, MAX_SAVED_LOCATIONS_PREMIUM } from '@nusa/shared';
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

  if (!activeLocation) return null;

  const showDetected =
    detectedLocation &&
    hasMetroChanged(activeLocation.metro_area_id, detectedLocation.metro_area_id);

  const handleSelectSaved = (loc: SavedLocation) => {
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
    <Menu
      shadow="md"
      width={300}
      position="bottom-start"
      offset={8}
      radius="lg"
    >
      <Menu.Target>
        <UnstyledButton
          className={styles.locationTrigger}
          aria-label={`Current location: ${activeLocation.metro_name}. Tap to switch locations`}
        >
          <span className={styles.locationIcon}>📍</span>
          <Text size="sm" fw={700} truncate maw={200}>
            {getShortMetroName(activeLocation.metro_name)}
          </Text>
          <Text size="xs" c="dimmed">▼</Text>
          {activeLocation.is_temporary && (
            <Badge variant="light" color="orange" size="xs">Visiting</Badge>
          )}
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Your Locations</Menu.Label>

        {savedLocations.map((loc) => {
          const isActive = activeLocation.metro_area_id === loc.metro_area_id;
          const metroDisplay = loc.metro_area
            ? `${loc.metro_area.name}, ${loc.metro_area.state}`
            : loc.metro_area_id;

          return (
            <Menu.Item
              key={loc.id}
              onClick={() => handleSelectSaved(loc)}
              leftSection={
                <Text size="sm" w={18} ta="center">
                  {loc.is_default ? '⭐' : ''}
                </Text>
              }
              rightSection={
                isActive ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mantine-color-nusaPrimary-6)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null
              }
            >
              <Text size="sm" fw={600}>{loc.label}</Text>
              <Text size="xs" c="dimmed">{metroDisplay}</Text>
            </Menu.Item>
          );
        })}

        {showDetected && (
          <>
            <Menu.Divider />
            <Menu.Label>Detected Location</Menu.Label>
            <Menu.Item
              onClick={handleSelectDetected}
              leftSection={<Text size="sm">📡</Text>}
              rightSection={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              }
            >
              <Text size="xs" c="dimmed">You&apos;re currently near</Text>
              <Text size="sm" fw={600} c="nusaPrimary.6">
                {getShortMetroName(detectedLocation!.metro_name)},{' '}
                {detectedLocation!.metro_state}
              </Text>
            </Menu.Item>
          </>
        )}

        <Menu.Divider />

        {savedLocations.length < MAX_SAVED_LOCATIONS_PREMIUM && (
          <Menu.Item
            onClick={() => router.push('/profile/locations?add=true')}
            leftSection={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mantine-color-nusaPrimary-6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
            c="nusaPrimary.6"
          >
            Add a Location
          </Menu.Item>
        )}

        <Menu.Item
          onClick={() => router.push('/profile/locations')}
          leftSection={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          }
          c="dimmed"
        >
          Manage Locations
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
