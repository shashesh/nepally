/**
 * Events domain constants — display labels, colors, and icons per event type.
 * Single source of truth for both mobile and web platforms.
 */
import type { EventType } from '../types/events';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  cultural: 'Cultural',
  religious: 'Religious',
  social: 'Social',
  career: 'Career',
  other: 'Other',
};

/** Color tokens per event type (from wireframe spec) */
export const EVENT_TYPE_COLORS: Record<EventType, { text: string; background: string }> = {
  cultural:  { text: '#E65100', background: '#FFF3E0' },
  religious: { text: '#6A1B9A', background: '#F3E5F5' },
  social:    { text: '#1B5E20', background: '#E8F5E9' },
  career:    { text: '#0D47A1', background: '#E3F2FD' },
  other:     { text: '#424242', background: '#F5F5F5' },
};

/** Emoji icon per event type */
export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  cultural:  '🎭',
  religious: '🕌',
  social:    '🎉',
  career:    '💼',
  other:     '📌',
};

/** All event types in display order (for filter chips) */
export const EVENT_TYPES: EventType[] = ['cultural', 'religious', 'social', 'career', 'other'];

/** Storage bucket for event photos */
export const EVENT_PHOTOS_BUCKET = 'event-photos';

/** Max event photo size: 2 MB */
export const MAX_EVENT_PHOTO_BYTES = 2 * 1024 * 1024;
