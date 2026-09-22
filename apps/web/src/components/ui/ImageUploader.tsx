import React, { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { ActionIcon, Text, VisuallyHidden } from '@mantine/core';
import { Dropzone, type FileRejection } from '@mantine/dropzone';
import { IconArrowLeft, IconArrowRight, IconPhotoPlus, IconX } from '@tabler/icons-react';
import { formatMegabytes } from '@nepally/shared';
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
  /** Shows "Move photo N left" / "Move photo N right" on every thumbnail. */
  reorderable?: boolean;
  /** Runs on each accepted file before it enters state, e.g. downscaling. */
  transformFile?: (file: File) => Promise<File>;
}

export function photoSrc(photo: UploaderPhoto): string {
  return photo.kind === 'stored' ? photo.url : photo.previewUrl;
}

function photoKey(photo: UploaderPhoto): string {
  return photo.kind === 'stored' ? `stored-${photo.url}` : `picked-${photo.id}`;
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
  reorderable,
  transformFile,
}: ImageUploaderProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const descriptionId = `${baseId}-description`;
  const messageId = `${baseId}-message`;
  const errorId = `${baseId}-error`;

  const [message, setMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // The latest value this component knows about. A transform runs between the
  // drop and the onChange, and the list can move underneath it — the member
  // removes a photo, or a second drop resolves first. Every change goes
  // through `commit`, which updates this synchronously, because an effect
  // would not have run yet when a second drop resolves in the same tick.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  function commit(next: UploaderPhoto[]) {
    photosRef.current = next;
    onChange(next);
  }

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

  // A one-slot uploader replaces rather than fills up, which is how create
  // event's old "Change Photo" button behaved. Without this, an event that
  // already has a photo offers no way to swap it but remove-then-add.
  const isSingle = max === 1;
  const isFull = photos.length >= max;
  const remaining = isSingle ? 1 : Math.max(0, max - photos.length);

  function capMessage(): string {
    return `You can add up to ${max} ${max === 1 ? 'photo' : 'photos'}.`;
  }

  async function handleDrop(files: File[]) {
    const accepted = files.slice(0, remaining);
    const overflow = files.length - accepted.length;

    if (accepted.length === 0) {
      setMessage(capMessage());
      return;
    }

    // A transform can fail on a file the browser accepted — an image it cannot
    // decode, say. Keep the rest and say how many were lost, rather than
    // dropping them silently the way marketplace/create used to.
    const prepared = await Promise.all(
      accepted.map(async (file) => {
        if (!transformFile) return file;
        try {
          return await transformFile(file);
        } catch {
          return null;
        }
      })
    );

    const transformed = prepared.filter((file): file is File => file !== null);
    const failed = prepared.length - transformed.length;

    // Size is checked here, not by the dropzone, whenever a transform runs:
    // the limit belongs to what gets uploaded, and a 5MB camera photo that
    // downscales to 400KB is perfectly acceptable.
    const usable = transformFile ? transformed.filter((file) => file.size <= maxBytes) : transformed;
    const tooLarge = transformed.length - usable.length;

    // Re-read the array, which may have moved on while the transform ran.
    const current = photosRef.current;
    const room = isSingle ? 1 : Math.max(0, max - current.length);
    const fitting = usable.slice(0, room);

    const notices: string[] = [];
    if (overflow > 0 || fitting.length < usable.length) notices.push(capMessage());
    if (failed > 0) {
      notices.push(`${failed} ${failed === 1 ? 'photo' : 'photos'} could not be processed.`);
    }
    if (tooLarge > 0) {
      notices.push(
        `${tooLarge} ${tooLarge === 1 ? 'file is' : 'files are'} too large. Each photo must be ${formatMegabytes(maxBytes)} or smaller.`
      );
    }
    setMessage(notices.length > 0 ? notices.join(' ') : null);

    if (fitting.length === 0) return;

    const picked: UploaderPhoto[] = fitting.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      createdUrlsRef.current.add(previewUrl);
      return { kind: 'picked', id: newPickedId(), previewUrl, file };
    });

    // Replacing a single slot drops whatever was there, so let go of its
    // preview URL. A stored photo has none to release.
    const replaced = isSingle ? current : [];
    for (const photo of replaced) {
      if (photo.kind === 'picked') {
        URL.revokeObjectURL(photo.previewUrl);
        createdUrlsRef.current.delete(photo.previewUrl);
      }
    }

    commit(isSingle ? picked : [...current, ...picked]);
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;

    const reordered = [...photos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setAnnouncement(`Photo ${index + 1} moved to position ${target + 1}`);
    commit(reordered);
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
    commit(photos.filter((_, position) => position !== index));
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
        // With a transform, the size limit applies to its output instead; see
        // handleDrop. Without one, the dropzone is the only size check.
        maxSize={transformFile ? undefined : maxBytes}
        disabled={disabled || (isFull && !isSingle)}
        // react-dropzone only drops its handlers when disabled; it leaves the
        // input focusable and activatable. Mark it disabled for real.
        inputProps={{
          'aria-label': isSingle && isFull ? `Replace ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`,
          disabled: disabled || (isFull && !isSingle),
        }}
        className={styles.dropzone}
      >
        <div className={styles.dropzoneInner}>
          <IconPhotoPlus size={20} aria-hidden="true" />
          <Text size="sm">
            {isSingle && isFull
              ? 'Drag a photo here to replace it, or click to choose'
              : isFull
                ? 'All slots used'
                : 'Drag photos here, or click to choose'}
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

              {reorderable && photos.length > 1 && (
                <div className={styles.moves}>
                  <ActionIcon
                    size="sm"
                    variant="filled"
                    color="dark"
                    aria-label={`Move photo ${index + 1} left`}
                    disabled={index === 0}
                    onClick={() => handleMove(index, -1)}
                  >
                    <IconArrowLeft size={14} aria-hidden="true" />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    variant="filled"
                    color="dark"
                    aria-label={`Move photo ${index + 1} right`}
                    disabled={index === photos.length - 1}
                    onClick={() => handleMove(index, 1)}
                  >
                    <IconArrowRight size={14} aria-hidden="true" />
                  </ActionIcon>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {announcement && <VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>}
    </div>
  );
}
