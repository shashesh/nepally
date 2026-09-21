import React, { useId, useRef, useState } from 'react';
import { Button, FileButton, Loader, Text, VisuallyHidden } from '@mantine/core';
import { MAX_PROFILE_PHOTO_SOURCE_BYTES } from '@nepally/shared';
import Avatar from '../Avatar';
import { DEFAULT_IMAGE_MIME_TYPES } from '../ui';
import styles from './ProfilePhotoControl.module.css';

const MAX_PROFILE_PHOTO_SOURCE_MB = Math.round(MAX_PROFILE_PHOTO_SOURCE_BYTES / (1024 * 1024));

export interface ProfilePhotoControlProps {
  name: string;
  photoUrl: string | null | undefined;
  trustLevel: number;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

/**
 * Avatar + add/change/remove controls for a member's own profile photo.
 * Success/failure toasts are the caller's job (Task 6.16); this control only
 * rejects an oversized source file before it ever reaches `onPick`.
 */
export function ProfilePhotoControl({
  name,
  photoUrl,
  trustLevel,
  busy,
  onPick,
  onRemove,
}: ProfilePhotoControlProps) {
  const resetRef = useRef<() => void>(null);
  const errorId = useId();
  const [sizeError, setSizeError] = useState<string | null>(null);

  function handlePick(file: File | null) {
    // Let the same file be picked twice in a row (e.g. after fixing it outside
    // the browser) — today's behavior via `e.target.value = ''`.
    resetRef.current?.();
    if (!file) return;

    if (file.size > MAX_PROFILE_PHOTO_SOURCE_BYTES) {
      setSizeError(`That photo is too large. Choose one under ${MAX_PROFILE_PHOTO_SOURCE_MB}MB.`);
      return;
    }

    setSizeError(null);
    onPick(file);
  }

  return (
    <div className={styles.root}>
      <div className={styles.avatarWrapper}>
        {/* The member's name renders right beside this control (profile header), so the avatar is decorative. */}
        <Avatar name={name} photoUrl={photoUrl} trustLevel={trustLevel} size="xlarge" decorative />
        {busy && (
          <div className={styles.scrim} role="status">
            <Loader size="sm" color="var(--action-fg)" />
            <VisuallyHidden>Updating photo…</VisuallyHidden>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <FileButton
          onChange={handlePick}
          accept={DEFAULT_IMAGE_MIME_TYPES.join(',')}
          resetRef={resetRef}
          disabled={busy}
          inputProps={{
            'aria-label': 'Upload profile photo',
            'aria-describedby': sizeError ? errorId : undefined,
          }}
        >
          {(props) => (
            <Button {...props} variant="light" size="compact-sm" disabled={busy}>
              {photoUrl ? 'Change Photo' : 'Add Photo'}
            </Button>
          )}
        </FileButton>
        {photoUrl && (
          <Button variant="light" color="red" size="compact-sm" onClick={onRemove} disabled={busy}>
            Remove
          </Button>
        )}
      </div>

      {sizeError && (
        <Text id={errorId} size="xs" role="alert" className={styles.error}>
          {sizeError}
        </Text>
      )}
    </div>
  );
}
