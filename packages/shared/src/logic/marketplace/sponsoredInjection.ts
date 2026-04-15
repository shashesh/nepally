import type { MarketplaceListing } from '../../types/marketplace';

/**
 * Sprinkle sponsored listings into an organic grid at a fixed cadence.
 *
 * - Pure. Deterministic for a given input triple.
 * - Skips sponsored items whose `id` already appears in the organic list
 *   (prevents double-render on screens where a listing is both trending and promoted).
 * - Cycles through sponsored items in order if the grid is long enough for multiple injections.
 * - Skips injection when there are fewer than `interval` organic items remaining after
 *   the current position, so sponsored items never bunch up at the end of a short grid.
 *
 * @throws if `interval` is less than 1.
 */
export function injectSponsoredIntoGrid(
  organic: MarketplaceListing[],
  sponsored: MarketplaceListing[],
  interval: number
): MarketplaceListing[] {
  if (interval < 1) {
    throw new Error(`injectSponsoredIntoGrid: interval must be >= 1 (got ${interval})`);
  }
  if (organic.length === 0) return [];
  if (sponsored.length === 0) return organic;

  const organicIds = new Set(organic.map((l) => l.id));
  const eligible = sponsored.filter((l) => !organicIds.has(l.id));
  if (eligible.length === 0) return organic;

  const result: MarketplaceListing[] = [];
  let sponsoredCursor = 0;

  for (let i = 0; i < organic.length; i++) {
    result.push(organic[i]);
    const organicPositionAfterThis = i + 1;
    const remainingOrganic = organic.length - organicPositionAfterThis;
    if (organicPositionAfterThis % interval === 0 && remainingOrganic >= interval) {
      result.push(eligible[sponsoredCursor % eligible.length]);
      sponsoredCursor++;
    }
  }

  return result;
}
