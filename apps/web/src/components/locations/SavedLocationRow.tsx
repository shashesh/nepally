import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ActionIcon, Button, TextInput, VisuallyHidden } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import type { SavedLocation } from '@nepally/shared';
import { notify } from '../ui';
import styles from './SavedLocationRow.module.css';

export interface SavedLocationRowProps {
  location: SavedLocation;
  /** Whether the Remove action should render at all (not the default, and not the last location). */
  canRemove: boolean;
  /** Lowercased labels of every *other* saved location, for the duplicate-rename check. */
  otherLabels: string[];
  onRename: (label: string) => Promise<{ error?: Error | null }>;
  onRemove: () => void;
  onSetDefault: () => void;
  /** Lets the page reach this row's Rename button to restore focus after a remove/set-default/add elsewhere. */
  renameButtonRef?: (el: HTMLButtonElement | null) => void;
}

/**
 * One row of Manage Locations: the label/metro display or its rename field,
 * and the Rename/Remove/Set-as-default actions. Owns the rename flow end to
 * end — the page only supplies the current save (`onRename`) and learns
 * nothing about it except its outcome.
 */
export function SavedLocationRow({
  location,
  canRemove,
  otherLabels,
  onRename,
  onRemove,
  onSetDefault,
  renameButtonRef,
}: SavedLocationRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingLabel, setEditingLabel] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // isEditingRef mirrors `isEditing` so an async continuation (after the
  // `onRename` await) can check the *current* value instead of the stale one
  // its closure captured at call time — the same problem ProfilePhotoControl's
  // removedRef and profile.page.tsx's refocusSavedPanel ref solve for their
  // own unmounts.
  const isEditingRef = useRef(false);
  const renameInFlightRef = useRef(false);
  const renameButtonElRef = useRef<HTMLButtonElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  function setRenameButtonRef(el: HTMLButtonElement | null) {
    renameButtonElRef.current = el;
    renameButtonRef?.(el);
  }

  function startRename() {
    isEditingRef.current = true;
    setIsEditing(true);
    setEditingLabel(location.label);
    setEditError(null);
  }

  /**
   * Closes the rename field (if still open), and returns focus to the
   * Rename button only when `refocus` is true. A blur that's actually the
   * member tabbing (or clicking) to some other control must be left alone —
   * see `commitRename`'s callers for how `refocus` is decided.
   */
  function closeRename(refocus: boolean) {
    isEditingRef.current = false;
    flushSync(() => {
      setIsEditing(false);
      setEditError(null);
    });
    if (refocus) renameButtonElRef.current?.focus();
  }

  async function commitRename(refocus: boolean) {
    // Already cancelled (Escape) or committed by an earlier call — a blur
    // that fires after Enter or Escape must not save twice or save after cancel.
    if (!isEditingRef.current) return;

    const trimmed = editingLabel.trim();
    if (!trimmed || trimmed === location.label) {
      closeRename(refocus);
      return;
    }

    const isDuplicate = otherLabels.includes(trimmed.toLowerCase());
    if (isDuplicate) {
      setEditError(`You already have a location named "${trimmed}".`);
      return;
    }

    if (renameInFlightRef.current) return;
    renameInFlightRef.current = true;
    const { error } = await onRename(trimmed);
    renameInFlightRef.current = false;

    if (!isEditingRef.current) return;

    if (error) {
      notify.error("Couldn't rename this location");
      return;
    }

    // Focus may have moved on during the await (e.g. the member tabbed or
    // clicked elsewhere while the save was in flight) — only reclaim it if
    // it's stranded: still on <body>, or still on the input that's about to
    // close. `refocus` as passed in by the caller is stale by now.
    const active = document.activeElement;
    const freshRefocus = !active || active === document.body || active === renameInputRef.current;
    closeRename(freshRefocus);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commitRename(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeRename(true);
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    // relatedTarget is the element gaining focus; null means focus has
    // nowhere defined to go (heading for <body>), which is the only time a
    // blur should reclaim it for the Rename button.
    void commitRename(event.relatedTarget === null);
  }

  const metroDisplay = location.metro_area
    ? `${location.metro_area.name}, ${location.metro_area.state}`
    : location.metro_area_id;

  return (
    <div className={styles.item}>
      <div className={styles.itemRow}>
        <div className={styles.starCol}>
          {location.is_default && (
            <span role="img" aria-label="Default location">
              ⭐
            </span>
          )}
        </div>
        <div className={styles.itemInfo}>
          {isEditing ? (
            <TextInput
              ref={renameInputRef}
              size="sm"
              aria-label={`Rename location ${location.label}`}
              value={editingLabel}
              onChange={(e) => {
                setEditingLabel(e.currentTarget.value);
                setEditError(null);
              }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              error={editError ?? undefined}
              maxLength={30}
              autoFocus
            />
          ) : (
            <div className={styles.itemLabel}>{location.label}</div>
          )}
          <div className={styles.itemMetro}>{metroDisplay}</div>
        </div>
        <div className={styles.actions}>
          {!isEditing && (
            <ActionIcon
              ref={setRenameButtonRef}
              variant="subtle"
              color="gray"
              aria-label={`Rename ${location.label}`}
              onClick={startRename}
            >
              <IconPencil size={16} aria-hidden="true" />
            </ActionIcon>
          )}
          {/* Without Remove, a spacer keeps its slot, so every row's pencil
              sits in the same column. */}
          {canRemove ? (
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={`Remove ${location.label}`}
              onClick={onRemove}
            >
              <IconTrash size={16} aria-hidden="true" />
            </ActionIcon>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
      </div>
      {!location.is_default && (
        <Button variant="subtle" size="compact-sm" className={styles.setDefault} onClick={onSetDefault}>
          Set as default
          <VisuallyHidden> for {location.label}</VisuallyHidden>
        </Button>
      )}
    </div>
  );
}
