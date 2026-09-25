import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@mantine/core';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useFocusAfterUpdate } from '../../hooks/useFocusAfterUpdate';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';
import { userMessage } from '../../lib/userMessage';
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
  // Removing, defaulting or adding a location goes through the
  // LocationContext's own async refresh, so the focus target only exists once
  // savedLocations has re-rendered with it. Each action arms one restore; it
  // runs when the list (ids and default) or the add form's visibility next
  // changes, and only if focus was lost: to <body>, or still inside a closing
  // confirm modal (isFocusStranded; Mantine's useFocusReturn waits 10ms and
  // the modal stays mounted ~200ms, so a fast DELETE can unmount the row
  // first). `is_default` is in the key because set-default keeps every id
  // in place. Runs above the !user early return: hooks keep their order.
  const armFocus = useFocusAfterUpdate(
    `${savedLocations.map((location) => `${location.id}:${location.is_default}`).join()}|${showAdd}`
  );

  // Leaves for /login rather than redirecting during render (the pattern
  // profile.page.tsx uses): a router.replace call during render is a side
  // effect the React Compiler lint rules flag once purity checks reach it,
  // and it also makes this component's first render non-deterministic for
  // anything (tests, StrictMode double-invoke) that inspects render output
  // before effects run.
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) {
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
    // Disarmed first: a slow *earlier* refresh (refreshSavedLocations swallows
    // its own errors, so nothing else clears a stale arm) must not later pull
    // focus out of whatever the member is doing now — including a dialog
    // this very click is about to open.
    armFocus(() => null);
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
    armFocus(() => (neighbor ? renameButtonRefs.current[neighbor.id] : null));

    const { error } = await deleteSavedLocation(supabase, loc.id);
    if (error) {
      armFocus(() => null);
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
    armFocus(() => renameButtonRefs.current[loc.id]);
    const { error } = await setDefaultSavedLocation(supabase, userId, loc.id);
    if (error) {
      armFocus(() => null);
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

  function handleCancelAdd() {
    flushSync(() => {
      setShowAdd(false);
    });
    addButtonRef.current?.focus();
  }

  async function handleSaveNew(metro: MetroArea, label: string): Promise<{ error?: string | null }> {
    const { data, error } = await addSavedLocation(supabase, userId, metro.id, label);
    if (error) {
      return {
        error: userMessage(error, "Couldn't add this location. Please try again.", 'profile_location_add_failed', {
          platform: 'web',
          userId,
        }),
      };
    }
    // Awaited here (not left for AddLocationForm to close early): Save stays
    // busy for this whole call.
    await refreshSavedLocations();
    // Armed only now, so the restore waits for the form to close (Save holds
    // focus until then). Focus prefers "＋ Add a Location", as Cancel does, but
    // that button is gone once the add reaches the location cap, so fall back
    // to the new row's Rename button, or the first row's.
    const fallbackId = data?.id ?? savedLocations[0]?.id ?? null;
    armFocus(() => addButtonRef.current ?? (fallbackId ? renameButtonRefs.current[fallbackId] : null));
    setShowAdd(false);
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

        {showAdd && (
          <AddLocationForm usedLabels={usedLabels} userId={userId} onSave={handleSaveNew} onCancel={handleCancelAdd} />
        )}
      </div>
    </>
  );
}
