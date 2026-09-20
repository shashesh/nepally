import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ActionIcon, Modal, VisuallyHidden } from '@mantine/core';
import { IconMinus, IconPlus, IconX } from '@tabler/icons-react';
import styles from './ImageLightbox.module.css';

/** Zoom steps, as multipliers. The index into this array is the zoom level. */
export const LIGHTBOX_ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3, 4];

/** How long the controls stay on screen after the pointer stops moving. */
export const LIGHTBOX_CHROME_HIDE_DELAY_MS = 1500;

/** Double-clicking toggles between these two levels. */
const DOUBLE_CLICK_ZOOM_LEVEL = 3;

/** One class per zoom level: the scale lives in CSS, not an inline style. */
const ZOOM_CLASSES = [
  styles.zoom0,
  styles.zoom1,
  styles.zoom2,
  styles.zoom3,
  styles.zoom4,
  styles.zoom5,
  styles.zoom6,
];

export interface ImageLightboxProps {
  photos: string[];
  /** Photo to open on. */
  startIndex?: number;
  opened: boolean;
  onClose: () => void;
  /** Base alt text; each photo gets its position appended. */
  alt?: string;
}

/**
 * Full-screen photo viewer. Mantine's Modal owns the focus trap, Escape and
 * scroll lock; this component owns paging, zoom and the auto-hiding controls.
 */
export function ImageLightbox({ photos, startIndex = 0, opened, onClose, alt = 'Post photo' }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Each opening starts fresh. Adjusting state during render beats an effect,
  // which would paint the previous photo first.
  const [lastOpening, setLastOpening] = useState({ opened, startIndex });
  if (lastOpening.opened !== opened || lastOpening.startIndex !== startIndex) {
    setLastOpening({ opened, startIndex });
    setIndex(startIndex);
    setZoomLevel(0);
    setChromeVisible(true);
  }

  const hasMany = photos.length > 1;

  function step(delta: number) {
    if (!hasMany) return;
    setIndex((previous) => (previous + delta + photos.length) % photos.length);
  }

  function showChromeBriefly() {
    setChromeVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setChromeVisible(false), LIGHTBOX_CHROME_HIDE_DELAY_MS);
  }

  useEffect(() => {
    if (!opened) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') {
        showChromeBriefly();
        step(1);
      } else if (event.key === 'ArrowLeft') {
        showChromeBriefly();
        step(-1);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step and showChromeBriefly are stable for a given photo count
  }, [opened, photos.length]);

  function handleWheel(event: React.WheelEvent) {
    showChromeBriefly();
    setZoomLevel((previous) => {
      const next = event.deltaY < 0 ? previous + 1 : previous - 1;
      return Math.min(Math.max(next, 0), LIGHTBOX_ZOOM_LEVELS.length - 1);
    });
  }

  const chromeClass = `${styles.chrome} ${chromeVisible ? styles.chromeVisible : styles.chromeHidden}`;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      title="Photo viewer"
      classNames={{ body: styles.body, content: styles.content }}
    >
      <div
        className={styles.stage}
        onMouseMove={showChromeBriefly}
        onTouchStart={showChromeBriefly}
        role="presentation"
      >
        <ActionIcon
          variant="filled"
          color="dark"
          radius="xl"
          className={`${styles.close} ${chromeClass}`}
          onClick={onClose}
          aria-label="Close image viewer"
        >
          <IconX size={18} aria-hidden="true" />
        </ActionIcon>

        <Image
          src={photos[index]}
          alt={`${alt} ${index + 1}`}
          width={1600}
          height={1200}
          className={`${styles.image} ${ZOOM_CLASSES[zoomLevel]}`}
          onWheel={handleWheel}
          onDoubleClick={() => {
            showChromeBriefly();
            setZoomLevel((previous) => (previous === 0 ? DOUBLE_CLICK_ZOOM_LEVEL : 0));
          }}
        />

        <div className={`${styles.zoomControls} ${chromeClass}`}>
          <ActionIcon
            variant="filled"
            color="dark"
            radius="xl"
            onClick={() => setZoomLevel((previous) => Math.max(previous - 1, 0))}
            disabled={zoomLevel === 0}
            aria-label="Zoom out"
          >
            <IconMinus size={16} aria-hidden="true" />
          </ActionIcon>
          <span className={styles.zoomLabel}>{Math.round(LIGHTBOX_ZOOM_LEVELS[zoomLevel] * 100)}%</span>
          <ActionIcon
            variant="filled"
            color="dark"
            radius="xl"
            onClick={() => setZoomLevel((previous) => Math.min(previous + 1, LIGHTBOX_ZOOM_LEVELS.length - 1))}
            disabled={zoomLevel === LIGHTBOX_ZOOM_LEVELS.length - 1}
            aria-label="Zoom in"
          >
            <IconPlus size={16} aria-hidden="true" />
          </ActionIcon>
        </div>

        {hasMany && (
          <>
            <ActionIcon
              variant="filled"
              color="dark"
              radius="xl"
              className={`${styles.nav} ${styles.previous} ${chromeClass}`}
              onClick={() => step(-1)}
              aria-label="Previous photo"
            >
              &lsaquo;
            </ActionIcon>
            <ActionIcon
              variant="filled"
              color="dark"
              radius="xl"
              className={`${styles.nav} ${styles.next} ${chromeClass}`}
              onClick={() => step(1)}
              aria-label="Next photo"
            >
              &rsaquo;
            </ActionIcon>
            <span className={`${styles.counter} ${chromeClass}`} aria-hidden="true">
              {index + 1} / {photos.length}
            </span>
            <VisuallyHidden aria-live="polite">
              Photo {index + 1} of {photos.length}
            </VisuallyHidden>
          </>
        )}
      </div>
    </Modal>
  );
}
