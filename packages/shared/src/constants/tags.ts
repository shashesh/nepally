/**
 * Tag configuration and helpers
 *
 * Tags are loaded dynamically from the `tags` table at runtime.
 * This file provides default color/icon mappings as a fallback and
 * the emoji prefixes used in UI tag chips.
 */

/** Default tag color used when the DB tag has no color set */
export const DEFAULT_TAG_COLOR = '#757575';

/**
 * Tag emoji map — maps tag slugs to their display emoji.
 * Used in tag chips and filter pills.
 */
export const TAG_EMOJI: Record<string, string> = {
  housing: '🏠',
  jobs: '💼',
  help: '🤝',
  question: '❓',
  politics: '🏛',
  discussion: '💬',
  emergency: '⚠️',
};

/**
 * Default tag colors (fallback when tag.color is null)
 */
export const TAG_COLORS: Record<string, string> = {
  housing: '#4CAF50',
  jobs: '#2196F3',
  help: '#FF9800',
  question: '#9C27B0',
  politics: '#607D8B',
  discussion: '#00BCD4',
  emergency: '#F44336',
};

/**
 * Maximum number of tags allowed per post
 */
export const MAX_TAGS_PER_POST = 3;

/**
 * Maximum number of photos per post
 */
export const MAX_PHOTOS_PER_POST = 3;
