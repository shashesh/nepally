/**
 * Text formatting utilities
 */

/**
 * Pluralise a count with its noun: `pluralize(1, 'like')` → "1 like",
 * `pluralize(2, 'like')` → "2 likes". Pass an irregular plural explicitly,
 * e.g. `pluralize(2, 'person', 'people')` → "2 people".
 */
export function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
