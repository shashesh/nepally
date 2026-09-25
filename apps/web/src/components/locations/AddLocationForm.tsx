import React, { useState } from 'react';
import { Button, Loader, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { SUGGESTED_LOCATION_LABELS } from '@nepally/shared';
import type { MetroArea } from '@nepally/shared';
import { useMetroSearch, SEARCH_FAILED_MESSAGE } from '../../hooks/useMetroSearch';
import { ToggleChipGroup } from '../ui';
import styles from './AddLocationForm.module.css';

export interface AddLocationFormProps {
  /** Lowercased labels of every existing saved location, for suggestions and the duplicate check. */
  usedLabels: string[];
  /** The signed-in member's id, for logging a genuine search failure. */
  userId: string;
  /**
   * On success, the page closes this form itself once its own refresh
   * settles (see locations.page.tsx's handleSaveNew and the add-focus
   * effect) — this component only asks to close on a plain Cancel.
   */
  /** Resolves with copy for the member on failure; the page logs the raw error. */
  onSave: (metro: MetroArea, label: string) => Promise<{ error?: string | null }>;
  /** Cancel only. A successful save closes via the page re-rendering without this location's form. */
  onCancel: () => void;
}

/** The "Add a Location" card: metro/ZIP search, then naming the new location. */
export function AddLocationForm({ usedLabels, userId, onSave, onCancel }: AddLocationFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMetro, setSelectedMetro] = useState<MetroArea | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);

  const { results: searchResults, statusMessage } = useMetroSearch(searchQuery, userId);

  function handleSelectMetro(metro: MetroArea) {
    setSelectedMetro(metro);
    const next = SUGGESTED_LOCATION_LABELS.find((l) => !usedLabels.includes(l.toLowerCase()));
    setNewLabel(next ?? '');
    setAddError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Not natively disabled while saving (decision 8 — the button must stay
    // focusable), so guard re-entrancy here instead.
    if (saving || !selectedMetro) return;
    const trimmed = newLabel.trim();
    // Save stays natively `disabled` while trimmed is empty (a disabled
    // button can never hold focus, so that's safe per decision 8), and a
    // disabled submit button cannot be the form's default action either —
    // this is a defensive fallback, not a reachable branch.
    if (!trimmed) return;
    if (usedLabels.includes(trimmed.toLowerCase())) {
      setAddError(`You already have a location named "${trimmed}".`);
      return;
    }

    setSaving(true);
    const { error } = await onSave(selectedMetro, trimmed);
    setSaving(false);

    if (error) {
      setAddError(error);
      return;
    }

    // No onCancel() here: the page's onSave already awaited its own refresh
    // and will unmount this form on its next render (see the prop doc above).
  }

  const suggestionLabels = SUGGESTED_LOCATION_LABELS.filter((l) => !usedLabels.includes(l.toLowerCase()));
  const saveDisabled = saving || !newLabel.trim();
  const isFailure = statusMessage === SEARCH_FAILED_MESSAGE;

  return (
    <div className={styles.addSection}>
      <h2 className={styles.addSectionTitle}>Add a Location</h2>

      {!selectedMetro ? (
        <>
          <TextInput
            aria-label="Search by metro name or ZIP code"
            placeholder="Search by metro name or ZIP code"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            autoFocus
          />
          {/* Always mounted — a live region that starts empty and later gains
              content is announced reliably, unlike one inserted into the DOM
              already holding its message (ProfilePhotoControl uses the same
              pattern). Polite (not assertive) and shared by both "no
              results" and a search failure, so neither remounts this region
              on every keystroke — only a completed search replaces its text,
              and the previous message stays up while the next one loads. */}
          <Text role="status" aria-live="polite" size="sm" c={isFailure ? 'red' : 'dimmed'} mt="xs">
            {statusMessage}
          </Text>
          {searchResults.map((m) => (
            <UnstyledButton key={m.id} className={styles.searchResult} onClick={() => handleSelectMetro(m)}>
              {m.name}, {m.state}
            </UnstyledButton>
          ))}
          {/* The page hides "Add a Location" while this form is open, so the
              search step needs its own way back out. */}
          <div className={styles.actionsRow}>
            <Button type="button" variant="default" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className={styles.selectedMetro}>
            <IconMapPin size={16} aria-hidden="true" />
            {selectedMetro.name}, {selectedMetro.state}
          </div>
          <Stack gap="sm">
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
          </Stack>
          <div className={styles.actionsRow}>
            {/* Inert while saving (decision 8, like Save): closing mid-save
                would leave the save to finish, and re-arm the page's
                add-focus effect, behind a form that has already gone. */}
            <Button
              type="button"
              variant="default"
              aria-disabled={saving || undefined}
              data-disabled={saving || undefined}
              onClick={saving ? undefined : onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newLabel.trim()}
              aria-disabled={saveDisabled || undefined}
              data-disabled={saveDisabled || undefined}
              leftSection={saving ? <Loader size="xs" aria-hidden /> : undefined}
            >
              Save Location
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
