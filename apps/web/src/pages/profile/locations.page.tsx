import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@mantine/core';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';
import {
  updateSavedLocation,
  deleteSavedLocation,
  setDefaultSavedLocation,
  addSavedLocation,
  logClientEvent,
  MAX_SAVED_LOCATIONS_PREMIUM,
} from '@nepally/shared';
import type { SavedLocation, MetroArea } from '@nepally/shared';
import { PageHeader, useConfirm, notify } from '../../components/ui';
import { SavedLocationRow } from '../../components/locations/SavedLocationRow';
import { AddLocationForm } from '../../components/locations/AddLocationForm';
import styles from '../../styles/ManageLocations.module.css';

export default function ManageLocationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { savedLocations, refreshSavedLocations } = useLocation();
  const confirm = useConfirm();

  const [showAdd, setShowAdd] = useState(router.query.add === 'true');

  // Focus management: refs keyed by location id so focus can be restored
  // after something it was on unmounts (PR 6 decision 8 — busy controls stay
  // focusable, and nothing should ever drop focus to <body>).
  const renameButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Set by handleDelete/handleSetDefault right before an async call that
  // refreshes savedLocations from the LocationContext; the effect below only
  // acts once that refresh actually lands (a new savedLocations reference).
  const pendingFocusIdRef = useRef<string | null>(null);

  // Removing or defaulting a location goes through the LocationContext's own
  // async refresh, so the focus target only exists once savedLocations has
  // actually re-rendered with it — never steal focus if the member has
  // already moved on to something else in the meantime. Runs unconditionally,
  // above the !user early return, because hooks must run in the same order
  // on every render.
  useEffect(() => {
    const id = pendingFocusIdRef.current;
    if (!id) return;
    pendingFocusIdRef.current = null;
    const active = document.activeElement;
    if (!active || active === document.body) {
      renameButtonRefs.current[id]?.focus();
    }
  }, [savedLocations]);

  if (!user) {
    router.replace('/login');
    return null;
  }

  // A plain string, captured once: TypeScript's narrowing of `user` to
  // non-null above does not carry into the handlers below, since each is a
  // closure that could in principle run after a later render — reading
  // `userId` instead of `user.id` in them sidesteps that entirely.
  const userId = user.id;
  const usedLabels = savedLocations.map((l) => l.label.toLowerCase());

  async function handleRename(loc: SavedLocation, label: string): Promise<{ error?: Error | null }> {
    const { error } = await updateSavedLocation(supabase, loc.id, { label });
    if (error) {
      logClientEvent({
        event: 'profile_location_rename_failed',
        context: { platform: 'web', userId, locationId: loc.id },
        error,
      });
      return { error };
    }
    await refreshSavedLocations();
    return {};
  }

  async function handleDelete(loc: SavedLocation) {
    if (loc.is_default || savedLocations.length <= 1) return;
    const confirmed = await confirm({
      title: 'Remove this location?',
      message: `"${loc.label}" will no longer appear in your location switcher.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!confirmed) return;

    const index = savedLocations.findIndex((entry) => entry.id === loc.id);
    const neighbor = savedLocations[index + 1] ?? savedLocations[index - 1] ?? null;
    pendingFocusIdRef.current = neighbor?.id ?? null;

    const { error } = await deleteSavedLocation(supabase, loc.id);
    if (error) {
      pendingFocusIdRef.current = null;
      logClientEvent({
        event: 'profile_location_remove_failed',
        context: { platform: 'web', userId, locationId: loc.id },
        error,
      });
      notify.error("Couldn't remove this location");
      return;
    }
    await refreshSavedLocations();
  }

  async function handleSetDefault(loc: SavedLocation) {
    // That row's "Set as default" button (the one just clicked) disappears
    // once it becomes the default, so focus moves to its Rename button.
    pendingFocusIdRef.current = loc.id;
    const { error } = await setDefaultSavedLocation(supabase, userId, loc.id);
    if (error) {
      pendingFocusIdRef.current = null;
      logClientEvent({
        event: 'profile_location_set_default_failed',
        context: { platform: 'web', userId, locationId: loc.id },
        error,
      });
      notify.error("Couldn't set this as your default location");
      return;
    }
    await refreshSavedLocations();
  }

  function closeAdd() {
    flushSync(() => {
      setShowAdd(false);
    });
    addButtonRef.current?.focus();
  }

  async function handleSaveNew(metro: MetroArea, label: string): Promise<{ error?: Error | null }> {
    const { error } = await addSavedLocation(supabase, userId, metro.id, label);
    if (error) {
      return { error };
    }
    await refreshSavedLocations();
    closeAdd();
    return {};
  }

  return (
    <>
      <Head>
        <title>Manage Locations - Nepally</title>
      </Head>
      <div className={styles.container}>
        <PageHeader
          title="Manage Locations"
          description={`${savedLocations.length} of ${MAX_SAVED_LOCATIONS_PREMIUM}`}
          backHref="/profile"
          backLabel="Profile"
        />

        <div className={styles.list}>
          {savedLocations.map((loc) => (
            <SavedLocationRow
              key={loc.id}
              location={loc}
              canRemove={!loc.is_default && savedLocations.length > 1}
              otherLabels={savedLocations
                .filter((other) => other.id !== loc.id)
                .map((other) => other.label.toLowerCase())}
              onRename={(label) => handleRename(loc, label)}
              onRemove={() => void handleDelete(loc)}
              onSetDefault={() => void handleSetDefault(loc)}
              renameButtonRef={(el) => {
                renameButtonRefs.current[loc.id] = el;
              }}
            />
          ))}
        </div>

        {!showAdd && savedLocations.length < MAX_SAVED_LOCATIONS_PREMIUM && (
          <Button ref={addButtonRef} fullWidth variant="light" onClick={() => setShowAdd(true)}>
            ＋ Add a Location
          </Button>
        )}

        {showAdd && <AddLocationForm usedLabels={usedLabels} onSave={handleSaveNew} onClose={closeAdd} />}
      </div>
    </>
  );
}
