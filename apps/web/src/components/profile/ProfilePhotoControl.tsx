import React, { useId, useRef, useState } from 'react';
import { Button, FileButton, Loader, Text, VisuallyHidden } from '@mantine/core';
import { formatMegabytes, MAX_PROFILE_PHOTO_SOURCE_BYTES } from '@nepally/shared';
import Avatar from '../Avatar';
import { useFocusAfterUpdate } from '../../hooks/useFocusAfterUpdate';
import { DEFAULT_IMAGE_MIME_TYPES } from '../ui';
import styles from './ProfilePhotoControl.module.css';

const NOT_SUPPORTED_MESSAGE = 'That file is not a supported image. Use JPG, PNG or WEBP.';

export interface ProfilePhotoControlProps {
  name: string;
  photoUrl: string | null | undefined;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

/**
 * Avatar + add/change/remove controls for a member's own profile photo.
 * Success/failure toasts are the caller's job (Task 6.16); this control only
 * rejects a file that can't be a usable photo before it ever reaches `onPick`.
 */
export function ProfilePhotoControl({
  name,
  photoUrl,
  busy,
  onPick,
  onRemove,
}: ProfilePhotoControlProps) {
  const resetRef = useRef<() => void>(null);
  const errorId = useId();
  const [pickError, setPickError] = useState<string | null>(null);
  // Bumped on every rejection and used as the alert's `key`: two rejections
  // in a row can produce the exact same sentence, and a live region whose
  // text doesn't change is announced unreliably — remounting the node forces
  // a fresh announcement every time.
  const [errorGeneration, setErrorGeneration] = useState(0);

  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Removing the photo unmounts the Remove button on the next render, and
  // the browser drops focus to <body>. Armed only by a real Remove click, so
  // an unrelated update that clears photoUrl never steals focus; and checked
  // after the removal commits rather than at click time (a mouse click
  // doesn't focus a button in Safari), so focus the member has moved
  // elsewhere meanwhile is left alone. Keyed on whether there is a photo, not
  // its URL, so a photo replaced while the removal is pending doesn't spend it.
  const armFocus = useFocusAfterUpdate(Boolean(photoUrl));

  function rejectPick(message: string) {
    setPickError(message);
    setErrorGeneration((generation) => generation + 1);
  }

  function handlePick(file: File | null) {
    // Reset so the same file can be picked again right away — e.g. the member
    // fixes it outside the browser (re-exports it, converts it) and reselects
    // the same path a moment later.
    resetRef.current?.();
    if (!file) return;

    if (!DEFAULT_IMAGE_MIME_TYPES.includes(file.type) || file.size === 0) {
      rejectPick(NOT_SUPPORTED_MESSAGE);
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SOURCE_BYTES) {
      rejectPick(
        `That photo is too large. It must be ${formatMegabytes(MAX_PROFILE_PHOTO_SOURCE_BYTES)} or smaller.`
      );
      return;
    }

    setPickError(null);
    onPick(file);
  }

  function handleRemoveClick() {
    if (busy) return;
    armFocus(() => addButtonRef.current);
    setPickError(null);
    onRemove();
  }

  return (
    <div className={styles.root}>
      <div className={styles.avatarWrapper}>
        {/* The member's name renders right beside this control (profile header), so the avatar is decorative. */}
        <Avatar name={name} photoUrl={photoUrl} size="xlarge" radius="var(--profile-photo-radius)" decorative />
        {busy && (
          <div className={styles.scrim} aria-hidden="true">
            <Loader size="sm" className={styles.loader} />
          </div>
        )}
      </div>

      {/* Rendered at all times, text only set while busy: a live region that
          starts empty and later gains content is announced reliably, unlike
          one inserted into the DOM already holding its message. */}
      <VisuallyHidden role="status" aria-live="polite">
        {busy ? 'Updating photo…' : ''}
      </VisuallyHidden>

      <div className={styles.actions}>
        <FileButton
          onChange={handlePick}
          accept={DEFAULT_IMAGE_MIME_TYPES.join(',')}
          resetRef={resetRef}
          disabled={busy}
          inputProps={{
            // Kept for tests/e2e locators only: this input is display:none, so
            // assistive tech never reaches it. The visible Button below carries
            // the real accessible name and description.
            'aria-label': 'Upload profile photo',
          }}
        >
          {(props) => (
            <Button
              {...props}
              ref={addButtonRef}
              variant="light"
              size="compact-sm"
              aria-disabled={busy || undefined}
              data-disabled={busy || undefined}
              aria-describedby={pickError ? errorId : undefined}
            >
              {photoUrl ? 'Change Photo' : 'Add Photo'}
            </Button>
          )}
        </FileButton>
        {photoUrl && (
          <Button
            variant="light"
            color="red"
            size="compact-sm"
            aria-disabled={busy || undefined}
            data-disabled={busy || undefined}
            onClick={busy ? undefined : handleRemoveClick}
          >
            Remove
          </Button>
        )}
      </div>

      {pickError && (
        <Text key={errorGeneration} id={errorId} size="xs" role="alert" className={styles.error}>
          {pickError}
        </Text>
      )}
    </div>
  );
}
