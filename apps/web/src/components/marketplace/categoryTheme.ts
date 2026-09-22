import { MARKETPLACE_CATEGORIES } from '@nepally/shared';

/** The categories that still exist, and so have `--category-<slug>` tokens. */
const THEMED_SLUGS = new Set(MARKETPLACE_CATEGORIES.map((category) => category.slug));

/**
 * Migration 016 consolidated twelve categories into five, but listings created
 * before it can still carry a retired slug. Anything unthemed reads as `other`,
 * so a stylesheet only needs the five that exist.
 */
export function themeSlug(slug: string | undefined): string {
  return slug && THEMED_SLUGS.has(slug) ? slug : 'other';
}
