import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Badge, Button, Divider, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { useClickOutside } from '@mantine/hooks';
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
  const [open, setOpen] = useState(false);
  const containerRef = useClickOutside(() => setOpen(false));

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
    <div ref={containerRef} className={styles.container}>
      <UnstyledButton
        className={styles.locationTrigger}
        onClick={() => setOpen(!open)}
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

      {open && (
        <div className={styles.dropdown}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" pt="sm" pb="xs" lts="0.8px">
            Your Locations
          </Text>

          {savedLocations.map((loc) => {
            const isActive = activeLocation.metro_area_id === loc.metro_area_id;
            const metroDisplay = loc.metro_area
              ? `${loc.metro_area.name}, ${loc.metro_area.state}`
              : loc.metro_area_id;

            return (
              <UnstyledButton
                key={loc.id}
                className={styles.locationItem}
                onClick={() => handleSelectSaved(loc)}
                w="100%"
              >
                <Group gap="xs" flex={1}>
                  <Text size="sm" w={18} ta="center">
                    {loc.is_default ? '⭐' : ''}
                  </Text>
                  <div>
                    <Text size="sm" fw={600}>{loc.label}</Text>
                    <Text size="xs" c="dimmed">{metroDisplay}</Text>
                  </div>
                </Group>
                {isActive && <Text c="nusaPrimary.6" size="lg">✓</Text>}
              </UnstyledButton>
            );
          })}

          {showDetected && (
            <>
              <Divider />
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" pt="sm" pb="xs" lts="0.8px">
                Detected Location
              </Text>
              <UnstyledButton
                className={styles.detectedItem}
                onClick={handleSelectDetected}
                w="100%"
              >
                <Group gap="xs" flex={1}>
                  <Text size="sm">📡</Text>
                  <div>
                    <Text size="xs" c="dimmed">You&apos;re currently near</Text>
                    <Text size="sm" fw={600} c="nusaPrimary.6">
                      {getShortMetroName(detectedLocation!.metro_name)},{' '}
                      {detectedLocation!.metro_state}
                    </Text>
                  </div>
                </Group>
                <Text>→</Text>
              </UnstyledButton>
            </>
          )}

          <Divider />

          <Stack gap={0} px="sm" py="xs">
            {savedLocations.length < MAX_SAVED_LOCATIONS_PREMIUM && (
              <Button
                variant="subtle"
                color="nusaPrimary.6"
                size="sm"
                justify="flex-start"
                fullWidth
                onClick={() => {
                  setOpen(false);
                  router.push('/profile/locations?add=true');
                }}
              >
                ＋ Add a Location
              </Button>
            )}
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              fullWidth
              onClick={() => {
                setOpen(false);
                router.push('/profile/locations');
              }}
            >
              Manage Locations
            </Button>
          </Stack>
        </div>
      )}
    </div>
  );
}
