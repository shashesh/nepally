/** A US-style price: optional `$`, optional thousands separators, optional cents. */
const NUMERIC_PRICE = /^\$?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/;

function formatDollars(value: number): string {
  const digits = Math.round(value * 100) % 100 === 0 ? 0 : 2;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * `price` is a free-text column. A value that looks like a US price ("80",
 * "80.50", "$1,200") reads as dollars; anything else ("Negotiable", "80 OBO")
 * is shown as typed.
 */
export function formatListingPrice(price: string | number | null | undefined): string | null {
  if (price === null || price === undefined) return null;

  if (typeof price === 'number') {
    return Number.isFinite(price) ? formatDollars(price) : null;
  }

  const trimmed = price.trim();
  if (trimmed === '') return null;
  if (!NUMERIC_PRICE.test(trimmed)) return trimmed;

  const parsed = Number(trimmed.replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? formatDollars(parsed) : trimmed;
}
