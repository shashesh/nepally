import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ActionIcon, Button, Loader, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconMapPin, IconPencil, IconTrash } from '@tabler/icons-react';
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
  searchMetroAreas,
  getMetroByZip,
  isValidZipCode,
  logClientEvent,
  MAX_SAVED_LOCATIONS_PREMIUM,
  SUGGESTED_LOCATION_LABELS,
} from '@nepally/shared';
import type { SavedLocation, MetroArea } from '@nepally/shared';
import { PageHeader, ToggleChipGroup, useConfirm, notify } from '../../components/ui';
import styles from '../../styles/ManageLocations.module.css';

const SEARCH_FAILED_MESSAGE = 'Something went wrong searching. Try again.';
const MIN_SEARCH_LENGTH = 2;

export default function ManageLocationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { savedLocations, refreshSavedLocations } = useLocation();
  const confirm = useConfirm();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(router.query.add === 'true');

  // Add location state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MetroArea[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedMetro, setSelectedMetro] = useState<MetroArea | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);

  // Focus management: refs keyed by location id so focus can be restored
  // after something it was on unmounts (PR 6 decision 8 — busy controls stay
  // focusable, and nothing should ever drop focus to <body>). editingIdRef
  // mirrors editingId state so an async continuation (after an await) can
  // check the *current* value instead of the stale one its closure captured
  // at call time — the same problem ProfilePhotoControl's removedRef and
  // profile.page.tsx's refocusSavedPanel ref solve for their own unmounts.
  const renameButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const editingIdRef = useRef<string | null>(null);
  const renameInFlightRef = useRef<string | null>(null);
  const searchRequestIdRef = useRef(0);
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

  function startRename(loc: SavedLocation) {
    editingIdRef.current = loc.id;
    setEditingId(loc.id);
    setEditingLabel(loc.label);
    setEditError(null);
  }

  /** Closes the rename field (if still open) and returns focus to its row's Rename button. */
  function cancelRename(locationId: string) {
    editingIdRef.current = null;
    flushSync(() => {
      setEditingId(null);
      setEditError(null);
    });
    renameButtonRefs.current[locationId]?.focus();
  }

  async function commitRename(loc: SavedLocation) {
    // Already cancelled (Escape) or committed by an earlier call — a blur
    // that fires after Enter or Escape must not save twice or save after cancel.
    if (editingIdRef.current !== loc.id) return;

    const trimmed = editingLabel.trim();
    if (!trimmed || trimmed === loc.label) {
      cancelRename(loc.id);
      return;
    }

    const isDuplicate = savedLocations.some(
      (other) => other.id !== loc.id && other.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setEditError(`You already have a location named "${trimmed}".`);
      return;
    }

    if (renameInFlightRef.current === loc.id) return;
    renameInFlightRef.current = loc.id;
    const { error } = await updateSavedLocation(supabase, loc.id, { label: trimmed });
    renameInFlightRef.current = null;

    if (editingIdRef.current !== loc.id) return;

    if (error) {
      logClientEvent({
        event: 'profile_location_rename_failed',
        context: { platform: 'web', userId, locationId: loc.id },
        error,
      });
      notify.error("Couldn't rename this location");
      return;
    }

    cancelRename(loc.id);
    await refreshSavedLocations();
  }

  function handleRenameKeyDown(event: React.KeyboardEvent<HTMLInputElement>, loc: SavedLocation) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commitRename(loc);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename(loc.id);
    }
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
      setSelectedMetro(null);
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
      setSearching(false);
      setNewLabel('');
      setAddError('');
    });
    addButtonRef.current?.focus();
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    setAddError('');
    setSearchError(null);

    if (query.length < MIN_SEARCH_LENGTH) {
      searchRequestIdRef.current += 1; // invalidate any in-flight request
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const requestId = (searchRequestIdRef.current += 1);
    setSearching(true);

    // A response for anything but the latest query is stale and ignored —
    // an older request can resolve after a newer one, and must not overwrite it.
    void (async () => {
      try {
        const result = isValidZipCode(query)
          ? await getMetroByZip(supabase, query)
          : await searchMetroAreas(supabase, query);
        if (searchRequestIdRef.current !== requestId) return;

        if (result.error) {
          setSearchResults([]);
          setSearchError(SEARCH_FAILED_MESSAGE);
        } else {
          setSearchResults(result.data ? (Array.isArray(result.data) ? result.data : [result.data]) : []);
        }
      } catch (error: unknown) {
        if (searchRequestIdRef.current !== requestId) return;
        logClientEvent({
          event: 'profile_location_search_failed',
          context: { platform: 'web', userId },
          error,
        });
        setSearchResults([]);
        setSearchError(SEARCH_FAILED_MESSAGE);
      } finally {
        if (searchRequestIdRef.current === requestId) setSearching(false);
      }
    })();
  }

  function handleSelectMetro(metro: MetroArea) {
    setSelectedMetro(metro);
    const next = SUGGESTED_LOCATION_LABELS.find((l) => !usedLabels.includes(l.toLowerCase()));
    setNewLabel(next ?? '');
    setAddError('');
  }

  async function handleSaveNew() {
    if (!selectedMetro) return;
    const trimmed = newLabel.trim();
    if (!trimmed) {
      setAddError('Please enter a name.');
      return;
    }
    if (usedLabels.includes(trimmed.toLowerCase())) {
      setAddError(`You already have a location named "${trimmed}".`);
      return;
    }

    setSaving(true);
    const { error } = await addSavedLocation(supabase, userId, selectedMetro.id, trimmed);
    setSaving(false);

    if (error) {
      setAddError(error.message);
      return;
    }

    await refreshSavedLocations();
    closeAdd();
  }

  const suggestionLabels = SUGGESTED_LOCATION_LABELS.filter((l) => !usedLabels.includes(l.toLowerCase()));
  const showNoResults =
    !searching && !searchError && searchQuery.length >= MIN_SEARCH_LENGTH && searchResults.length === 0;
  const saveDisabled = saving || !newLabel.trim();

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

        {/* Location list */}
        <div className={styles.list}>
          {savedLocations.map((loc) => {
            const metroDisplay = loc.metro_area
              ? `${loc.metro_area.name}, ${loc.metro_area.state}`
              : loc.metro_area_id;
            const isEditing = editingId === loc.id;

            return (
              <div key={loc.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <div className={styles.starCol}>
                    {loc.is_default && (
                      <span role="img" aria-label="Default location">
                        ⭐
                      </span>
                    )}
                  </div>
                  <div className={styles.itemInfo}>
                    {isEditing ? (
                      <TextInput
                        size="sm"
                        aria-label={`Rename location ${loc.label}`}
                        value={editingLabel}
                        onChange={(e) => {
                          setEditingLabel(e.currentTarget.value);
                          setEditError(null);
                        }}
                        onBlur={() => void commitRename(loc)}
                        onKeyDown={(e) => handleRenameKeyDown(e, loc)}
                        error={editError ?? undefined}
                        maxLength={30}
                        autoFocus
                      />
                    ) : (
                      <div className={styles.itemLabel}>{loc.label}</div>
                    )}
                    <div className={styles.itemMetro}>{metroDisplay}</div>
                  </div>
                  <div className={styles.actions}>
                    {!isEditing && (
                      <ActionIcon
                        ref={(el) => {
                          renameButtonRefs.current[loc.id] = el;
                        }}
                        variant="subtle"
                        color="gray"
                        aria-label={`Rename ${loc.label}`}
                        onClick={() => startRename(loc)}
                      >
                        <IconPencil size={16} aria-hidden="true" />
                      </ActionIcon>
                    )}
                    {!loc.is_default && savedLocations.length > 1 && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={`Remove ${loc.label}`}
                        onClick={() => void handleDelete(loc)}
                      >
                        <IconTrash size={16} aria-hidden="true" />
                      </ActionIcon>
                    )}
                  </div>
                </div>
                {!loc.is_default && (
                  <Button variant="subtle" size="compact-sm" onClick={() => void handleSetDefault(loc)}>
                    Set as default
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add location */}
        {!showAdd && savedLocations.length < MAX_SAVED_LOCATIONS_PREMIUM && (
          <Button ref={addButtonRef} fullWidth variant="light" onClick={() => setShowAdd(true)}>
            ＋ Add a Location
          </Button>
        )}

        {showAdd && (
          <div className={styles.addSection}>
            <h2 className={styles.addSectionTitle}>Add a Location</h2>

            {!selectedMetro ? (
              <>
                <TextInput
                  aria-label="Search by metro name or ZIP code"
                  placeholder="Search by metro name or ZIP code"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.currentTarget.value)}
                  autoFocus
                />
                {searchError && (
                  <Text role="alert" size="sm" c="red" mt="xs">
                    {searchError}
                  </Text>
                )}
                {showNoResults && (
                  <Text role="status" size="sm" c="dimmed" mt="xs">
                    No metros match.
                  </Text>
                )}
                {searchResults.map((m) => (
                  <UnstyledButton
                    key={m.id}
                    className={styles.searchResult}
                    onClick={() => handleSelectMetro(m)}
                  >
                    {m.name}, {m.state}
                  </UnstyledButton>
                ))}
              </>
            ) : (
              <>
                <div className={styles.selectedMetro}>
                  <IconMapPin size={16} aria-hidden="true" />
                  {selectedMetro.name}, {selectedMetro.state}
                </div>
                <TextInput
                  label="Name this location"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.currentTarget.value);
                    setAddError('');
                  }}
                  maxLength={30}
                  error={addError || undefined}
                  autoFocus
                />
                <ToggleChipGroup
                  label="Suggestions"
                  mode="single"
                  options={suggestionLabels.map((label) => ({ value: label, label }))}
                  value={suggestionLabels.some((label) => label === newLabel) ? [newLabel] : []}
                  onChange={(values) => {
                    setNewLabel(values[0] ?? '');
                    setAddError('');
                  }}
                />
                <div className={styles.actionsRow}>
                  <Button variant="default" onClick={closeAdd}>
                    Cancel
                  </Button>
                  <Button
                    onClick={saveDisabled ? undefined : () => void handleSaveNew()}
                    disabled={!newLabel.trim()}
                    aria-disabled={saveDisabled || undefined}
                    data-disabled={saveDisabled || undefined}
                    leftSection={saving ? <Loader size="xs" aria-hidden /> : undefined}
                  >
                    Save Location
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
