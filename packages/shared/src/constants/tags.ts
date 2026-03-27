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
  discussion: '💬',
  emergency: '🚨',
};

/**
 * Default tag colors (fallback when tag.color is null)
 */
export const TAG_COLORS: Record<string, string> = {
  housing: '#4CAF50',
  jobs: '#2196F3',
  help: '#FF9800',
  question: '#9C27B0',
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

/**
 * Sidebar navigation tags — ordered list of the 6 system tags
 * for rendering sidebar category navigation in web/mobile.
 *
 * `emoji` — used by mobile (React Native) and fallback contexts.
 * `icon`  — Tabler icon name used by web (maps to @tabler/icons-react component).
 */
export const SIDEBAR_TAGS: ReadonlyArray<{ slug: string; name: string; emoji: string; icon: string }> = [
  { slug: 'housing', name: 'Housing', emoji: '🏠', icon: 'home' },
  { slug: 'jobs', name: 'Jobs', emoji: '💼', icon: 'briefcase' },
  { slug: 'help', name: 'Help', emoji: '🤝', icon: 'heart-handshake' },
  { slug: 'question', name: 'Question', emoji: '❓', icon: 'help-circle' },
  { slug: 'emergency', name: 'Emergency', emoji: '🚨', icon: 'alert-triangle' },
  { slug: 'discussion', name: 'Discussion', emoji: '💬', icon: 'message-circle' },
] as const;
