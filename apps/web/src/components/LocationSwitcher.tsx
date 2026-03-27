import React from 'react';
import { useRouter } from 'next/router';
import { Badge, Menu, Text, UnstyledButton } from '@mantine/core';
import {
  IconMapPinFilled,
  IconChevronDown,
  IconCheck,
  IconChevronRight,
  IconPlus,
  IconSettings,
} from '@tabler/icons-react';
import { useLocation } from '../hooks/useLocation';
import { getShortMetroName, hasMetroChanged, MAX_SAVED_LOCATIONS_PREMIUM } from '@nepally/shared';
import type { SavedLocation } from '@nepally/shared';
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
          <IconMapPinFilled size={16} className={styles.locationPinIcon} />
          <Text size="sm" fw={600} truncate maw={200}>
            {getShortMetroName(activeLocation.metro_name)}
          </Text>
          <IconChevronDown size={14} stroke={2.5} className={styles.locationChevron} />
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
                  <IconCheck size={16} stroke={3} color="var(--mantine-color-nusaPrimary-6)" />
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
              rightSection={<IconChevronRight size={16} />}
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
            leftSection={<IconPlus size={16} color="var(--mantine-color-nusaPrimary-6)" />}
            c="nusaPrimary.6"
          >
            Add a Location
          </Menu.Item>
        )}

        <Menu.Item
          onClick={() => router.push('/profile/locations')}
          leftSection={<IconSettings size={16} />}
          c="dimmed"
        >
          Manage Locations
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
