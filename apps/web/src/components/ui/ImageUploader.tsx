import React, { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { ActionIcon, Text } from '@mantine/core';
import { Dropzone, type FileRejection } from '@mantine/dropzone';
import { IconPhotoPlus, IconX } from '@tabler/icons-react';
import styles from './ImageUploader.module.css';

/** What every caller accepts unless it narrows the list further. */
export const DEFAULT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** One slot in the uploader: a photo already in storage, or a file just picked. */
export type UploaderPhoto =
  | { kind: 'stored'; url: string }
  | { kind: 'picked'; id: string; previewUrl: string; file: File };

export interface ImageUploaderProps {
  photos: UploaderPhoto[];
  onChange: (photos: UploaderPhoto[]) => void;
  /** Total slots across stored and picked photos. */
  max: number;
  maxBytes: number;
  /** Names the group, and the add control as "Add <label>". */
  label: string;
  description?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  /** MIME types; defaults to JPEG, PNG and WEBP. */
  accept?: string[];
}

export function photoSrc(photo: UploaderPhoto): string {
  return photo.kind === 'stored' ? photo.url : photo.previewUrl;
}

function photoKey(photo: UploaderPhoto): string {
  return photo.kind === 'stored' ? `stored-${photo.url}` : `picked-${photo.id}`;
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function newPickedId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Turns the rejections react-dropzone reports into one sentence per reason,
 * rather than one per file — a member who picks six oversized photos wants to
 * be told the limit once.
 */
function describeRejections(rejections: FileRejection[], maxBytes: number): string {
  const has = (rejection: FileRejection, code: string) =>
    rejection.errors.some((error) => error.code === code);

  const tooLarge = rejections.filter((rejection) => has(rejection, 'file-too-large')).length;
  const wrongType = rejections.filter((rejection) => has(rejection, 'file-invalid-type')).length;

  const sentences: string[] = [];
  if (tooLarge > 0) {
    sentences.push(
      `${tooLarge} ${tooLarge === 1 ? 'file is' : 'files are'} too large. Each photo must be ${formatMegabytes(maxBytes)} or smaller.`
    );
  }
  if (wrongType > 0) {
    sentences.push(
      `${wrongType} ${wrongType === 1 ? 'file is' : 'files are'} not a supported image. Use JPG, PNG or WEBP.`
    );
  }
  return sentences.join(' ');
}

/**
 * Pick or drop photos, see them, remove them. The component owns every object
 * URL it creates and revokes it on removal and on unmount, so callers hold
 * nothing but the array.
 */
export function ImageUploader({
  photos,
  onChange,
  max,
  maxBytes,
  label,
  description,
  error,
  disabled,
  accept = DEFAULT_IMAGE_MIME_TYPES,
}: ImageUploaderProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const descriptionId = `${baseId}-description`;
  const messageId = `${baseId}-message`;
  const errorId = `${baseId}-error`;

  const [message, setMessage] = useState<string | null>(null);

  // Every preview URL this component minted, so unmount can revoke the ones
  // still in play. Removal revokes eagerly and drops the entry.
  const createdUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const created = createdUrlsRef.current;
    return () => {
      created.forEach((url) => URL.revokeObjectURL(url));
      created.clear();
    };
  }, []);

  const isFull = photos.length >= max;
  const remaining = Math.max(0, max - photos.length);

  function handleDrop(files: File[]) {
    const accepted = files.slice(0, remaining);
    const overflow = files.length - accepted.length;

    if (accepted.length === 0) {
      setMessage(`You can add up to ${max} ${max === 1 ? 'photo' : 'photos'}.`);
      return;
    }

    const picked: UploaderPhoto[] = accepted.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      createdUrlsRef.current.add(previewUrl);
      return { kind: 'picked', id: newPickedId(), previewUrl, file };
    });

    setMessage(overflow > 0 ? `You can add up to ${max} ${max === 1 ? 'photo' : 'photos'}.` : null);
    onChange([...photos, ...picked]);
  }

  function handleReject(rejections: FileRejection[]) {
    setMessage(describeRejections(rejections, maxBytes));
  }

  function handleRemove(index: number) {
    const removed = photos[index];
    if (removed?.kind === 'picked') {
      URL.revokeObjectURL(removed.previewUrl);
      createdUrlsRef.current.delete(removed.previewUrl);
    }
    setMessage(null);
    onChange(photos.filter((_, position) => position !== index));
  }

  const describedBy =
    [description ? descriptionId : null, message ? messageId : null, error ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={styles.root} role="group" aria-labelledby={labelId} aria-describedby={describedBy}>
      <Text id={labelId} component="span" className={styles.label}>
        {label}
      </Text>

      <Dropzone
        onDrop={handleDrop}
        onReject={handleReject}
        accept={accept}
        maxSize={maxBytes}
        disabled={disabled || isFull}
        // react-dropzone only drops its handlers when disabled; it leaves the
        // input focusable and activatable. Mark it disabled for real.
        inputProps={{ 'aria-label': `Add ${label.toLowerCase()}`, disabled: disabled || isFull }}
        className={styles.dropzone}
      >
        <div className={styles.dropzoneInner}>
          <IconPhotoPlus size={20} aria-hidden="true" />
          <Text size="sm">
            {isFull ? 'All slots used' : 'Drag photos here, or click to choose'}
          </Text>
        </div>
      </Dropzone>

      {description && (
        <Text id={descriptionId} size="xs" c="dimmed">
          {description}
        </Text>
      )}

      <Text size="xs" c="dimmed">
        {photos.length}/{max} photos
      </Text>

      {message && (
        <Text id={messageId} size="xs" className={styles.message} role="status">
          {message}
        </Text>
      )}

      {error && (
        <Text id={errorId} size="xs" className={styles.message}>
          {error}
        </Text>
      )}

      {photos.length > 0 && (
        <ul className={styles.thumbs}>
          {photos.map((photo, index) => (
            <li key={photoKey(photo)} className={styles.thumb}>
              <Image
                src={photoSrc(photo)}
                alt={`Photo ${index + 1}`}
                fill
                sizes="96px"
                unoptimized
                className={styles.thumbImage}
              />
              <ActionIcon
                className={styles.remove}
                size="sm"
                radius="xl"
                variant="filled"
                color="dark"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => handleRemove(index)}
              >
                <IconX size={14} aria-hidden="true" />
              </ActionIcon>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
