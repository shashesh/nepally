import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { VisuallyHidden } from '@mantine/core';
import styles from './PhotoCarousel.module.css';

/** A swipe shorter than this is a tap, not a gesture. */
const SWIPE_THRESHOLD_PX = 40;

export interface PhotoCarouselProps {
  photos: string[];
  /** Base alt text; each photo gets its position appended. */
  alt: string;
  /** Usually opens a lightbox at the photo on screen. */
  onPhotoClick?: (index: number) => void;
}

/**
 * One photo at a time, with wrap-around previous and next. The controls sit
 * beside the photo rather than inside it, so no control nests in another.
 */
export function PhotoCarousel({ photos, alt, onPhotoClick }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const hasMany = photos.length > 1;

  // A new set of photos starts at the first one. Adjusting state during render
  // beats an effect, which would first paint an index from the previous post —
  // or, with fewer photos this time, no photo at all.
  const photoKey = photos.join('|');
  const [lastPhotoKey, setLastPhotoKey] = useState(photoKey);
  if (lastPhotoKey !== photoKey) {
    setLastPhotoKey(photoKey);
    setIndex(0);
  }

  function step(delta: number) {
    if (!hasMany) return;
    setIndex((previous) => (previous + delta + photos.length) % photos.length);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null || !hasMany) return;

    const delta = (event.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    step(delta > 0 ? -1 : 1);
  }

  const photo = (
    <Image
      src={photos[index]}
      alt={`${alt} ${index + 1}`}
      fill
      sizes="(max-width: 900px) 100vw, 720px"
      className={styles.image}
    />
  );

  return (
    <div className={styles.root}>
      <div className={styles.frame}>
        {onPhotoClick ? (
          <button
            type="button"
            className={styles.photoButton}
            aria-label={`Open ${alt} ${index + 1}`}
            onClick={() => onPhotoClick(index)}
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {photo}
          </button>
        ) : (
          <div className={styles.photoButton} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {photo}
          </div>
        )}

        {hasMany && (
          <>
            <span className={styles.counter} aria-hidden="true">
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              className={`${styles.nav} ${styles.previous}`}
              aria-label="Previous photo"
              onClick={() => step(-1)}
            >
              &lsaquo;
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.next}`}
              aria-label="Next photo"
              onClick={() => step(1)}
            >
              &rsaquo;
            </button>
          </>
        )}
      </div>

      {hasMany && (
        <VisuallyHidden aria-live="polite">
          Photo {index + 1} of {photos.length}
        </VisuallyHidden>
      )}
    </div>
  );
}
