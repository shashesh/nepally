import React, { useRef, useState } from 'react';
import { Button, Loader, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import {
  searchMetroAreas,
  getMetroByZip,
  isValidZipCode,
  SUGGESTED_LOCATION_LABELS,
} from '@nepally/shared';
import type { MetroArea } from '@nepally/shared';
import { supabase } from '../../lib/supabase';
import { ToggleChipGroup } from '../ui';
import styles from './AddLocationForm.module.css';

const SEARCH_FAILED_MESSAGE = 'Something went wrong searching. Try again.';
const MIN_SEARCH_LENGTH = 2;

export interface AddLocationFormProps {
  /** Lowercased labels of every existing saved location, for suggestions and the duplicate check. */
  usedLabels: string[];
  onSave: (metro: MetroArea, label: string) => Promise<{ error?: Error | null }>;
  onClose: () => void;
}

/** The "Add a Location" card: metro/ZIP search, then naming the new location. */
export function AddLocationForm({ usedLabels, onSave, onClose }: AddLocationFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MetroArea[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedMetro, setSelectedMetro] = useState<MetroArea | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);

  const searchRequestIdRef = useRef(0);

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
      } catch {
        if (searchRequestIdRef.current !== requestId) return;
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
    const { error } = await onSave(selectedMetro, trimmed);
    setSaving(false);

    if (error) {
      setAddError(error.message);
      return;
    }

    onClose();
  }

  const suggestionLabels = SUGGESTED_LOCATION_LABELS.filter((l) => !usedLabels.includes(l.toLowerCase()));
  const showNoResults =
    !searching && !searchError && searchQuery.length >= MIN_SEARCH_LENGTH && searchResults.length === 0;
  const saveDisabled = saving || !newLabel.trim();

  return (
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
            <UnstyledButton key={m.id} className={styles.searchResult} onClick={() => handleSelectMetro(m)}>
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
            <Button variant="default" onClick={onClose}>
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
  );
}
